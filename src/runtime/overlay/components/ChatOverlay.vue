<script setup lang="ts">
import { computed, nextTick, onMounted, onUnmounted, ref, watch } from 'vue'
import { useClaudeChat } from '../../shared/composables/useClaudeChat'
import { useVoiceInput } from '../../shared/composables/useVoiceInput'
import { useShare } from '../../shared/composables/useShare'
import type { Message, SlashCommand } from '../../shared/types'
import MarkdownContent from './MarkdownContent.vue'
import ToolCallBlock from './ToolCallBlock.vue'

const props = defineProps<{
  /** Custom socket URL (for tunnel) */
  socketUrl?: string
}>()

const isOpen = ref(false)
const inputMessage = ref('')
const messagesContainer = ref<HTMLElement | null>(null)
const textareaRef = ref<HTMLTextAreaElement | null>(null)
const panelRef = ref<HTMLElement | null>(null)
const headerRef = ref<HTMLElement | null>(null)
const fabRef = ref<HTMLElement | null>(null)

// FAB dragging
const FAB_STORAGE_KEY = 'claude-overlay-fab-position'
const fabPosition = ref<{ x: number, y: number } | null>(null)
const isDraggingFab = ref(false)
const fabDragStart = ref({ x: 0, y: 0, fabX: 0, fabY: 0 })
const fabDragMoved = ref(false)

function loadFabPosition() {
  try {
    const saved = localStorage.getItem(FAB_STORAGE_KEY)
    if (saved) {
      fabPosition.value = JSON.parse(saved)
    }
  }
  catch { /* ignore localStorage errors */ }
}

function saveFabPosition() {
  if (fabPosition.value) {
    try {
      localStorage.setItem(FAB_STORAGE_KEY, JSON.stringify(fabPosition.value))
    }
    catch { /* ignore localStorage errors */ }
  }
}

function getFabStyle() {
  if (!fabPosition.value) return {}
  return {
    left: `${fabPosition.value.x}px`,
    top: `${fabPosition.value.y}px`,
    right: 'auto',
    bottom: 'auto',
  }
}

function handleFabDragStart(e: MouseEvent | TouchEvent) {
  const clientX = 'touches' in e ? e.touches[0].clientX : e.clientX
  const clientY = 'touches' in e ? e.touches[0].clientY : e.clientY

  const fab = fabRef.value
  if (!fab) return

  const rect = fab.getBoundingClientRect()
  fabDragStart.value = {
    x: clientX,
    y: clientY,
    fabX: rect.left,
    fabY: rect.top,
  }
  isDraggingFab.value = true
  fabDragMoved.value = false

  // Add listeners
  window.addEventListener('mousemove', handleFabDragMove)
  window.addEventListener('mouseup', handleFabDragEnd)
  window.addEventListener('touchmove', handleFabDragMove, { passive: false })
  window.addEventListener('touchend', handleFabDragEnd)
}

function handleFabDragMove(e: MouseEvent | TouchEvent) {
  if (!isDraggingFab.value) return

  e.preventDefault()

  const clientX = 'touches' in e ? e.touches[0].clientX : e.clientX
  const clientY = 'touches' in e ? e.touches[0].clientY : e.clientY

  const deltaX = clientX - fabDragStart.value.x
  const deltaY = clientY - fabDragStart.value.y

  // Threshold to distinguish drag from click
  if (Math.abs(deltaX) > 5 || Math.abs(deltaY) > 5) {
    fabDragMoved.value = true
  }

  // Calculate new position with bounds
  const fabSize = 56
  const padding = 16
  let newX = fabDragStart.value.fabX + deltaX
  let newY = fabDragStart.value.fabY + deltaY

  // Constrain to viewport
  newX = Math.max(padding, Math.min(window.innerWidth - fabSize - padding, newX))
  newY = Math.max(padding, Math.min(window.innerHeight - fabSize - padding, newY))

  fabPosition.value = { x: newX, y: newY }
}

function handleFabDragEnd() {
  isDraggingFab.value = false
  window.removeEventListener('mousemove', handleFabDragMove)
  window.removeEventListener('mouseup', handleFabDragEnd)
  window.removeEventListener('touchmove', handleFabDragMove)
  window.removeEventListener('touchend', handleFabDragEnd)

  if (fabDragMoved.value) {
    saveFabPosition()
  }
}

function handleFabClick() {
  // Only toggle if not dragged
  if (!fabDragMoved.value) {
    toggleOverlay()
  }
}

// Swipe to close (mobile)
const touchStartY = ref(0)
const touchDeltaY = ref(0)
const isSwiping = ref(false)
const isSwipeClosing = ref(false) // Flag to skip Vue transition
const SWIPE_THRESHOLD = 100 // px to trigger close

function handleTouchStart(e: TouchEvent) {
  // Only handle on mobile
  if (window.innerWidth > 640) return

  touchStartY.value = e.touches[0].clientY
  touchDeltaY.value = 0
  isSwiping.value = true
}

function handleTouchMove(e: TouchEvent) {
  if (!isSwiping.value || window.innerWidth > 640) return

  const currentY = e.touches[0].clientY
  const delta = currentY - touchStartY.value

  // Only allow swiping down (positive delta)
  if (delta > 0) {
    // Prevent page scroll
    e.preventDefault()
    touchDeltaY.value = delta
    // Apply transform to panel
    if (panelRef.value) {
      panelRef.value.style.transform = `translateY(${delta}px)`
      panelRef.value.style.transition = 'none'
    }
  }
}

