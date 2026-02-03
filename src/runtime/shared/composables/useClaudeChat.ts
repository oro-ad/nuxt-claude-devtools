import { computed, ref } from 'vue'
import type { ComputedRef, Ref } from 'vue'
import type { Socket } from 'socket.io-client'
import { io } from 'socket.io-client'
import type { ContentBlock, Conversation, DocFile, Message, SlashCommand } from '../types'
import { SOCKET_PATH } from '../constants'

interface UseChatOptions {
  onDocsReceived?: (docs: DocFile[]) => void
  onCommandsReceived?: (commands: SlashCommand[]) => void
  log?: (...args: unknown[]) => void
  /** Custom socket URL (for tunnel support) */
  socketUrl?: string
  /** Current user ID for collaborative mode */
  getCurrentUserId?: () => string | null
}

/** Return type for useClaudeChat composable */
export interface UseChatReturn {
  // State
  socket: Ref<Socket | null>
  messages: Ref<Message[]>
  conversations: Ref<Conversation[]>
  activeConversationId: Ref<string | null>
  isConnected: Ref<boolean>
  isSessionActive: Ref<boolean>
  isProcessing: Ref<boolean>
  isHistoryOpen: Ref<boolean>
  statusText: ComputedRef<string>
  statusColor: ComputedRef<string>

  // Methods
  connectSocket: () => void
  disconnect: () => void
  newChat: () => void
  sendMessage: (content: string, senderId?: string, senderNickname?: string) => void
  stopGeneration: () => void
  addMessage: (role: Message['role'], content: string, streaming?: boolean) => Message
  toggleHistory: () => void
  selectConversation: (id: string) => void
  findToolResult: (blocks: ContentBlock[] | undefined, toolUseId: string) => ContentBlock | undefined
}

