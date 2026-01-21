<script lang="ts" setup>
import { computed, nextTick, onMounted, onUnmounted, ref } from 'vue'
import type { Socket } from 'socket.io-client'
import { io } from 'socket.io-client'
import { onDevtoolsClientConnected, useDevtoolsClient } from '@nuxt/devtools-kit/iframe-client'
import { useTunnel } from '#imports'
import type { SelectedComponent } from '~/components/ComponentContext.vue'

const client = useDevtoolsClient()
const tunnel = useTunnel()

// Component picker state
const selectedComponents = ref<SelectedComponent[]>([])

// Types
interface ContentBlock {
  type: 'text' | 'tool_use' | 'tool_result' | 'thinking'
  text?: string
  thinking?: string
  id?: string
  name?: string
  input?: Record<string, unknown>
  tool_use_id?: string
  content?: string | unknown[]
  is_error?: boolean
}

interface Message {
  id: string
  role: 'user' | 'assistant' | 'system'
  content: string
  contentBlocks?: ContentBlock[]
  timestamp: Date | string
  streaming?: boolean
  model?: string
}

interface Conversation {
  id: string
  title?: string
  messages: Message[]
  createdAt: string
  updatedAt: string
  projectPath: string
}

interface DocFile {
  path: string
  name: string
}

interface SlashCommand {
  name: string
  description?: string
}

// State
const socket = ref<Socket | null>(null)
const messages = ref<Message[]>([])
const conversations = ref<Conversation[]>([])
const activeConversationId = ref<string | null>(null)
const inputMessage = ref('')
const isConnected = ref(false)
const isSessionActive = ref(false)
const isProcessing = ref(false)
const messagesContainer = ref<HTMLElement | null>(null)
const textareaRef = ref<HTMLTextAreaElement | null>(null)
const isHistoryOpen = ref(false)

// Voice input state
const isRecording = ref(false)
const speechRecognition = ref<SpeechRecognition | null>(null)
const isSpeechSupported = ref(false)

// Docs autocomplete state
const docs = ref<DocFile[]>([])
const showDocsAutocomplete = ref(false)
const cursorPosition = ref(0)
const docsAutocompleteRef = ref<{ handleKeydown: (e: KeyboardEvent) => boolean } | null>(null)

// Commands autocomplete state
const commands = ref<SlashCommand[]>([])
const showCommandsAutocomplete = ref(false)
const commandsAutocompleteRef = ref<{ handleKeydown: (e: KeyboardEvent) => boolean } | null>(null)

// More menu state
const showMoreMenu = ref(false)

// Current streaming state
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

function scrollToBottom() {
  nextTick(() => {
    if (messagesContainer.value) {
      messagesContainer.value.scrollTop = messagesContainer.value.scrollHeight
    }
  })
}

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
  scrollToBottom()
  return message
}

function formatTimestamp(timestamp: Date | string): string {
  const date = timestamp instanceof Date ? timestamp : new Date(timestamp)
  return date.toLocaleTimeString()
}

function findToolResult(blocks: ContentBlock[] | undefined, toolUseId: string): ContentBlock | undefined {
  if (!blocks) return undefined
  return blocks.find(
    b => b.type === 'tool_result' && b.tool_use_id === toolUseId,
  )
}

function getSocketUrl(): string {
  if (tunnel.isActive.value && tunnel.origin.value) {
    return tunnel.origin.value
  }
  return window.location.origin
}