function handleTouchEnd() {
  if (!isSwiping.value || window.innerWidth > 640) return

  isSwiping.value = false

  if (panelRef.value) {
    panelRef.value.style.transition = 'transform 0.3s ease-out'

    if (touchDeltaY.value > SWIPE_THRESHOLD) {
      // Mark as swipe closing to skip Vue transition
      isSwipeClosing.value = true
      // Close the panel
      panelRef.value.style.transform = 'translateY(100%)'
      setTimeout(() => {
        isOpen.value = false
        lockBodyScroll(false)
        // Reset styles after close
        nextTick(() => {
          isSwipeClosing.value = false
          if (panelRef.value) {
            panelRef.value.style.transform = ''
            panelRef.value.style.transition = ''
          }
        })
      }, 300)
    }
    else {
      // Snap back
      panelRef.value.style.transform = 'translateY(0)'
      setTimeout(() => {
        if (panelRef.value) {
          panelRef.value.style.transition = ''
        }
      }, 300)
    }
  }

  touchDeltaY.value = 0
}

// Commands autocomplete
const commands = ref<SlashCommand[]>([])
const showCommandsAutocomplete = ref(false)

// History panel
const showHistory = ref(false)

// Context chips (all enabled by default in overlay)
const contextEnabled = ref({
  viewport: true,
  userAgent: true,
  routing: true,
})

// Sharing (initialized first for getCurrentUserId)
const {
  userId,
  nickname,
  users: _users,
  showNicknameModal,
  nicknameError,
  isShareMode,
  sharingActiveOnServer: _sharingActiveOnServer,
  initShare,
  setNickname,
  needsNicknameImmediate,
  needsNicknameForMessage,
  needsNicknameForShare,
  checkSharingStatus,
  registerUser,
  setupSocketListeners: setupShareListeners,
  isOwnMessage,
  copyShareLink,
} = useShare({
  getTunnelUrl: () => props.socketUrl || null,
  log: (...args) => {
    if (import.meta.env.DEV) {
      console.log('[ChatOverlay:Share]', ...args)
    }
  },
})

const {
  socket,
  messages,
  conversations,
  isConnected,
  isProcessing,
  statusText,
  statusColor,
  connectSocket,
  disconnect,
  sendMessage: sendChatMessage,
  newChat,
  toggleHistory,
  selectConversation,
  findToolResult,
} = useClaudeChat({
  socketUrl: props.socketUrl,
  getCurrentUserId: () => userId.value,
  onCommandsReceived: (cmds) => {
    commands.value = cmds
  },
  log: (...args) => {
    if (import.meta.env.DEV) {
      console.log('[ChatOverlay]', ...args)
    }
  },
})

// Voice input
const {
  isRecording,
  isSpeechSupported,
  toggleVoiceInput,
  cleanup: cleanupVoice,
} = useVoiceInput()

// Share UI state
const showShareCopied = ref(false)
const pendingNicknameAction = ref<'share' | 'message' | null>(null)
const nicknameInput = ref('')

const filteredCommands = computed(() => {
  if (!showCommandsAutocomplete.value) return []
  const match = inputMessage.value.match(/(?:^|\s)\/(\S*)$/)
  if (!match) return []
  const query = match[1].toLowerCase()
  return commands.value.filter(cmd =>
    cmd.name.toLowerCase().includes(query),
  ).slice(0, 5)
})

// Strip [context]...[/context] blocks from message content for display
function stripContextBlock(content: string): string {
  return content.replace(/^\[context\]\n[\s\S]*?\n\[\/context\]\n?/, '').trim()
}

// Get displayed messages with context stripped
function getDisplayContent(message: Message): string {
  return stripContextBlock(message.content)
}

// Collect context data (real viewport since we're not in iframe)
function collectContext(): string | null {
  const parts: string[] = []

  if (contextEnabled.value.viewport) {
    parts.push(`viewport: ${window.innerWidth}x${window.innerHeight}`)
  }

  if (contextEnabled.value.userAgent) {
    const ua = navigator.userAgent
    let browser = 'Unknown'
    if (ua.includes('Firefox/')) browser = 'Firefox'
    else if (ua.includes('Edg/')) browser = 'Edge'
    else if (ua.includes('Chrome/')) browser = 'Chrome'
    else if (ua.includes('Safari/') && !ua.includes('Chrome')) browser = 'Safari'

    let os = 'Unknown'
    if (ua.includes('Windows')) os = 'Windows'
    else if (ua.includes('Mac OS')) os = 'macOS'
    else if (ua.includes('Linux')) os = 'Linux'
    else if (ua.includes('Android')) os = 'Android'
    else if (ua.includes('iPhone') || ua.includes('iPad')) os = 'iOS'

    parts.push(`browser: ${browser} on ${os}`)
  }

  if (contextEnabled.value.routing) {
    parts.push(`route: ${window.location.pathname}`)
    if (window.location.search) {
      parts.push(`query: ${window.location.search}`)
    }
  }

  if (parts.length === 0) return null
  return `[context]\n${parts.join('\n')}\n[/context]\n`
}

function handleInput() {
  // Check for /command autocomplete
  const match = inputMessage.value.match(/(?:^|\s)\/\S*$/)
  showCommandsAutocomplete.value = !!match

  // Auto-resize textarea
  autoResizeTextarea()
}

function autoResizeTextarea() {
  const textarea = textareaRef.value
  if (!textarea) return

  // Reset height to measure scrollHeight correctly
  textarea.style.height = 'auto'
  // Set new height (capped at max-height via CSS)
  textarea.style.height = `${Math.min(textarea.scrollHeight, 280)}px`
}

function selectCommand(cmd: SlashCommand) {
  const match = inputMessage.value.match(/(?:^|\s)(\/\S*)$/)
  if (match) {
    const slashIndex = inputMessage.value.length - match[1].length
    inputMessage.value = inputMessage.value.slice(0, slashIndex) + `/${cmd.name} `
  }
  showCommandsAutocomplete.value = false
  textareaRef.value?.focus()
  nextTick(autoResizeTextarea)
}