export function useClaudeChat(options: UseChatOptions = {}): UseChatReturn {
  const { log = () => {}, onDocsReceived, onCommandsReceived, socketUrl, getCurrentUserId } = options

  const socket = ref<Socket | null>(null)
  const messages = ref<Message[]>([])
  const conversations = ref<Conversation[]>([])
  const activeConversationId = ref<string | null>(null)
  const isConnected = ref(false)
  const isSessionActive = ref(false)
  const isProcessing = ref(false)
  const isHistoryOpen = ref(false)
  const pendingToolCalls = ref<Map<string, ContentBlock>>(new Map())

  const statusText = computed(() => {
    if (!isConnected.value) return 'Disconnected'
    if (isProcessing.value) return 'Processing...'
    return 'Ready'
  })

  const statusColor = computed(() => {
    if (!isConnected.value) return 'red'
    if (isProcessing.value) return 'blue'
    return 'green'
  })

  function generateId() {
    return Math.random().toString(36).substring(2, 9)
  }

  function addMessage(role: Message['role'], content: string, streaming = false): Message {
    const message: Message = {
      id: generateId(),
      role,
      content,
      timestamp: new Date(),
      streaming,
    }
    messages.value.push(message)
    return message
  }

  function getSocketUrl(): string {
    if (socketUrl) return socketUrl
    if (typeof window !== 'undefined') {
      return window.location.origin
    }
    return ''
  }

  function connectSocket() {
    const url = getSocketUrl()
    log('Connecting to socket at', url)

    socket.value = io(url, {
      path: SOCKET_PATH,
      transports: ['websocket', 'polling'],
      reconnection: true,
      reconnectionAttempts: 5,
    })

    socket.value.on('connect', () => {
      log('Connected to socket')
      isConnected.value = true
      socket.value?.emit('docs:list')
      socket.value?.emit('commands:list')
    })

    socket.value.on('disconnect', () => {
      log('Disconnected from socket')
      isConnected.value = false
      isSessionActive.value = false
      isProcessing.value = false
    })

    socket.value.on('session:status', (status: { active: boolean, processing: boolean }) => {
      log('Session status:', status)
      isSessionActive.value = status.active
      isProcessing.value = status.processing
    })

    // History events
    socket.value.on('history:loaded', (conversation: Conversation) => {
      log('History loaded:', conversation.id)
      activeConversationId.value = conversation.id
      messages.value = conversation.messages.map(m => ({
        ...m,
        timestamp: new Date(m.timestamp),
      }))
    })

    socket.value.on('history:list', (convs: Conversation[]) => {
      log('Conversations list:', convs.length)
      conversations.value = convs
    })

    socket.value.on('history:switched', (conversation: Conversation) => {
      log('Switched to conversation:', conversation.id)
      activeConversationId.value = conversation.id
      messages.value = conversation.messages.map(m => ({
        ...m,
        timestamp: new Date(m.timestamp),
      }))
      isHistoryOpen.value = false
    })

    // Docs/Commands events
    socket.value.on('docs:list', (files: DocFile[]) => {
      log('Docs list received:', files.length)
      onDocsReceived?.(files)
    })

    socket.value.on('commands:list', (cmds: SlashCommand[]) => {
      log('Commands list received:', cmds.length)
      onCommandsReceived?.(cmds)
    })

    // Stream events
    socket.value.on('stream:message_start', (data: { id: string }) => {
      log('Message start:', data.id)
      pendingToolCalls.value.clear()

      const lastMessage = messages.value[messages.value.length - 1]
      if (!lastMessage || lastMessage.role !== 'assistant' || !lastMessage.streaming) {
        addMessage('assistant', '', true)
      }

      const streamingMessage = messages.value.findLast(m => m.role === 'assistant' && m.streaming)
      if (streamingMessage && !streamingMessage.contentBlocks) {
        streamingMessage.contentBlocks = []
      }
    })

    socket.value.on('stream:tool_use', (data: { id: string, name: string, input: Record<string, unknown> }) => {
      log('Tool use:', data.name)
      const toolBlock: ContentBlock = {
        type: 'tool_use',
        id: data.id,
        name: data.name,
        input: data.input,
      }
      pendingToolCalls.value.set(data.id, toolBlock)

      const lastMessage = messages.value.findLast(m => m.role === 'assistant' && m.streaming)
        || messages.value.findLast(m => m.role === 'assistant')
      if (lastMessage) {
        if (!lastMessage.contentBlocks) {
          lastMessage.contentBlocks = []
        }
        lastMessage.contentBlocks.push(toolBlock)
      }
    })

    socket.value.on('stream:tool_result', (data: {
      tool_use_id: string
      content: string | unknown[]
      is_error?: boolean
    }) => {
      log('Tool result:', data.tool_use_id)
      const resultBlock: ContentBlock = {
        type: 'tool_result',
        tool_use_id: data.tool_use_id,
        content: data.content,
        is_error: data.is_error,
      }

      const lastMessage = messages.value.findLast(m => m.role === 'assistant' && m.streaming)
        || messages.value.findLast(m => m.role === 'assistant')
      if (lastMessage) {
        if (!lastMessage.contentBlocks) {
          lastMessage.contentBlocks = []
        }
        lastMessage.contentBlocks.push(resultBlock)
      }
    })

    socket.value.on('stream:text_delta', (data: { index: number, text: string }) => {
      const lastMessage = messages.value.findLast(m => m.role === 'assistant' && m.streaming)
      if (lastMessage) {
        lastMessage.content += data.text

        if (!lastMessage.contentBlocks) {
          lastMessage.contentBlocks = []
        }

        const lastBlock = lastMessage.contentBlocks[lastMessage.contentBlocks.length - 1]
        if (lastBlock && lastBlock.type === 'text') {
          lastBlock.text = (lastBlock.text || '') + data.text
        }
        else {
          const prefix = lastMessage.contentBlocks.length > 0 ? '\n' : ''
          lastMessage.contentBlocks.push({
            type: 'text',
            text: prefix + data.text,
          })
        }
      }
    })

    socket.value.on('stream:message_complete', (data: {
      id: string
      model: string
      content: string
      contentBlocks: ContentBlock[]
    }) => {
      log('Message complete:', data.id)
      const lastMessage = messages.value.findLast(m => m.role === 'assistant' && m.streaming)
        || messages.value.findLast(m => m.role === 'assistant')
      if (lastMessage) {
        lastMessage.streaming = false
        lastMessage.content = data.content
        lastMessage.contentBlocks = data.contentBlocks
        lastMessage.model = data.model
      }
      pendingToolCalls.value.clear()
    })

    socket.value.on('output:error', (error: string) => {
      log('Output error:', error)
      addMessage('system', `Error: ${error}`)
    })

    socket.value.on('session:error', (error: string) => {
      log('Session error:', error)
      addMessage('system', `Session error: ${error}`)
    })

    socket.value.on('stream:system_message', (data: { message: string }) => {
      log('System message:', data.message)
      addMessage('system', data.message)
    })

    socket.value.on('stream:stopped', (data: { message: string, partialContent?: string }) => {
      log('Generation stopped:', data.message)
      isProcessing.value = false

      // Mark the last streaming message as complete
      const lastMessage = messages.value.findLast(m => m.role === 'assistant' && m.streaming)
      if (lastMessage) {
        lastMessage.streaming = false
        if (data.partialContent) {
          lastMessage.content = data.partialContent + '\n\n*[Generation stopped by user]*'
        }
      }
    })

    // User message from another client (collaborative mode)
    socket.value.on('stream:user_message', (data: Message) => {
      const currentUserId = getCurrentUserId?.()
      log('User message received:', { senderId: data.senderId, currentUserId, isOwn: data.senderId === currentUserId })

      // Skip if this is our own message (we already added it locally)
      if (currentUserId && data.senderId === currentUserId) {
        return
      }

      // This is a message from another user, add it
      messages.value.push({
        ...data,
        timestamp: new Date(data.timestamp),
      })
      // Also add streaming assistant placeholder
      addMessage('assistant', '', true)
    })
  }

  function newChat() {
    if (socket.value) {
      socket.value.emit('session:reset')
      messages.value = []
      isHistoryOpen.value = false
    }
  }

  function sendMessage(content: string, senderId?: string, senderNickname?: string) {
    if (!content.trim() || isProcessing.value || !isConnected.value) return false

    const userMsg = addMessage('user', content)
    if (senderId) {
      userMsg.senderId = senderId
      userMsg.senderNickname = senderNickname
    }
    addMessage('assistant', '', true)

    if (socket.value) {
      socket.value.emit('message:send', senderId ? { message: content, senderId } : content)
    }

    return true
  }

  function stopGeneration() {
    if (!isProcessing.value || !isConnected.value) return false

    log('Stopping generation')
    if (socket.value) {
      socket.value.emit('message:stop')
    }

    return true
  }

  function toggleHistory() {
    isHistoryOpen.value = !isHistoryOpen.value
    if (isHistoryOpen.value && socket.value) {
      socket.value.emit('history:list')
    }
  }

  function selectConversation(id: string) {
    if (socket.value) {
      socket.value.emit('history:switch', id)
    }
  }

  function disconnect() {
    if (socket.value) {
      socket.value.disconnect()
    }
  }

  function findToolResult(blocks: ContentBlock[] | undefined, toolUseId: string): ContentBlock | undefined {
    if (!blocks) return undefined
    return blocks.find(b => b.type === 'tool_result' && b.tool_use_id === toolUseId)
  }

  return {
    // State
    socket,
    messages,
    conversations,
    activeConversationId,
    isConnected,
    isSessionActive,
    isProcessing,
    isHistoryOpen,
    statusText,
    statusColor,

    // Methods
    connectSocket,
    disconnect,
    newChat,
    sendMessage,
    stopGeneration,
    addMessage,
    toggleHistory,
    selectConversation,
    findToolResult,
  }
}