function connectSocket() {
  const url = getSocketUrl()
  console.log('[claude-client] Connecting to socket at', url, 'tunnel active:', tunnel.isActive.value)

  socket.value = io(url, {
    path: '/__claude_devtools_socket',
    transports: ['websocket', 'polling'],
    reconnection: true,
    reconnectionAttempts: 5,
  })

  socket.value.on('connect', () => {
    console.log('[claude-client] Connected to socket')
    isConnected.value = true
    // Request docs and commands lists for autocomplete
    socket.value?.emit('docs:list')
    socket.value?.emit('commands:list')
  })

  socket.value.on('disconnect', () => {
    console.log('[claude-client] Disconnected from socket')
    isConnected.value = false
    isSessionActive.value = false
    isProcessing.value = false
    addMessage('system', 'Disconnected from server')
  })

  socket.value.on('session:status', (status: { active: boolean, processing: boolean }) => {
    console.log('[claude-client] Session status:', status)
    isSessionActive.value = status.active
    isProcessing.value = status.processing
  })

  // History events
  socket.value.on('history:loaded', (conversation: Conversation) => {
    console.log('[claude-client] History loaded:', conversation.id, conversation.messages.length, 'messages')
    activeConversationId.value = conversation.id
    messages.value = conversation.messages.map(m => ({
      ...m,
      timestamp: new Date(m.timestamp),
    }))
    scrollToBottom()
  })

  socket.value.on('history:list', (convs: Conversation[]) => {
    console.log('[claude-client] Conversations list:', convs.length)
    conversations.value = convs
  })

  socket.value.on('history:switched', (conversation: Conversation) => {
    console.log('[claude-client] Switched to conversation:', conversation.id)
    activeConversationId.value = conversation.id
    messages.value = conversation.messages.map(m => ({
      ...m,
      timestamp: new Date(m.timestamp),
    }))
    isHistoryOpen.value = false
    scrollToBottom()
  })

  socket.value.on('history:deleted', (data: { id: string, success: boolean }) => {
    console.log('[claude-client] Conversation deleted:', data)
  })

  // Docs events
  socket.value.on('docs:list', (files: DocFile[]) => {
    console.log('[claude-client] Docs list received:', files.length)
    docs.value = files
  })

  // Commands events
  socket.value.on('commands:list', (cmds: SlashCommand[]) => {
    console.log('[claude-client] Commands list received:', cmds.length)
    commands.value = cmds
  })

  // Stream events
  socket.value.on('stream:message_start', (data: { id: string }) => {
    console.log('[claude-client] Message start:', data.id)
    pendingToolCalls.value.clear()
  })

  socket.value.on('stream:tool_use', (data: { id: string, name: string, input: Record<string, unknown> }) => {
    console.log('[claude-client] Tool use:', data.name)
    const toolBlock: ContentBlock = {
      type: 'tool_use',
      id: data.id,
      name: data.name,
      input: data.input,
    }
    pendingToolCalls.value.set(data.id, toolBlock)

    // Add to last assistant message's content blocks
    const lastMessage = messages.value.findLast(m => m.role === 'assistant')
    if (lastMessage) {
      if (!lastMessage.contentBlocks) {
        lastMessage.contentBlocks = []
      }
      lastMessage.contentBlocks.push(toolBlock)
      scrollToBottom()
    }
  })

  socket.value.on('stream:tool_result', (data: {
    tool_use_id: string
    name?: string
    content: string | unknown[]
    is_error?: boolean
  }) => {
    console.log('[claude-client] Tool result:', data.tool_use_id, data.is_error ? 'ERROR' : 'OK')
    const resultBlock: ContentBlock = {
      type: 'tool_result',
      tool_use_id: data.tool_use_id,
      content: data.content,
      is_error: data.is_error,
    }

    // Add to last assistant message's content blocks
    const lastMessage = messages.value.findLast(m => m.role === 'assistant')
    if (lastMessage) {
      if (!lastMessage.contentBlocks) {
        lastMessage.contentBlocks = []
      }
      lastMessage.contentBlocks.push(resultBlock)
      scrollToBottom()
    }
  })

  socket.value.on('stream:text_delta', (data: { index: number, text: string }) => {
    // Update text in the UI
    const lastMessage = messages.value.findLast(m => m.role === 'assistant')
    if (lastMessage && lastMessage.streaming) {
      lastMessage.content += data.text
      scrollToBottom()
    }
  })

  socket.value.on('stream:message_complete', (data: {
    id: string
    model: string
    content: string
    contentBlocks: ContentBlock[]
  }) => {
    console.log('[claude-client] Message complete:', data.id)
    const lastMessage = messages.value.findLast(m => m.role === 'assistant')
    if (lastMessage) {
      lastMessage.streaming = false
      lastMessage.content = data.content
      lastMessage.contentBlocks = data.contentBlocks
      lastMessage.model = data.model
    }
    pendingToolCalls.value.clear()
  })

  socket.value.on('stream:result', (data: { subtype: string, cost_usd?: number, duration_ms?: number }) => {
    console.log('[claude-client] Result:', data.subtype, 'cost:', data.cost_usd, 'duration:', data.duration_ms)
  })

  // Legacy events (backward compatibility)
  socket.value.on('output:chunk', (chunk: string) => {
    console.log('[claude-client] Output chunk:', chunk.length)
    const lastMessage = messages.value.findLast(m => m.role === 'assistant')
    if (lastMessage && lastMessage.streaming) {
      // Text delta already handled by stream:text_delta, but keep for backward compat
      // Only update if not already updated
    }
    else {
      addMessage('assistant', chunk, true)
    }
  })

  socket.value.on('output:complete', () => {
    console.log('[claude-client] Output complete')
    const lastMessage = messages.value.findLast(m => m.role === 'assistant')
    if (lastMessage) {
      lastMessage.streaming = false
    }
  })

  socket.value.on('output:error', (error: string) => {
    console.log('[claude-client] Output error:', error)
    addMessage('system', `Error: ${error}`)
  })

  socket.value.on('session:error', (error: string) => {
    console.log('[claude-client] Session error:', error)
    addMessage('system', `Session error: ${error}`)
  })

  socket.value.on('session:closed', (data: { exitCode: number }) => {
    console.log('[claude-client] Session closed:', data)
    addMessage('system', `Session ended (exit code: ${data.exitCode})`)
  })
}