function handleSubmit() {
  if (!inputMessage.value.trim() || isProcessing.value) return

  // Check if nickname is needed for sharing
  if (needsNicknameForMessage()) {
    pendingNicknameAction.value = 'message'
    showNicknameModal.value = true
    nicknameInput.value = ''
    return
  }

  // Prepend context block
  const context = collectContext()
  const messageWithContext = context ? context + inputMessage.value : inputMessage.value

  // Send with user ID if in share mode
  sendChatMessage(messageWithContext, isShareMode.value ? userId.value || undefined : undefined, nickname.value || undefined)
  inputMessage.value = ''
  showCommandsAutocomplete.value = false

  // Reset textarea height
  if (textareaRef.value) {
    textareaRef.value.style.height = 'auto'
  }
}

function handleKeydown(e: KeyboardEvent) {
  if (e.key === 'Enter' && !e.shiftKey) {
    e.preventDefault()
    handleSubmit()
  }
  if (e.key === 'Escape') {
    if (showCommandsAutocomplete.value) {
      showCommandsAutocomplete.value = false
    }
    else if (showHistory.value) {
      showHistory.value = false
    }
    else {
      isOpen.value = false
    }
  }
}

function lockBodyScroll(lock: boolean) {
  if (typeof document === 'undefined') return
  if (lock) {
    document.body.style.overflow = 'hidden'
    document.body.style.touchAction = 'none'
  }
  else {
    document.body.style.overflow = ''
    document.body.style.touchAction = ''
  }
}

function toggleOverlay() {
  isOpen.value = !isOpen.value
  if (isOpen.value) {
    // Lock body scroll on mobile
    if (window.innerWidth <= 640) {
      lockBodyScroll(true)
    }
    nextTick(() => {
      textareaRef.value?.focus()
      scrollToBottom()
    })
  }
  else {
    lockBodyScroll(false)
  }
}

function scrollToBottom() {
  if (messagesContainer.value) {
    messagesContainer.value.scrollTop = messagesContainer.value.scrollHeight
  }
}

function handleToggleHistory() {
  showHistory.value = !showHistory.value
  if (showHistory.value) {
    toggleHistory()
  }
}

function handleSelectConversation(id: string) {
  selectConversation(id)
  showHistory.value = false
}

function handleVoiceInput() {
  toggleVoiceInput((transcript) => {
    inputMessage.value += transcript + ' '
    nextTick(autoResizeTextarea)
  })
}

// Share functions
function handleShareClick() {
  if (needsNicknameForShare()) {
    pendingNicknameAction.value = 'share'
    showNicknameModal.value = true
    nicknameInput.value = ''
  }
  else {
    doShareCopy()
  }
}

async function doShareCopy() {
  const success = await copyShareLink()
  if (success) {
    showShareCopied.value = true
    setTimeout(() => {
      showShareCopied.value = false
    }, 2000)
  }
}

function handleNicknameSubmit() {
  const name = nicknameInput.value.trim()
  if (name.length < 2 || name.length > 20) return

  setNickname(name)

  if (socket.value) {
    registerUser(socket.value)
  }

  showNicknameModal.value = false

  // Execute pending action
  if (pendingNicknameAction.value === 'share') {
    doShareCopy()
  }
  else if (pendingNicknameAction.value === 'message') {
    handleSubmit()
  }

  pendingNicknameAction.value = null
}

function handleNicknameCancel() {
  showNicknameModal.value = false
  pendingNicknameAction.value = null
  nicknameInput.value = ''
}

// Handle body scroll lock when overlay state changes
watch(isOpen, (open) => {
  if (!open) {
    lockBodyScroll(false)
  }
  // Add/remove non-passive touchmove listener for swipe
  nextTick(() => {
    if (open && headerRef.value) {
      headerRef.value.addEventListener('touchmove', handleTouchMove as EventListener, { passive: false })
    }
  })
})

// Auto-scroll on new messages
watch(
  () => messages.value.length,
  () => {
    nextTick(scrollToBottom)
  },
)

// Watch for streaming content
watch(
  () => messages.value[messages.value.length - 1]?.content,
  () => {
    nextTick(scrollToBottom)
  },
)

// Keyboard shortcut to toggle (Ctrl+Shift+K)
function handleGlobalKeydown(e: KeyboardEvent) {
  if (e.ctrlKey && e.shiftKey && e.key === 'K') {
    e.preventDefault()
    toggleOverlay()
  }
}

onMounted(() => {
  initShare()
  connectSocket()
  loadFabPosition()
  window.addEventListener('keydown', handleGlobalKeydown)

  // Check if need to show nickname modal after invited
  if (needsNicknameImmediate()) {
    showNicknameModal.value = true
    pendingNicknameAction.value = null
  }
})

// Setup share listeners when socket connects
watch(isConnected, (connected) => {
  if (connected && socket.value) {
    setupShareListeners(socket.value)
    checkSharingStatus(socket.value)

    // Register user if we have nickname
    if (nickname.value && userId.value) {
      registerUser(socket.value)
    }
  }
})

onUnmounted(() => {
  disconnect()
  cleanupVoice()
  lockBodyScroll(false)
  window.removeEventListener('keydown', handleGlobalKeydown)
  if (headerRef.value) {
    headerRef.value.removeEventListener('touchmove', handleTouchMove as EventListener)
  }
})

function getMessageClass(role: Message['role']) {
  if (role === 'user') return 'claude-overlay-message-user'
  if (role === 'assistant') return 'claude-overlay-message-assistant'
  return 'claude-overlay-message-system'
}

function formatDate(dateStr: string): string {
  const date = new Date(dateStr)
  return date.toLocaleDateString() + ' ' + date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
}
</script>

