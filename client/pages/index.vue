<script lang="ts" setup>
import { nextTick, onMounted, onUnmounted, ref } from 'vue'
import { onDevtoolsClientConnected, useDevtoolsClient } from '@nuxt/devtools-kit/iframe-client'
import { useTunnel } from '#imports'
import { useClaudeChat } from '~/composables/useClaudeChat'
import { useMessageContext } from '~/composables/useMessageContext'
import { useVoiceInput } from '~/composables/useVoiceInput'
import { useAutocomplete } from '~/composables/useAutocomplete'
import { useComponentPicker } from '~/composables/useComponentPicker'
import { useShare } from '~/composables/useShare'

const client = useDevtoolsClient()
const tunnel = useTunnel()
const { log } = useLogger('client')

// Refs
const messagesContainer = ref<HTMLElement | null>(null)
const textareaRef = ref<HTMLTextAreaElement | null>(null)
const inputMessage = ref('')
const showMoreMenu = ref(false)

// Composables
const {
  selectedComponents,
  toggleComponentPicker,
  removeComponent,
  clearAllComponents,
  setupInspectorHook,
} = useComponentPicker(client, log as (...args: unknown[]) => void)

const {
  contextChips,
  toggleContextChip,
  collectContext,
  generateContextBlock,
  parseMessageContext,
} = useMessageContext(client, selectedComponents)

const {
  docs,
  commands,
  showDocsAutocomplete,
  showCommandsAutocomplete,
  cursorPosition,
  checkDocsAutocomplete,
  checkCommandsAutocomplete,
  handleDocsSelect,
  handleCommandSelect,
  closeDocsAutocomplete,
  closeCommandsAutocomplete,
  setDocs,
  setCommands,
} = useAutocomplete(inputMessage, textareaRef)

const {
  isRecording,
  isSpeechSupported,
  initSpeechRecognition,
  toggleVoiceInput,
  stopRecording,
  cleanup: cleanupVoice,
} = useVoiceInput()

const {
  userId,
  nickname,
  users,
  showNicknameModal,
  isShareMode,
  initShare,
  copyShareLink,
  setNickname,
  needsNicknameImmediate,
  needsNicknameForMessage,
  needsNicknameForShare,
  checkSharingStatus,
  registerUser,
  setupSocketListeners: setupShareListeners,
  isOwnMessage,
  getNicknameById: _getNicknameById,
} = useShare({
  getTunnelUrl: () => ({ isActive: tunnel.isActive.value, origin: tunnel.origin.value }),
  getHostRoute: () => client.value?.host?.nuxt?.vueApp?.config?.globalProperties?.$route,
})

const shareLinkCopied = ref(false)
const nicknameError = ref('')
const pendingAction = ref<'share' | 'message' | null>(null) // Track what triggered nickname modal

const {
  socket,
  messages,
  conversations,
  activeConversationId,
  isConnected,
  isProcessing,
  isHistoryOpen,
  statusText,
  statusColor,
  connectSocket,
  disconnect,
  newChat,
  sendMessage: sendChatMessage,
  toggleHistory,
  selectConversation,
  deleteConversation,
  findToolResult,
} = useClaudeChat(
  () => ({ isActive: tunnel.isActive.value, origin: tunnel.origin.value }),
  {
    log: log as (...args: unknown[]) => void,
    onDocsReceived: setDocs,
    onCommandsReceived: setCommands,
  },
)

// Refs for autocomplete components
const docsAutocompleteRef = ref<{ handleKeydown: (e: KeyboardEvent) => boolean } | null>(null)
const commandsAutocompleteRef = ref<{ handleKeydown: (e: KeyboardEvent) => boolean } | null>(null)

// UI Helpers
function scrollToBottom() {
  nextTick(() => {
    if (messagesContainer.value) {
      messagesContainer.value.scrollTop = messagesContainer.value.scrollHeight
    }
  })
}

function formatTimestamp(timestamp: Date | string): string {
  const date = timestamp instanceof Date ? timestamp : new Date(timestamp)
  return date.toLocaleTimeString()
}

function adjustTextareaHeight() {
  const textarea = textareaRef.value
  if (textarea) {
    textarea.style.height = 'auto'
    textarea.style.height = Math.min(textarea.scrollHeight, 200) + 'px'
  }
}

// Input handlers
function handleInput() {
  adjustTextareaHeight()
  checkDocsAutocomplete()
  checkCommandsAutocomplete()
}