function newChat() {
  if (socket.value) {
    socket.value.emit('session:reset')
    messages.value = []
    isHistoryOpen.value = false
  }
}

function sendMessage() {
  if (!inputMessage.value.trim() || isProcessing.value || !isConnected.value) return

  // Stop recording if active
  if (isRecording.value && speechRecognition.value) {
    speechRecognition.value.stop()
    isRecording.value = false
  }

  let message = inputMessage.value.trim()
  inputMessage.value = ''

  // Reset textarea height
  if (textareaRef.value) {
    textareaRef.value.style.height = 'auto'
  }

  // Add component context to message if any
  if (selectedComponents.value.length > 0) {
    const componentContext = selectedComponents.value
      .map(c => `@${c.filePath}`)
      .join(' ')
    message = `${componentContext}\n\n${message}`
  }

  addMessage('user', message)

  // Add placeholder for assistant response
  addMessage('assistant', '', true)

  if (socket.value) {
    socket.value.emit('message:send', message)
  }
}

function handleKeydown(event: KeyboardEvent) {
  // Let autocomplete handle navigation keys first
  if (showDocsAutocomplete.value && docsAutocompleteRef.value) {
    const handled = docsAutocompleteRef.value.handleKeydown(event)
    if (handled) return
  }

  if (showCommandsAutocomplete.value && commandsAutocompleteRef.value) {
    const handled = commandsAutocompleteRef.value.handleKeydown(event)
    if (handled) return
  }

  if (event.key === 'Enter' && !event.shiftKey) {
    event.preventDefault()
    sendMessage()
  }
}

// Handle input changes for autocomplete
function handleInput() {
  adjustTextareaHeight()
  checkDocsAutocomplete()
  checkCommandsAutocomplete()
}

function checkDocsAutocomplete() {
  const textarea = textareaRef.value
  if (!textarea) return

  cursorPosition.value = textarea.selectionStart || 0
  const textBeforeCursor = inputMessage.value.slice(0, cursorPosition.value)

  // Check if we're typing @docs/
  const match = textBeforeCursor.match(/@docs\/\S*$/)
  showDocsAutocomplete.value = !!match

  // Close commands autocomplete if docs is open
  if (showDocsAutocomplete.value) {
    showCommandsAutocomplete.value = false
  }
}

function checkCommandsAutocomplete() {
  const textarea = textareaRef.value
  if (!textarea) return

  // Don't show if docs autocomplete is open
  if (showDocsAutocomplete.value) return

  cursorPosition.value = textarea.selectionStart || 0
  const textBeforeCursor = inputMessage.value.slice(0, cursorPosition.value)

  // Check if we're typing / at start or after whitespace
  const match = textBeforeCursor.match(/(?:^|\s)\/\S*$/)
  showCommandsAutocomplete.value = !!match
}