<template>
  <Teleport to="body">
    <!-- FAB Button (draggable) -->
    <button
      v-if="!isOpen"
      ref="fabRef"
      :class="['claude-overlay-fab', { 'claude-overlay-fab-dragging': isDraggingFab, 'claude-overlay-fab-default': !fabPosition }]"
      :style="getFabStyle()"
      title="Chat with Claude (Ctrl+Shift+K) — drag to move"
      @mousedown="handleFabDragStart"
      @touchstart="handleFabDragStart"
      @click="handleFabClick"
    >
      <svg
        xmlns="http://www.w3.org/2000/svg"
        viewBox="0 0 24 24"
        fill="currentColor"
        class="claude-overlay-fab-icon"
      >
        <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-1 17.93c-3.95-.49-7-3.85-7-7.93 0-.62.08-1.21.21-1.79L9 15v1c0 1.1.9 2 2 2v1.93zm6.9-2.54c-.26-.81-1-1.39-1.9-1.39h-1v-3c0-.55-.45-1-1-1H8v-2h2c.55 0 1-.45 1-1V7h2c1.1 0 2-.9 2-2v-.41c2.93 1.19 5 4.06 5 7.41 0 2.08-.8 3.97-2.1 5.39z" />
      </svg>
      <span
        :class="['claude-overlay-fab-status', `claude-overlay-fab-status-${statusColor}`]"
      />
    </button>

    <!-- Backdrop (click outside to close) -->
    <Transition name="claude-overlay-fade">
      <div
        v-if="isOpen"
        class="claude-overlay-backdrop"
        @click="isOpen = false"
      />
    </Transition>

    <!-- Nickname Modal -->
    <Transition name="claude-overlay-fade">
      <div
        v-if="showNicknameModal"
        class="claude-overlay-modal-backdrop"
        @click.self="handleNicknameCancel"
      >
        <div class="claude-overlay-modal">
          <div class="claude-overlay-modal-header">
            <h3>Enter your nickname</h3>
            <button
              class="claude-overlay-btn-icon"
              @click="handleNicknameCancel"
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                viewBox="0 0 24 24"
                fill="currentColor"
                width="16"
                height="16"
              >
                <path d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z" />
              </svg>
            </button>
          </div>
          <div class="claude-overlay-modal-body">
            <p class="claude-overlay-modal-hint">
              Choose a nickname for collaborative chat sessions
            </p>
            <input
              v-model="nicknameInput"
              type="text"
              class="claude-overlay-modal-input"
              placeholder="Your nickname (2-20 characters)"
              maxlength="20"
              @keydown.enter="handleNicknameSubmit"
            >
            <p
              v-if="nicknameError"
              class="claude-overlay-modal-error"
            >
              {{ nicknameError }}
            </p>
          </div>
          <div class="claude-overlay-modal-actions">
            <button
              class="claude-overlay-modal-btn-secondary"
              @click="handleNicknameCancel"
            >
              Cancel
            </button>
            <button
              class="claude-overlay-modal-btn-primary"
              :disabled="nicknameInput.trim().length < 2"
              @click="handleNicknameSubmit"
            >
              Save
            </button>
          </div>
        </div>
      </div>
    </Transition>

    <!-- Chat Panel -->
    <Transition :name="isSwipeClosing ? '' : 'claude-overlay-slide'">
      <div
        v-if="isOpen"
        ref="panelRef"
        class="claude-overlay-panel"
      >
        <!-- Header (swipe handle on mobile) -->
        <div
          ref="headerRef"
          class="claude-overlay-header"
          @touchstart="handleTouchStart"
          @touchend="handleTouchEnd"
        >
          <div class="claude-overlay-header-left">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              viewBox="0 0 24 24"
              fill="currentColor"
              class="claude-overlay-header-icon"
            >
              <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2z" />
            </svg>
            <span class="claude-overlay-header-title">Claude</span>
            <span :class="['claude-overlay-status-badge', `claude-overlay-status-${statusColor}`]">
              {{ statusText }}
            </span>
          </div>
          <div class="claude-overlay-header-actions">
            <!-- Share button -->
            <button
              class="claude-overlay-btn-icon"
              :class="{ 'claude-overlay-btn-success': showShareCopied }"
              :title="showShareCopied ? 'Link copied!' : 'Share chat'"
              @click="handleShareClick"
            >
              <svg
                v-if="showShareCopied"
                xmlns="http://www.w3.org/2000/svg"
                viewBox="0 0 24 24"
                fill="currentColor"
                width="18"
                height="18"
              >
                <path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z" />
              </svg>
              <svg
                v-else
                xmlns="http://www.w3.org/2000/svg"
                viewBox="0 0 24 24"
                fill="currentColor"
                width="18"
                height="18"
              >
                <path d="M18 16.08c-.76 0-1.44.3-1.96.77L8.91 12.7c.05-.23.09-.46.09-.7s-.04-.47-.09-.7l7.05-4.11c.54.5 1.25.81 2.04.81 1.66 0 3-1.34 3-3s-1.34-3-3-3-3 1.34-3 3c0 .24.04.47.09.7L8.04 9.81C7.5 9.31 6.79 9 6 9c-1.66 0-3 1.34-3 3s1.34 3 3 3c.79 0 1.5-.31 2.04-.81l7.12 4.16c-.05.21-.08.43-.08.65 0 1.61 1.31 2.92 2.92 2.92s2.92-1.31 2.92-2.92-1.31-2.92-2.92-2.92z" />
              </svg>
            </button>
            <button
              class="claude-overlay-btn-icon"
              title="History"
              @click="handleToggleHistory"
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                viewBox="0 0 24 24"
                fill="currentColor"
                width="18"
                height="18"
              >
                <path d="M13 3a9 9 0 0 0-9 9H1l3.89 3.89.07.14L9 12H6c0-3.87 3.13-7 7-7s7 3.13 7 7-3.13 7-7 7c-1.93 0-3.68-.79-4.94-2.06l-1.42 1.42A8.954 8.954 0 0 0 13 21a9 9 0 0 0 0-18zm-1 5v5l4.28 2.54.72-1.21-3.5-2.08V8H12z" />
              </svg>
            </button>
            <button
              class="claude-overlay-btn-icon"
              title="New chat"
              @click="newChat"
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                viewBox="0 0 24 24"
                fill="currentColor"
                width="18"
                height="18"
              >
                <path d="M19 13h-6v6h-2v-6H5v-2h6V5h2v6h6v2z" />
              </svg>
            </button>
          </div>
        </div>

        <!-- History Panel -->
        <Transition name="claude-overlay-slide-right">
          <div
            v-if="showHistory"
            class="claude-overlay-history"
          >
            <div class="claude-overlay-history-header">
              <span>History</span>
              <button
                class="claude-overlay-btn-icon"
                @click="showHistory = false"
              >
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  viewBox="0 0 24 24"
                  fill="currentColor"
                  width="16"
                  height="16"
                >
                  <path d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z" />
                </svg>
              </button>
            </div>
            <div class="claude-overlay-history-list">
              <div
                v-for="conv in conversations"
                :key="conv.id"
                class="claude-overlay-history-item"
                @click="handleSelectConversation(conv.id)"
              >
                <div class="claude-overlay-history-title">
                  {{ stripContextBlock(conv.title || '') || 'Untitled' }}
                </div>
                <div class="claude-overlay-history-date">
                  {{ formatDate(conv.updatedAt) }}
                </div>
              </div>
              <div
                v-if="conversations.length === 0"
                class="claude-overlay-history-empty"
              >
                No conversations yet
              </div>
            </div>
          </div>
        </Transition>

        <!-- Messages -->
        <div
          ref="messagesContainer"
          class="claude-overlay-messages"
        >
          <div
            v-if="messages.length === 0"
            class="claude-overlay-empty"
          >
            <p>Start a conversation with Claude</p>
            <p class="claude-overlay-empty-hint">
              Type a message or use /commands
            </p>
          </div>

          <div
            v-for="message in messages"
            :key="message.id"
            :class="[
              'claude-overlay-message',
              getMessageClass(message.role),
              {
                'claude-overlay-message-own': message.role === 'user' && isOwnMessage(message.senderId),
                'claude-overlay-message-other': message.role === 'user' && !isOwnMessage(message.senderId),
              },
            ]"
          >
            <!-- User message -->
            <template v-if="message.role === 'user'">
              <div
                v-if="isShareMode && message.senderNickname"
                class="claude-overlay-message-sender"
              >
                {{ message.senderNickname }}
                <span
                  v-if="isOwnMessage(message.senderId)"
                  class="claude-overlay-message-you"
                >(you)</span>
              </div>
              <div class="claude-overlay-message-content">
                {{ getDisplayContent(message) }}
              </div>
            </template>

            <!-- Assistant message -->
            <template v-else-if="message.role === 'assistant'">
              <div class="claude-overlay-message-content">
                <template v-if="message.contentBlocks?.length">
                  <template
                    v-for="(block, idx) in message.contentBlocks"
                    :key="idx"
                  >
                    <MarkdownContent
                      v-if="block.type === 'text' && block.text"
                      :content="stripContextBlock(block.text)"
                    />
                    <ToolCallBlock
                      v-else-if="block.type === 'tool_use'"
                      :block="block"
                      :result="findToolResult(message.contentBlocks, block.id!)"
                    />
                  </template>
                </template>
                <template v-else-if="message.content">
                  <MarkdownContent :content="getDisplayContent(message)" />
                </template>
                <span
                  v-if="message.streaming"
                  class="claude-overlay-cursor"
                />
              </div>
            </template>

            <!-- System message -->
            <template v-else>
              <div class="claude-overlay-message-content claude-overlay-message-system-content">
                {{ getDisplayContent(message) }}
              </div>
            </template>
          </div>
        </div>

        <!-- Input -->
        <div class="claude-overlay-input-container">
          <!-- Commands autocomplete -->
          <div
            v-if="showCommandsAutocomplete && filteredCommands.length > 0"
            class="claude-overlay-autocomplete"
          >
            <button
              v-for="cmd in filteredCommands"
              :key="cmd.name"
              class="claude-overlay-autocomplete-item"
              @click="selectCommand(cmd)"
            >
              <span class="claude-overlay-autocomplete-name">/{{ cmd.name }}</span>
              <span
                v-if="cmd.description"
                class="claude-overlay-autocomplete-desc"
              >{{ cmd.description }}</span>
            </button>
          </div>

          <div class="claude-overlay-input-wrapper">
            <textarea
              ref="textareaRef"
              v-model="inputMessage"
              class="claude-overlay-input"
              placeholder="Ask Claude..."
              rows="1"
              :disabled="!isConnected || isProcessing"
              @input="handleInput"
              @keydown="handleKeydown"
            />
            <div class="claude-overlay-input-actions">
              <!-- Voice input button -->
              <button
                v-if="isSpeechSupported"
                :class="['claude-overlay-voice-btn', { 'claude-overlay-voice-recording': isRecording }]"
                :disabled="!isConnected || isProcessing"
                title="Voice input"
                @click="handleVoiceInput"
              >
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  viewBox="0 0 24 24"
                  fill="currentColor"
                  width="20"
                  height="20"
                >
                  <path d="M12 14c1.66 0 2.99-1.34 2.99-3L15 5c0-1.66-1.34-3-3-3S9 3.34 9 5v6c0 1.66 1.34 3 3 3zm5.3-3c0 3-2.54 5.1-5.3 5.1S6.7 14 6.7 11H5c0 3.41 2.72 6.23 6 6.72V21h2v-3.28c3.28-.48 6-3.3 6-6.72h-1.7z" />
                </svg>
              </button>
              <!-- Send button -->
              <button
                class="claude-overlay-send-btn"
                :disabled="!inputMessage.trim() || !isConnected || isProcessing"
                @click="handleSubmit"
              >
                <svg
                  v-if="isProcessing"
                  class="claude-overlay-spinner"
                  xmlns="http://www.w3.org/2000/svg"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  width="20"
                  height="20"
                >
                  <circle
                    cx="12"
                    cy="12"
                    r="10"
                    stroke-width="2"
                    opacity="0.25"
                  />
                  <path
                    d="M12 2a10 10 0 0 1 10 10"
                    stroke-width="2"
                    stroke-linecap="round"
                  />
                </svg>
                <svg
                  v-else
                  xmlns="http://www.w3.org/2000/svg"
                  viewBox="0 0 24 24"
                  fill="currentColor"
                  width="20"
                  height="20"
                >
                  <path d="M2.01 21L23 12 2.01 3 2 10l15 2-15 2z" />
                </svg>
              </button>
            </div>
          </div>
        </div>
      </div>
    </Transition>
  </Teleport>