function handleKeydown(event: KeyboardEvent) {
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

function sendMessage() {
  if (!inputMessage.value.trim() || isProcessing.value || !isConnected.value) return

  // If sharing is active and user has no nickname, ask for it first
  if (needsNicknameForMessage()) {
    pendingAction.value = 'message'
    showNicknameModal.value = true
    return
  }

  stopRecording()

  const message = inputMessage.value.trim()
  inputMessage.value = ''

  if (textareaRef.value) {
    textareaRef.value.style.height = 'auto'
  }

  // Build message with context
  const context = collectContext()
  let fullMessage = message

  if (context) {
    const contextBlock = generateContextBlock(context)
    fullMessage = `${contextBlock}\n${message}`

    if (context.components && context.components.length > 0) {
      const componentRefs = context.components.map(c => `@${c}`).join(' ')
      fullMessage = `${contextBlock}\n${componentRefs}\n\n${message}`
    }
  }

  sendChatMessage(fullMessage, userId.value || undefined, nickname.value || undefined)
  scrollToBottom()

  // Clear selected components
  selectedComponents.value = []
}

async function handleShare() {
  // If no nickname yet, show modal first
  if (needsNicknameForShare()) {
    pendingAction.value = 'share'
    showNicknameModal.value = true
    return
  }

  const success = await copyShareLink()
  if (success) {
    shareLinkCopied.value = true
    setTimeout(() => {
      shareLinkCopied.value = false
    }, 2000)
  }
}

function handleNicknameSubmit(name: string) {
  setNickname(name)
  showNicknameModal.value = false
  nicknameError.value = ''

  // Register with server using existing socket
  registerUser(socket.value)

  // Handle pending action
  const action = pendingAction.value
  pendingAction.value = null

  if (action === 'share') {
    handleShare()
  }
  else if (action === 'message') {
    sendMessage()
  }
}

function handleNicknameCancel() {
  showNicknameModal.value = false
  nicknameError.value = ''
  pendingAction.value = null
}

function handleVoiceToggle() {
  toggleVoiceInput((transcript) => {
    inputMessage.value += transcript
    nextTick(adjustTextareaHeight)
  })
}

// Watch messages for scroll
watch(messages, () => {
  scrollToBottom()
}, { deep: true })

// Setup inspector hook
onDevtoolsClientConnected((devtoolsClient) => {
  setupInspectorHook(devtoolsClient)
})

onMounted(() => {
  // Initialize share mode from URL/localStorage
  initShare()

  connectSocket()
  initSpeechRecognition((transcript) => {
    inputMessage.value += transcript
    nextTick(adjustTextareaHeight)
  })

  // Setup share listeners when socket is ready
  watch(socket, (newSocket) => {
    if (newSocket) {
      setupShareListeners(newSocket)

      // Check if sharing is active on server (for message interception)
      checkSharingStatus(newSocket)

      // Register user if we have nickname and user ID
      if (userId.value && nickname.value) {
        registerUser(newSocket)
      }
      // Show nickname modal immediately only if invited via URL
      else if (needsNicknameImmediate()) {
        showNicknameModal.value = true
      }
    }
  }, { immediate: true })
})

onUnmounted(() => {
  disconnect()
  cleanupVoice()
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
          <NBadge
            v-if="isShareMode"
            n="purple"
            class="flex items-center gap-1"
          >
            <NIcon icon="carbon:collaborate" />
            {{ users.length }} online
          </NBadge>
        </div>
        <div class="flex items-center gap-2">
          <!-- Share button -->
          <NButton
            :disabled="!isConnected"
            :n="shareLinkCopied ? 'green' : 'purple'"
            :title="shareLinkCopied ? 'Link copied!' : 'Share collaborative link'"
            @click="handleShare"
          >
            <NIcon
              :icon="shareLinkCopied ? 'carbon:checkmark' : 'carbon:share'"
              class="mr-1"
            />
            {{ shareLinkCopied ? 'Copied!' : 'Share' }}
          </NButton>
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
              <div class="border-t border-neutral-200 dark:border-neutral-700 my-1" />
              <NuxtLink
                class="flex items-center gap-2 px-3 py-2 hover:n-bg-active transition-colors"
                to="/settings"
              >
                <NIcon
                  class="text-neutral-500"
                  icon="carbon:settings"
                />
                Settings
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

      <!-- Disconnected Overlay -->
      <div
        v-if="!isConnected"
        class="flex-1 flex items-center justify-center p-8"
      >
        <div class="text-center max-w-md">
          <div class="relative inline-block mb-6">
            <div class="w-24 h-24 rounded-full bg-gradient-to-br from-orange-500/20 to-red-500/20 flex items-center justify-center">
              <NIcon
                class="text-5xl text-orange-500 animate-pulse"
                icon="carbon:connection-signal-off"
              />
            </div>
            <div class="absolute -bottom-1 -right-1 w-8 h-8 rounded-full bg-red-500/20 flex items-center justify-center">
              <div class="w-3 h-3 rounded-full bg-red-500 animate-ping" />
            </div>
          </div>

          <h2 class="text-2xl font-bold mb-3 bg-gradient-to-r from-orange-400 to-red-400 bg-clip-text text-transparent">
            Connection Lost
          </h2>

          <p class="text-neutral-500 dark:text-neutral-400 mb-6 leading-relaxed">
            The connection to the server was interrupted. This usually happens when Nuxt restarts after config changes.
          </p>

          <div class="flex items-center justify-center gap-2 text-sm text-neutral-400 mb-6">
            <NIcon
              class="animate-spin"
              icon="carbon:renew"
            />
            <span>Attempting to reconnect...</span>
          </div>

          <div class="p-4 rounded-lg bg-neutral-100 dark:bg-neutral-800/50 text-left text-sm">
            <div class="flex items-start gap-2 text-neutral-500 dark:text-neutral-400">
              <NIcon
                class="mt-0.5 text-blue-500"
                icon="carbon:information"
              />
              <div>
                <p class="mb-2">
                  Your conversation history is preserved.
                </p>
                <p class="text-xs opacity-75">
                  Once reconnected, you can continue where you left off.
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- Messages -->
      <div
        v-if="isConnected"
        ref="messagesContainer"
        class="flex-1 overflow-auto p-4 space-y-4"
      >
        <div
          v-for="message in messages"
          :key="message.id"
          :class="{
            'justify-end': message.role === 'user' && isOwnMessage(message.senderId),
            'justify-start': message.role !== 'user' || !isOwnMessage(message.senderId),
          }"
          class="flex"
        >
          <div
            :class="{
              'bg-green-500/20 text-green-800 dark:text-green-100': message.role === 'user' && isOwnMessage(message.senderId),
              'bg-blue-500/20 text-blue-800 dark:text-blue-100': message.role === 'user' && !isOwnMessage(message.senderId),
              'n-bg-active': message.role === 'assistant',
              'bg-yellow-500/20 text-yellow-800 dark:text-yellow-200 text-sm': message.role === 'system',
            }"
            class="max-w-[85%] rounded-lg px-4 py-2"
          >
            <!-- User header (in share mode) -->
            <div
              v-if="message.role === 'user' && isShareMode && message.senderNickname"
              class="text-xs opacity-50 mb-1 flex items-center gap-1"
            >
              <NIcon icon="carbon:user" />
              {{ message.senderNickname }}
              <span
                v-if="isOwnMessage(message.senderId)"
                class="opacity-50"
              >(you)</span>
            </div>

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

            <!-- Content blocks -->
            <template v-if="message.contentBlocks && message.contentBlocks.length > 0">
              <template
                v-for="(block, idx) in message.contentBlocks"
                :key="idx"
              >
                <MarkdownContent
                  v-if="block.type === 'text' && block.text"
                  :content="block.text"
                />
                <ToolCallBlock
                  v-else-if="block.type === 'tool_use'"
                  :tool-result="findToolResult(message.contentBlocks, block.id!) as any"
                  :tool-use="block as any"
                />
                <ThinkingBlock
                  v-else-if="block.type === 'thinking' && block.thinking"
                  :thinking="block.thinking"
                />
              </template>
              <MarkdownContent
                v-if="message.content && !message.contentBlocks.some(b => b.type === 'text')"
                :content="message.content"
              />
            </template>

            <!-- Fallback content -->
            <template v-else>
              <MarkdownContent
                v-if="message.role === 'assistant' && message.content"
                :content="message.content"
              />
              <template v-else-if="message.role === 'user' && message.content">
                <MessageContext
                  v-if="parseMessageContext(message.content).context"
                  :context="parseMessageContext(message.content).context!"
                />
                <div class="whitespace-pre-wrap font-mono text-sm">
                  {{ parseMessageContext(message.content).body }}
                </div>
              </template>
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
      <div
        v-if="isConnected"
        class="p-4"
      >
        <ComponentContext
          :components="selectedComponents"
          @remove="removeComponent"
          @clear-all="clearAllComponents"
          @toggle-picker="toggleComponentPicker"
        />

        <div class="flex items-center justify-between gap-2 mb-2">
          <div class="flex items-center gap-2">
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
              Add Component
            </NButton>
          </div>
          <ContextChips
            :chips="contextChips"
            @toggle="toggleContextChip"
          />
        </div>

        <div class="flex gap-2 items-center">
          <div class="flex-1 relative">
            <DocsAutocomplete
              ref="docsAutocompleteRef"
              :cursor-position="cursorPosition"
              :docs="docs"
              :input-value="inputMessage"
              :visible="showDocsAutocomplete"
              @close="closeDocsAutocomplete"
              @select="handleDocsSelect"
            />
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
            @click="handleVoiceToggle"
          >
            <NIcon :icon="isRecording ? 'carbon:stop-filled' : 'carbon:microphone'" />
          </NButton>
        </div>
        <div class="text-xs opacity-50 mt-2 flex items-center gap-3">
          <span>Enter to send | Shift+Enter for new line{{ isSpeechSupported ? ' | Click mic for voice input' : '' }}</span>
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

    <!-- Nickname Modal -->
    <NicknameModal
      :error="nicknameError"
      :visible="showNicknameModal"
      @cancel="handleNicknameCancel"
      @submit="handleNicknameSubmit"
    />
  </div>
</template>