function handleDocsSelect(docPath: string) {
  const textarea = textareaRef.value
  if (!textarea) return

  const textBeforeCursor = inputMessage.value.slice(0, cursorPosition.value)
  const textAfterCursor = inputMessage.value.slice(cursorPosition.value)

  // Find where @docs/ starts
  const match = textBeforeCursor.match(/@docs\/\S*$/)
  if (match) {
    const startIndex = textBeforeCursor.lastIndexOf('@docs/')
    const newText = textBeforeCursor.slice(0, startIndex) + `@docs/${docPath}` + textAfterCursor
    inputMessage.value = newText

    // Move cursor after inserted text
    nextTick(() => {
      const newCursorPos = startIndex + `@docs/${docPath}`.length
      textarea.setSelectionRange(newCursorPos, newCursorPos)
      textarea.focus()
    })
  }

  showDocsAutocomplete.value = false
}

function handleCommandSelect(commandName: string) {
  const textarea = textareaRef.value
  if (!textarea) return

  const textBeforeCursor = inputMessage.value.slice(0, cursorPosition.value)
  const textAfterCursor = inputMessage.value.slice(cursorPosition.value)

  // Find where / starts (at beginning or after whitespace)
  const match = textBeforeCursor.match(/(?:^|\s)(\/\S*)$/)
  if (match) {
    const slashIndex = textBeforeCursor.length - match[1].length
    const newText = textBeforeCursor.slice(0, slashIndex) + `/${commandName} ` + textAfterCursor
    inputMessage.value = newText

    // Move cursor after inserted text
    nextTick(() => {
      const newCursorPos = slashIndex + `/${commandName} `.length
      textarea.setSelectionRange(newCursorPos, newCursorPos)
      textarea.focus()
    })
  }

  showCommandsAutocomplete.value = false
}

function closeDocsAutocomplete() {
  showDocsAutocomplete.value = false
}

function closeCommandsAutocomplete() {
  showCommandsAutocomplete.value = false
}

// Auto-resize textarea
function adjustTextareaHeight() {
  const textarea = textareaRef.value
  if (textarea) {
    textarea.style.height = 'auto'
    textarea.style.height = Math.min(textarea.scrollHeight, 200) + 'px'
  }
}

// Voice input functions
function initSpeechRecognition() {
  const SpeechRecognitionAPI = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition
  if (!SpeechRecognitionAPI) {
    isSpeechSupported.value = false
    return
  }

  isSpeechSupported.value = true
  const recognition = new SpeechRecognitionAPI()
  recognition.continuous = true
  recognition.interimResults = true
  recognition.lang = 'ru-RU' // Default to Russian, will auto-detect

  recognition.onresult = (event: SpeechRecognitionEvent) => {
    let finalTranscript = ''

    for (let i = event.resultIndex; i < event.results.length; i++) {
      const transcript = event.results[i][0].transcript
      if (event.results[i].isFinal) {
        finalTranscript += transcript
      }
    }

    if (finalTranscript) {
      inputMessage.value += finalTranscript
      nextTick(adjustTextareaHeight)
    }
  }

  recognition.onerror = (event: SpeechRecognitionErrorEvent) => {
    console.error('Speech recognition error:', event.error)
    isRecording.value = false
  }

  recognition.onend = () => {
    isRecording.value = false
  }

  speechRecognition.value = recognition
}

function toggleVoiceInput() {
  if (!speechRecognition.value) {
    initSpeechRecognition()
  }

  if (!speechRecognition.value) {
    alert('Speech recognition is not supported in this browser. Try Chrome or Edge.')
    return
  }

  if (isRecording.value) {
    speechRecognition.value.stop()
    isRecording.value = false
  }
  else {
    speechRecognition.value.start()
    isRecording.value = true
  }
}

function toggleHistory() {
  isHistoryOpen.value = !isHistoryOpen.value
  if (isHistoryOpen.value && socket.value) {
    socket.value.emit('history:list')
  }
}