</template>

<style>
/* CSS Variables */
:root {
  --claude-primary: #10a37f;
  --claude-primary-hover: #0d8a6a;
  --claude-bg: #1a1a1a;
  --claude-bg-elevated: #252525;
  --claude-bg-hover: #2a2a2a;
  --claude-text: #ffffff;
  --claude-text-muted: #a0a0a0;
  --claude-border: #333333;
  --claude-user-bg: #2d4a3e;
  --claude-system-bg: #3d3d3d;
  --claude-radius: 12px;
  --claude-radius-sm: 8px;
}

/* FAB Button */
.claude-overlay-fab {
  position: fixed;
  bottom: 20px;
  width: 56px;
  height: 56px;
  border-radius: 50%;
  background: var(--claude-primary);
  color: white;
  border: none;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.2);
  transition: transform 0.2s, background 0.2s, opacity 0.2s, box-shadow 0.2s;
  z-index: 99998;
  opacity: 0.6;
}

.claude-overlay-fab:hover {
  transform: scale(1.05);
  background: var(--claude-primary-hover);
  opacity: 1;
  box-shadow: 0 6px 20px rgba(0, 0, 0, 0.35);
}

.claude-overlay-fab-dragging {
  opacity: 1;
  cursor: grabbing;
  transform: scale(1.1);
  box-shadow: 0 8px 24px rgba(0, 0, 0, 0.4);
  transition: none;
}

