import { computed, ref } from 'vue'
import type { Socket } from 'socket.io-client'
import { io } from 'socket.io-client'
import type { ContentBlock, Conversation, DocFile, Message, SlashCommand } from './types'
import { SOCKET_PATH } from '../constants'

interface UseChatOptions {
  onDocsReceived?: (docs: DocFile[]) => void
  onCommandsReceived?: (commands: SlashCommand[]) => void
  log?: (...args: unknown[]) => void
  /** Current user ID for collaborative mode */
  getCurrentUserId?: () => string | null
}

export function useClaudeChat(
  getTunnelUrl: () => { isActive: boolean, origin: string | null },
  options: UseChatOptions = {},
) {
  const { log = console.log, onDocsReceived, onCommandsReceived, getCurrentUserId } = options

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
    const tunnel = getTunnelUrl()
    if (tunnel.isActive && tunnel.origin) {
      return tunnel.origin
    }
    return window.location.origin
  }

  function connectSocket() {
    const url = getSocketUrl()
    const tunnel = getTunnelUrl()
    log('Connecting to socket at', url, 'tunnel active:', tunnel.isActive)

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
      addMessage('system', 'Disconnected from server')
    })

    socket.value.on('session:status', (status: { active: boolean, processing: boolean }) => {
      log('Session status:', status)
      isSessionActive.value = status.active
      isProcessing.value = status.processing
    })

    // History events
    socket.value.on('history:loaded', (conversation: Conversation) => {
      log('History loaded:', conversation.id, conversation.messages.length, 'messages')
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

    socket.value.on('history:deleted', (data: { id: string, success: boolean }) => {
      log('Conversation deleted:', data)
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

      // Ensure we have a streaming assistant message
      const lastMessage = messages.value[messages.value.length - 1]
      if (!lastMessage || lastMessage.role !== 'assistant' || !lastMessage.streaming) {
        // Create new assistant message if not exists or previous is complete
        addMessage('assistant', '', true)
      }

      // Initialize contentBlocks for the streaming message
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

      // Find the current streaming assistant message
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
      name?: string
      content: string | unknown[]
      is_error?: boolean
    }) => {
      log('Tool result:', data.tool_use_id, data.is_error ? 'ERROR' : 'OK')
      const resultBlock: ContentBlock = {
        type: 'tool_result',
        tool_use_id: data.tool_use_id,
        content: data.content,
        is_error: data.is_error,
      }

      // Find the current streaming assistant message
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
      // Find the current streaming assistant message
      const lastMessage = messages.value.findLast(m => m.role === 'assistant' && m.streaming)
      if (lastMessage) {
        lastMessage.content += data.text

        // Also maintain text blocks in contentBlocks for proper rendering order
        if (!lastMessage.contentBlocks) {
          lastMessage.contentBlocks = []
        }

        // Find or create the last text block to append to
        const lastBlock = lastMessage.contentBlocks[lastMessage.contentBlocks.length - 1]
        if (lastBlock && lastBlock.type === 'text') {
          // Append to existing text block
          lastBlock.text = (lastBlock.text || '') + data.text
        }
        else {
          // Create new text block (after tool blocks or at start)
          // Add newline prefix if there are previous blocks (for visual separation)
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
      // Find the current streaming assistant message
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

    socket.value.on('stream:result', (data: { subtype: string, cost_usd?: number, duration_ms?: number }) => {
      log('Result:', data.subtype, 'cost:', data.cost_usd, 'duration:', data.duration_ms)
    })

    // Legacy events - only append to existing streaming message
    socket.value.on('output:chunk', (chunk: string) => {
      log('Output chunk:', chunk.length)
      const lastMessage = messages.value.findLast(m => m.role === 'assistant' && m.streaming)
      if (lastMessage) {
        lastMessage.content += chunk
      }
      // Don't create new messages from legacy events - let stream:message_start handle it
    })

    socket.value.on('output:complete', () => {
      log('Output complete')
      const lastMessage = messages.value.findLast(m => m.role === 'assistant')
      if (lastMessage) {
        lastMessage.streaming = false
      }
    })

    socket.value.on('output:error', (error: string) => {
      log('Output error:', error)
      addMessage('system', `Error: ${error}`)
    })

    socket.value.on('session:error', (error: string) => {
      log('Session error:', error)
      addMessage('system', `Session error: ${error}`)
    })

    socket.value.on('session:closed', (data: { exitCode: number }) => {
      log('Session closed:', data)
      addMessage('system', `Session ended (exit code: ${data.exitCode})`)
    })

    // Critical file warnings (before config changes that cause restart)
    socket.value.on('stream:critical_file_warning', (data: {
      tool_id: string
      file_name: string
      message: string
    }) => {
      log('Critical file warning:', data.file_name)
      addMessage('system', data.message)
    })

    // System messages (after config changes)
    socket.value.on('stream:system_message', (data: {
      type: string
      file_name?: string
      message: string
    }) => {
      log('System message:', data.type, data.message)
      addMessage('system', data.message)
    })

    // Generation stopped by user
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

    // User message from another user in collaborative mode
    socket.value.on('stream:user_message', (data: Message & { senderId?: string }) => {
      const currentUserId = getCurrentUserId?.()
      log('User message from:', data.senderId, 'current:', currentUserId, 'nickname:', data.senderNickname)

      // Skip if this is our own message (we already added it locally)
      if (currentUserId && data.senderId === currentUserId) {
        return
      }

      // Check if we already have this message (by id) - skip if duplicate
      const existingById = messages.value.find(m => m.id === data.id)
      if (existingById) {
        return
      }

      // This is from another user - add it
      // Insert before the streaming assistant message
      const assistantIndex = messages.value.findIndex(m => m.role === 'assistant' && m.streaming)
      const newMsg: Message = {
        ...data,
        timestamp: new Date(data.timestamp),
      }
      if (assistantIndex >= 0) {
        messages.value.splice(assistantIndex, 0, newMsg)
      }
      else {
        messages.value.push(newMsg)
        // Also add streaming assistant placeholder
        addMessage('assistant', '', true)
      }
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

    // Add user message locally (will be overwritten by server broadcast in share mode)
    const userMsg = addMessage('user', content)
    if (senderId) {
      userMsg.senderId = senderId
      userMsg.senderNickname = senderNickname
    }
    addMessage('assistant', '', true)

    if (socket.value) {
      // Send with sender info for collaborative mode
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

  function deleteConversation(id: string) {
    if (socket.value) {
      socket.value.emit('history:delete', id)
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
    deleteConversation,
    findToolResult,
  }
}