// Component picker functions
function toggleComponentPicker() {
  if (!client.value?.host?.inspector) {
    console.warn('[claude-client] Inspector not available')
    return
  }

  client.value.host.inspector.toggle()
}

function handleComponentSelected(filePath: string) {
  console.log('[claude-client] Component selected:', filePath)

  // Don't add duplicates
  if (selectedComponents.value.some(c => c.filePath === filePath)) {
    return
  }

  // Extract component name from path
  const parts = filePath.split('/')
  const fileName = parts[parts.length - 1]
  const name = fileName.replace('.vue', '')

  selectedComponents.value.push({
    filePath,
    name,
    timestamp: Date.now(),
  })
}

function removeComponent(filePath: string) {
  selectedComponents.value = selectedComponents.value.filter(c => c.filePath !== filePath)
}

function clearAllComponents() {
  selectedComponents.value = []
}

// Check if Claude tab is currently active
function isClaudeTabActive(): boolean {
  // Check if our iframe is visible and focused
  // The route in devtools URL should contain our module name
  const currentPath = window.location.pathname
  return currentPath.includes('__claude-devtools')
}

// Setup inspector hooks when devtools connects
onDevtoolsClientConnected((devtoolsClient) => {
  console.log('[claude-client] DevTools client connected')

  // Monkey-patch callHook to intercept host:inspector:click
  const hooks = devtoolsClient.host.hooks as { callHook: (name: string, ...args: unknown[]) => Promise<unknown> }
  const originalCallHook = hooks.callHook.bind(hooks)

  hooks.callHook = async (name: string, ...args: unknown[]) => {
    // Intercept inspector click only when Claude tab is active
    if (name === 'host:inspector:click' && args[0] && isClaudeTabActive()) {
      const filePath = args[0] as string
      console.log('[claude-client] Intercepted callHook:', name, filePath)

      // Add component to context
      handleComponentSelected(filePath)
      devtoolsClient.host.inspector?.disable()

      // Don't call original - prevents editor from opening
      return
    }

    // Call original for all other hooks (or when not on Claude tab)
    return originalCallHook(name, ...args)
  }

  console.log('[claude-client] Monkey-patched hooks.callHook')
})

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

onMounted(() => {
  connectSocket()
  initSpeechRecognition()
})

onUnmounted(() => {
  if (socket.value) {
    socket.value.disconnect()
  }
  if (speechRecognition.value && isRecording.value) {
    speechRecognition.value.stop()
  }
})
</script>