/* Backdrop */
.claude-overlay-backdrop {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.3);
  z-index: 99997;
}

.claude-overlay-fade-enter-active,
.claude-overlay-fade-leave-active {
  transition: opacity 0.2s ease;
}

.claude-overlay-fade-enter-from,
.claude-overlay-fade-leave-to {
  opacity: 0;
}

.claude-overlay-fab-default { right: 20px; }

.claude-overlay-fab-icon {
  width: 28px;
  height: 28px;
}

.claude-overlay-fab-status {
  position: absolute;
  top: 4px;
  right: 4px;
  width: 12px;
  height: 12px;
  border-radius: 50%;
  border: 2px solid var(--claude-bg);
}

.claude-overlay-fab-status-green { background: #22c55e; }
.claude-overlay-fab-status-blue { background: #3b82f6; }
.claude-overlay-fab-status-red { background: #ef4444; }

/* Panel */
.claude-overlay-panel {
  position: fixed;
  bottom: 20px;
  right: 20px;
  width: 420px;
  max-width: calc(100vw - 40px);
  height: calc(100vh - 40px);
  background: var(--claude-bg);
  border-radius: var(--claude-radius);
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.4);
  display: flex;
  flex-direction: column;
  overflow: hidden;
  z-index: 99999;
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
  font-size: 14px;
  color: var(--claude-text);
}

/* Header */
.claude-overlay-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 12px 16px;
  background: var(--claude-bg-elevated);
  border-bottom: 1px solid var(--claude-border);
  flex-shrink: 0;
}

.claude-overlay-header-left {
  display: flex;
  align-items: center;
  gap: 8px;
}

.claude-overlay-header-icon {
  width: 24px;
  height: 24px;
  color: var(--claude-primary);
}

.claude-overlay-header-title {
  font-weight: 600;
  font-size: 16px;
}

.claude-overlay-status-badge {
  font-size: 11px;
  padding: 2px 8px;
  border-radius: 10px;
  background: var(--claude-bg);
}

.claude-overlay-status-green { color: #22c55e; }
.claude-overlay-status-blue { color: #3b82f6; }
.claude-overlay-status-red { color: #ef4444; }

.claude-overlay-header-actions {
  display: flex;
  gap: 4px;
}

.claude-overlay-btn-icon {
  width: 32px;
  height: 32px;
  border: none;
  background: transparent;
  color: var(--claude-text-muted);
  cursor: pointer;
  border-radius: var(--claude-radius-sm);
  display: flex;
  align-items: center;
  justify-content: center;
  transition: background 0.2s, color 0.2s;
}

.claude-overlay-btn-icon:hover {
  background: var(--claude-bg-hover);
  color: var(--claude-text);
}

.claude-overlay-btn-success {
  color: #22c55e !important;
}

/* History Panel */
.claude-overlay-history {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: var(--claude-bg);
  z-index: 10;
  display: flex;
  flex-direction: column;
}

.claude-overlay-history-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 12px 16px;
  background: var(--claude-bg-elevated);
  border-bottom: 1px solid var(--claude-border);
  font-weight: 600;
}

.claude-overlay-history-list {
  flex: 1;
  overflow-y: auto;
  padding: 8px;
}

.claude-overlay-history-item {
  padding: 12px;
  border-radius: var(--claude-radius-sm);
  cursor: pointer;
  transition: background 0.15s;
}

.claude-overlay-history-item:hover {
  background: var(--claude-bg-hover);
}

.claude-overlay-history-title {
  font-weight: 500;
  margin-bottom: 4px;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.claude-overlay-history-date {
  font-size: 12px;
  color: var(--claude-text-muted);
}

.claude-overlay-history-empty {
  text-align: center;
  color: var(--claude-text-muted);
  padding: 32px;
}

/* Messages */
.claude-overlay-messages {
  flex: 1;
  overflow-y: auto;
  padding: 16px;
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.claude-overlay-empty {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  color: var(--claude-text-muted);
  text-align: center;
}

.claude-overlay-empty-hint {
  font-size: 12px;
  margin-top: 4px;
  opacity: 0.7;
}

.claude-overlay-message {
  max-width: 90%;
}

.claude-overlay-message-user {
  align-self: flex-end;
}

.claude-overlay-message-sender {
  font-size: 11px;
  font-weight: 600;
  color: var(--claude-primary);
  margin-bottom: 4px;
  padding-left: 2px;
}

.claude-overlay-message-you {
  opacity: 0.5;
  font-weight: 400;
}

/* Own user messages - right aligned, green background */
.claude-overlay-message-own {
  align-self: flex-end;
}

.claude-overlay-message-own .claude-overlay-message-content {
  background: var(--claude-user-bg);
  border-radius: var(--claude-radius-sm);
  padding: 10px 14px;
  white-space: pre-wrap;
  word-break: break-word;
}

/* Other user messages - left aligned, blue background */
.claude-overlay-message-other {
  align-self: flex-start;
}

.claude-overlay-message-other .claude-overlay-message-content {
  background: rgba(168, 85, 247, 0.2);
  border-radius: var(--claude-radius-sm);
  padding: 10px 14px;
  white-space: pre-wrap;
  word-break: break-word;
}

/* Fallback for user messages without sender info */
.claude-overlay-message-user .claude-overlay-message-content {
  background: var(--claude-user-bg);
  border-radius: var(--claude-radius-sm);
  padding: 10px 14px;
  white-space: pre-wrap;
  word-break: break-word;
}

.claude-overlay-message-assistant {
  align-self: flex-start;
}

.claude-overlay-message-assistant .claude-overlay-message-content {
  background: var(--claude-bg-elevated);
  border-radius: var(--claude-radius-sm);
  padding: 10px 14px;
}

.claude-overlay-message-system {
  align-self: center;
}

.claude-overlay-message-system-content {
  background: var(--claude-system-bg);
  border-radius: var(--claude-radius-sm);
  padding: 8px 12px;
  font-size: 12px;
  color: var(--claude-text-muted);
}

.claude-overlay-cursor {
  display: inline-block;
  width: 8px;
  height: 16px;
  background: var(--claude-primary);
  margin-left: 2px;
  animation: claude-blink 1s infinite;
}

@keyframes claude-blink {
  0%, 50% { opacity: 1; }
  51%, 100% { opacity: 0; }
}

/* Input */
.claude-overlay-input-container {
  position: relative;
  padding: 12px 16px;
  background: var(--claude-bg-elevated);
  border-top: 1px solid var(--claude-border);
  flex-shrink: 0;
}

.claude-overlay-autocomplete {
  position: absolute;
  bottom: 100%;
  left: 16px;
  right: 16px;
  background: var(--claude-bg);
  border: 1px solid var(--claude-border);
  border-radius: var(--claude-radius-sm);
  overflow: hidden;
  box-shadow: 0 -4px 12px rgba(0, 0, 0, 0.2);
}

.claude-overlay-autocomplete-item {
  width: 100%;
  padding: 10px 12px;
  border: none;
  background: transparent;
  color: var(--claude-text);
  cursor: pointer;
  text-align: left;
  display: flex;
  flex-direction: column;
  gap: 2px;
  transition: background 0.15s;
}

.claude-overlay-autocomplete-item:hover {
  background: var(--claude-bg-hover);
}

.claude-overlay-autocomplete-name {
  font-family: monospace;
  color: var(--claude-primary);
}

.claude-overlay-autocomplete-desc {
  font-size: 12px;
  color: var(--claude-text-muted);
}

.claude-overlay-input-wrapper {
  display: flex;
  gap: 8px;
  align-items: flex-end;
}

.claude-overlay-input {
  flex: 1;
  background: var(--claude-bg);
  border: 1px solid var(--claude-border);
  border-radius: var(--claude-radius-sm);
  padding: 10px 12px;
  color: var(--claude-text);
  font-size: 14px;
  resize: none;
  min-height: 40px;
  max-height: 280px;
  font-family: inherit;
  line-height: 1.4;
  overflow-y: auto;
}

.claude-overlay-input:focus {
  outline: none;
  border-color: var(--claude-primary);
}

.claude-overlay-input::placeholder {
  color: var(--claude-text-muted);
}

.claude-overlay-input:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.claude-overlay-input-actions {
  display: flex;
  gap: 4px;
  flex-shrink: 0;
}

.claude-overlay-voice-btn {
  width: 40px;
  height: 40px;
  border: none;
  background: var(--claude-bg);
  color: var(--claude-text-muted);
  border-radius: var(--claude-radius-sm);
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: background 0.2s, color 0.2s;
}

.claude-overlay-voice-btn:hover:not(:disabled) {
  background: var(--claude-bg-hover);
  color: var(--claude-text);
}

.claude-overlay-voice-btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.claude-overlay-voice-recording {
  background: #ef4444 !important;
  color: white !important;
  animation: claude-pulse 1s infinite;
}

@keyframes claude-pulse {
  0%, 100% { opacity: 1; }
  50% { opacity: 0.7; }
}

.claude-overlay-send-btn {
  width: 40px;
  height: 40px;
  border: none;
  background: var(--claude-primary);
  color: white;
  border-radius: var(--claude-radius-sm);
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: background 0.2s;
}

.claude-overlay-send-btn:hover:not(:disabled) {
  background: var(--claude-primary-hover);
}

.claude-overlay-send-btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.claude-overlay-spinner {
  animation: claude-spin 1s linear infinite;
}

@keyframes claude-spin {
  from { transform: rotate(0deg); }
  to { transform: rotate(360deg); }
}

/* Transitions */
.claude-overlay-slide-enter-active,
.claude-overlay-slide-leave-active {
  transition: opacity 0.2s, transform 0.2s;
}

.claude-overlay-slide-enter-from,
.claude-overlay-slide-leave-to {
  opacity: 0;
  transform: translateY(20px) scale(0.95);
}

.claude-overlay-slide-right-enter-active,
.claude-overlay-slide-right-leave-active {
  transition: transform 0.2s ease-out;
}

.claude-overlay-slide-right-enter-from,
.claude-overlay-slide-right-leave-to {
  transform: translateX(100%);
}

/* Scrollbar */
.claude-overlay-messages::-webkit-scrollbar,
.claude-overlay-history-list::-webkit-scrollbar {
  width: 6px;
}

.claude-overlay-messages::-webkit-scrollbar-track,
.claude-overlay-history-list::-webkit-scrollbar-track {
  background: transparent;
}

.claude-overlay-messages::-webkit-scrollbar-thumb,
.claude-overlay-history-list::-webkit-scrollbar-thumb {
  background: var(--claude-border);
  border-radius: 3px;
}

.claude-overlay-messages::-webkit-scrollbar-thumb:hover,
.claude-overlay-history-list::-webkit-scrollbar-thumb:hover {
  background: var(--claude-text-muted);
}

/* Mobile styles - bottom sheet */
@media (max-width: 640px) {
  .claude-overlay-fab {
    bottom: 16px;
    width: 52px;
    height: 52px;
  }

  .claude-overlay-fab-default { right: 16px; }

  .claude-overlay-panel {
    bottom: 0;
    left: 0 !important;
    right: 0 !important;
    width: 100%;
    max-width: 100%;
    height: 92vh;
    height: 92dvh;
    max-height: 92vh;
    max-height: 92dvh;
    border-radius: var(--claude-radius) var(--claude-radius) 0 0;
  }

  /* Slide up animation for mobile */
  .claude-overlay-slide-enter-from,
  .claude-overlay-slide-leave-to {
    opacity: 1;
    transform: translateY(100%);
  }

  .claude-overlay-slide-enter-active,
  .claude-overlay-slide-leave-active {
    transition: transform 0.3s ease-out;
  }

  /* Header is swipeable on mobile */
  .claude-overlay-header {
    cursor: grab;
    touch-action: none;
    user-select: none;
  }

  .claude-overlay-header:active {
    cursor: grabbing;
  }

  /* Drag handle indicator */
  .claude-overlay-header::before {
    content: '';
    position: absolute;
    top: 8px;
    left: 50%;
    transform: translateX(-50%);
    width: 36px;
    height: 4px;
    background: var(--claude-border);
    border-radius: 2px;
  }

  .claude-overlay-header {
    position: relative;
    padding-top: 20px;
  }

  /* Larger touch targets on mobile */
  .claude-overlay-btn-icon {
    width: 40px;
    height: 40px;
  }

  .claude-overlay-input {
    font-size: 16px; /* Prevents iOS zoom on focus */
  }

  .claude-overlay-voice-btn,
  .claude-overlay-send-btn {
    width: 44px;
    height: 44px;
  }

  /* Safe area for devices with notch/home indicator */
  .claude-overlay-input-container {
    padding-bottom: calc(12px + env(safe-area-inset-bottom, 0px));
  }
}

/* Nickname Modal */
.claude-overlay-modal-backdrop {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.6);
  z-index: 100000;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 20px;
}

.claude-overlay-modal {
  background: var(--claude-bg);
  border-radius: var(--claude-radius);
  width: 100%;
  max-width: 360px;
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.4);
}

.claude-overlay-modal-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 16px 16px 12px;
  border-bottom: 1px solid var(--claude-border);
}

.claude-overlay-modal-header h3 {
  margin: 0;
  font-size: 16px;
  font-weight: 600;
}

.claude-overlay-modal-body {
  padding: 16px;
}

.claude-overlay-modal-hint {
  margin: 0 0 12px;
  font-size: 13px;
  color: var(--claude-text-muted);
}

.claude-overlay-modal-input {
  width: 100%;
  padding: 10px 12px;
  background: var(--claude-bg-elevated);
  border: 1px solid var(--claude-border);
  border-radius: var(--claude-radius-sm);
  color: var(--claude-text);
  font-size: 14px;
  font-family: inherit;
}

.claude-overlay-modal-input:focus {
  outline: none;
  border-color: var(--claude-primary);
}

.claude-overlay-modal-input::placeholder {
  color: var(--claude-text-muted);
}

.claude-overlay-modal-error {
  margin: 8px 0 0;
  font-size: 13px;
  color: #ef4444;
}

.claude-overlay-modal-actions {
  display: flex;
  gap: 8px;
  padding: 12px 16px 16px;
  justify-content: flex-end;
}

.claude-overlay-modal-btn-secondary,
.claude-overlay-modal-btn-primary {
  padding: 8px 16px;
  border-radius: var(--claude-radius-sm);
  font-size: 14px;
  font-weight: 500;
  cursor: pointer;
  border: none;
  transition: background 0.2s, opacity 0.2s;
}

.claude-overlay-modal-btn-secondary {
  background: var(--claude-bg-elevated);
  color: var(--claude-text);
}

.claude-overlay-modal-btn-secondary:hover {
  background: var(--claude-bg-hover);
}

.claude-overlay-modal-btn-primary {
  background: var(--claude-primary);
  color: white;
}

.claude-overlay-modal-btn-primary:hover:not(:disabled) {
  background: var(--claude-primary-hover);
}

.claude-overlay-modal-btn-primary:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}
</style>