<template>
  <div class="relative flex flex-col h-screen n-bg-base overflow-hidden">
    <!-- History Sidebar -->
    <HistorySidebar
      :active-id="activeConversationId"
      :conversations="conversations"
      :is-open="isHistoryOpen"
      @close="isHistoryOpen = false"
      @delete="deleteConversation"
      @new="newChat"
      @select="selectConversation"
    />

    <!-- Main Content -->
    <div class="flex flex-col h-full">
      <!-- Header -->
      <div class="flex items-center justify-between p-4">
        <div class="flex items-center gap-3">
          <NButton
            n="gray"
            title="Chat History"
            @click="toggleHistory"
          >
            <NIcon icon="carbon:recently-viewed" />
          </NButton>
          <h1 class="text-xl font-bold flex items-center gap-2">
            <NIcon
              class="text-green"
              icon="carbon:machine-learning-model"
            />
            Claude AI
          </h1>
          <NBadge :n="statusColor">
            {{ statusText }}
          </NBadge>
        </div>
        <div class="flex items-center gap-2">
          <NButton
            :disabled="!isConnected || isProcessing"
            n="blue"
            @click="newChat"
          >
            <NIcon
              class="mr-1"
              icon="carbon:add"
            />
            New Chat
          </NButton>
          <NuxtLink to="/docs">
            <NButton n="gray">
              <NIcon
                class="mr-1"
                icon="carbon:document"
              />
              Docs
            </NButton>
          </NuxtLink>
          <div class="relative">
            <NButton
              n="gray"
              @click="showMoreMenu = !showMoreMenu"
            >
              <NIcon
                class="mr-1"
                icon="carbon:overflow-menu-horizontal"
              />
              More
              <NIcon
                :class="{ 'rotate-180': showMoreMenu }"
                class="ml-1 transition-transform"
                icon="carbon:chevron-down"
              />
            </NButton>
            <div
              v-if="showMoreMenu"
              class="absolute right-0 top-full mt-1 z-50 min-w-[160px] rounded-lg n-bg-base border border-neutral-200 dark:border-neutral-800 shadow-lg overflow-hidden"
              @click="showMoreMenu = false"
            >
              <NuxtLink
                class="flex items-center gap-2 px-3 py-2 hover:n-bg-active transition-colors"
                to="/mcp"
              >
                <NIcon
                  class="text-blue-500"
                  icon="carbon:plug"
                />
                MCP Servers
              </NuxtLink>
              <NuxtLink
                class="flex items-center gap-2 px-3 py-2 hover:n-bg-active transition-colors"
                to="/commands"
              >
                <NIcon
                  class="text-green-500"
                  icon="carbon:terminal"
                />
                Commands
              </NuxtLink>
              <NuxtLink
                class="flex items-center gap-2 px-3 py-2 hover:n-bg-active transition-colors"
                to="/skills"
              >
                <NIcon
                  class="text-orange-500"
                  icon="carbon:lightning"
                />
                Skills
              </NuxtLink>
              <NuxtLink
                class="flex items-center gap-2 px-3 py-2 hover:n-bg-active transition-colors"
                to="/agents"
              >
                <NIcon
                  class="text-purple-500"
                  icon="carbon:bot"
                />
                Agents
              </NuxtLink>
            </div>
          </div>
        </div>
      </div>

      <!-- Connection Warning -->
      <div
        v-if="!client"
        class="px-4 pt-4"
      >
        <NTip n="yellow">
          Open this page inside Nuxt DevTools for best experience.
        </NTip>
      </div>

      <!-- Messages -->
      <div
        ref="messagesContainer"
        class="flex-1 overflow-auto p-4 space-y-4"
      >
        <div
          v-for="message in messages"
          :key="message.id"
          :class="message.role === 'user' ? 'justify-end' : 'justify-start'"
          class="flex"
        >
          <div
            :class="{
              'bg-green-500/20 text-green-800 dark:text-green-100': message.role === 'user',
              'n-bg-active': message.role === 'assistant',
              'bg-yellow-500/20 text-yellow-800 dark:text-yellow-200 text-sm': message.role === 'system',
            }"
            class="max-w-[85%] rounded-lg px-4 py-2"
          >
            <!-- Assistant header -->
            <div
              v-if="message.role === 'assistant'"
              class="text-xs opacity-50 mb-1"
            >
              Claude
              <span
                v-if="message.model"
                class="ml-1"
              >({{ message.model.split('-').slice(0, 2).join('-') }})</span>
              <span
                v-if="message.streaming"
                class="ml-2"
              >
                <NIcon
                  class="animate-pulse"
                  icon="carbon:circle-filled"
                />
              </span>
            </div>

            <!-- Content blocks (structured display) -->
            <template v-if="message.contentBlocks && message.contentBlocks.length > 0">
              <template
                v-for="(block, idx) in message.contentBlocks"
                :key="idx"
              >
                <!-- Text block with Markdown rendering -->
                <MarkdownContent
                  v-if="block.type === 'text' && block.text"
                  :content="block.text"
                />

                <!-- Tool use block -->
                <ToolCallBlock
                  v-else-if="block.type === 'tool_use'"
                  :tool-result="findToolResult(message.contentBlocks, block.id!) as any"
                  :tool-use="block as any"
                />

                <!-- Thinking block -->
                <ThinkingBlock
                  v-else-if="block.type === 'thinking' && block.thinking"
                  :thinking="block.thinking"
                />
              </template>

              <!-- Show plain content if no text blocks but has content -->
              <MarkdownContent
                v-if="message.content && !message.contentBlocks.some(b => b.type === 'text')"
                :content="message.content"
              />
            </template>

            <!-- Fallback: Markdown content for assistant, plain text for others -->
            <template v-else>
              <MarkdownContent
                v-if="message.role === 'assistant' && message.content"
                :content="message.content"
              />
              <div
                v-else-if="message.content"
                class="whitespace-pre-wrap font-mono text-sm"
              >
                {{ message.content }}
              </div>
              <span
                v-if="message.streaming && !message.content"
                class="opacity-50"
              >Thinking...</span>
            </template>

            <!-- Timestamp -->
            <div class="text-xs opacity-30 mt-1">
              {{ formatTimestamp(message.timestamp) }}
            </div>
          </div>
        </div>

        <!-- Empty state -->
        <div
          v-if="messages.length === 0"
          class="flex items-center justify-center h-full opacity-50"
        >
          <div class="text-center">
            <NIcon
              class="text-4xl mb-2"
              icon="carbon:chat"
            />
            <p>Send a message to start chatting with Claude</p>
          </div>
        </div>
      </div>

      <!-- Input -->
      <div class="p-4">
        <!-- Component Context Display -->
        <ComponentContext
          :components="selectedComponents"
          @remove="removeComponent"
          @clear-all="clearAllComponents"
          @toggle-picker="toggleComponentPicker"
        />

        <!-- Action buttons above input -->
        <div class="flex items-center gap-2 mb-2">
          <NButton
            v-if="client"
            :disabled="!isConnected"
            :n="'purple'"
            title="Select a component from the page to add as context"
            @click="toggleComponentPicker"
          >
            <NIcon
              class="mr-1"
              icon="carbon:touch-1"
            />
            {{ 'Add Component' }}
          </NButton>
        </div>

        <div class="flex gap-2 items-center">
          <div class="flex-1 relative">
            <!-- Docs Autocomplete -->
            <DocsAutocomplete
              ref="docsAutocompleteRef"
              :cursor-position="cursorPosition"
              :docs="docs"
              :input-value="inputMessage"
              :visible="showDocsAutocomplete"
              @close="closeDocsAutocomplete"
              @select="handleDocsSelect"
            />

            <!-- Commands Autocomplete -->
            <CommandsAutocomplete
              ref="commandsAutocompleteRef"
              :commands="commands"
              :cursor-position="cursorPosition"
              :input-value="inputMessage"
              :visible="showCommandsAutocomplete"
              @close="closeCommandsAutocomplete"
              @select="handleCommandSelect"
            />

            <textarea
              ref="textareaRef"
              v-model="inputMessage"
              :class="{ 'opacity-50': !isConnected || isProcessing }"
              :disabled="!isConnected || isProcessing"
              class="w-full px-3 py-2 n-bg-base border border-neutral-200 dark:border-neutral-800 rounded-lg font-mono text-sm resize-none focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              placeholder="Type your message... (Shift+Enter for new line)"
              rows="1"
              style="min-height: 42px; max-height: 200px;"
              @input="handleInput"
              @keydown="handleKeydown"
            />
            <div
              v-if="isRecording"
              class="absolute right-2 top-1/2 -translate-y-1/2 flex items-center gap-1 text-red-500"
            >
              <span class="w-2 h-2 bg-red-500 rounded-full animate-pulse" />
              <span class="text-xs">Recording...</span>
            </div>
          </div>
          <NButton
            v-if="isSpeechSupported"
            :disabled="!isConnected || isProcessing"
            :n="isRecording ? 'red' : 'gray'"
            :title="isRecording ? 'Stop recording' : 'Start voice input'"
            class="h-[42px] -mt-[6px]"
            @click="toggleVoiceInput"
          >
            <NIcon :icon="isRecording ? 'carbon:stop-filled' : 'carbon:microphone'" />
          </NButton>
        </div>
        <div class="text-xs opacity-50 mt-2 flex items-center gap-3">
          <span>Enter to send | Shift+Enter for new line{{
            isSpeechSupported ? ' | Click mic for voice input' : ''
          }}</span>
          <span
            v-if="commands.length > 0"
            class="text-green-500/70"
          >
            <NIcon
              class="mr-1"
              icon="carbon:terminal"
            />Type / for commands
          </span>
          <span
            v-if="docs.length > 0"
            class="text-blue-500/70"
          >
            <NIcon
              class="mr-1"
              icon="carbon:document"
            />@docs/ for docs
          </span>
        </div>
      </div>
    </div>
  </div>
</template>
