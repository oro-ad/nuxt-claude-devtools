<script lang="ts" setup>
import { nextTick, onMounted, onUnmounted, ref, watch } from 'vue'
import { useClaudeChat } from '../../shared/composables/useClaudeChat'
import { useVoiceInput } from '../../shared/composables/useVoiceInput'
import { useShare } from '../../shared/composables/useShare'
import { useMessageContext } from '../composables/useMessageContext'
import type { ImageAttachment, SlashCommand } from '../../shared/types'
import { useMobileSwipe, usePanelInteraction, usePanelPosition } from '../composables'
import { ChatHeader, ChatInput, ChatMessages, ClaudeBadge, HistoryPanel, NicknameModal } from './chat'

const props = defineProps<{
  socketUrl?: string
}>()

// ============================================================================
// CORE STATE
// ============================================================================

const isOpen = ref(false)
const isMobile = ref(false)
const panelRef = ref<HTMLElement | null>(null)
const headerRef = ref<HTMLElement | null>(null)
const chatInputRef = ref<InstanceType<typeof ChatInput> | null>(null)
const chatMessagesRef = ref<InstanceType<typeof ChatMessages> | null>(null)

function checkMobile() {
  isMobile.value = window.innerWidth <= 640
}

// ============================================================================
// PANEL POSITIONING
// ============================================================================

const {
  badgePos,
  panelSize,
  panelScreenPos,
  load: loadPanelState,
  openPanel,
  closePanel,
  onBadgeDragEnd,
  getPanelStyle,
} = usePanelPosition()

// ============================================================================
// PANEL INTERACTIONS (drag/resize)
// ============================================================================

const {
  isDragging: isPanelDragging,
  isResizing: isPanelResizing,
  activeEdge: activeResizeEdge,
  hoveredEdge,
  cursor: resizeCursor,
  startDrag: handlePanelDragStart,
  startResize: handlePanelResizeStart,
  onMouseMove: handlePanelMouseMove,
  onMouseLeave: handlePanelMouseLeave,
} = usePanelInteraction({
  panelScreenPos,
  panelSize,
  panelRef,
  isMobile,
})

// ============================================================================
// MOBILE SWIPE
// ============================================================================

function lockBodyScroll(lock: boolean) {
  if (typeof document === 'undefined') return
  document.body.style.overflow = lock ? 'hidden' : ''
  document.body.style.touchAction = lock ? 'none' : ''
}

const {
  isSwipeClosing,
  handleTouchStart,
  handleTouchEnd,
  setupTouchMoveListener,
  cleanupTouchMoveListener,
} = useMobileSwipe({
  panelRef,
  headerRef,
  onSwipeClose: () => {
    isOpen.value = false
    lockBodyScroll(false)
  },
})

// ============================================================================
// CHAT LOGIC
// ============================================================================

const commands = ref<SlashCommand[]>([])
const showHistory = ref(false)

const {
  userId,
  nickname,
  showNicknameModal,
  nicknameError,
  isShareMode,
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
  getBaseUrl: () => props.socketUrl || window.location.origin,
  log: (...args) => {
    if (import.meta.env.DEV) console.log('[ChatOverlay:Share]', ...args)
  },
})

const {
  socket,
  messages,
  conversations,
  isConnected,
  isProcessing,
  statusColor,
  connectSocket,
  disconnect,
  sendMessage: sendChatMessage,
  stopGeneration,
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
    if (import.meta.env.DEV) console.log('[ChatOverlay]', ...args)
  },
})

const {
  isRecording,
  isSpeechSupported,
  toggleVoiceInput,
  cleanup: cleanupVoice,
} = useVoiceInput()

// Share UI state
const showShareCopied = ref(false)
const pendingNicknameAction = ref<'share' | 'message' | null>(null)

// Context collection (using shared composable)
const { generateContextBlock } = useMessageContext()

// Overlay always collects context (all chips enabled)
function collectContext(): string | null {
  const context = {
    viewport: {
      width: window.innerWidth,
      height: window.innerHeight,
    },
    userAgent: navigator.userAgent,
    routing: {
      path: window.location.pathname,
      fullPath: window.location.pathname + window.location.search,
      query: window.location.search
        ? Object.fromEntries(new URLSearchParams(window.location.search)) as Record<string, string>
        : undefined,
    },
  }

  return generateContextBlock(context) + '\n'
}

// ============================================================================
// EVENT HANDLERS
// ============================================================================

function handleMessageSubmit(message: string, attachments?: ImageAttachment[]) {
  if (needsNicknameForMessage()) {
    pendingNicknameAction.value = 'message'
    showNicknameModal.value = true
    return
  }

  const context = collectContext()
  sendChatMessage(
    context + message,
    isShareMode.value ? userId.value || undefined : undefined,
    nickname.value || undefined,
    attachments,
  )
}

function handleShareClick() {
  if (needsNicknameForShare()) {
    pendingNicknameAction.value = 'share'
    showNicknameModal.value = true
  }
  else {
    doShareCopy()
  }
}

async function doShareCopy() {
  if (await copyShareLink()) {
    showShareCopied.value = true
    setTimeout(() => {
      showShareCopied.value = false
    }, 2000)
  }
}

function handleNicknameSubmit(name: string) {
  setNickname(name)
  if (socket.value) registerUser(socket.value)
  showNicknameModal.value = false

  if (pendingNicknameAction.value === 'share') {
    doShareCopy()
  }
  pendingNicknameAction.value = null
}

function handleNicknameCancel() {
  showNicknameModal.value = false
  pendingNicknameAction.value = null
}

function handleToggleHistory() {
  showHistory.value = !showHistory.value
  if (showHistory.value) toggleHistory()
}

function handleSelectConversation(id: string) {
  selectConversation(id)
  showHistory.value = false
}

function handleVoiceInput() {
  toggleVoiceInput((transcript) => {
    chatInputRef.value?.appendText(transcript)
  })
}

function handleStopGeneration() {
  stopGeneration()
}

// ============================================================================
// OVERLAY CONTROL
// ============================================================================

function handleClose() {
  closePanel()
  isOpen.value = false
  lockBodyScroll(false)
}

function toggleOverlay() {
  if (!isOpen.value) {
    if (window.innerWidth <= 640) lockBodyScroll(true)
    openPanel()
    isOpen.value = true
    nextTick(() => {
      chatInputRef.value?.focus()
      chatMessagesRef.value?.scrollToBottom()
    })
  }
  else {
    handleClose()
  }
}

function handleKeydown(e: KeyboardEvent) {
  if (e.key === 'Escape') {
    if (showHistory.value) {
      showHistory.value = false
    }
    else {
      handleClose()
    }
  }
}

function handleGlobalKeydown(e: KeyboardEvent) {
  if (e.ctrlKey && e.shiftKey && e.key === 'K') {
    e.preventDefault()
    toggleOverlay()
  }
}

// ============================================================================
// LIFECYCLE
// ============================================================================

watch(isOpen, (open) => {
  if (!open) lockBodyScroll(false)
  nextTick(() => {
    if (open) {
      setupTouchMoveListener()
    }
  })
})

watch(isConnected, (connected) => {
  if (connected && socket.value) {
    setupShareListeners(socket.value)
    checkSharingStatus(socket.value)
    if (nickname.value && userId.value) {
      registerUser(socket.value)
    }
  }
})

onMounted(() => {
  initShare()
  connectSocket()
  loadPanelState()
  checkMobile()
  window.addEventListener('keydown', handleGlobalKeydown)
  window.addEventListener('resize', checkMobile)

  if (needsNicknameImmediate()) {
    showNicknameModal.value = true
    pendingNicknameAction.value = null
  }
})

onUnmounted(() => {
  disconnect()
  cleanupVoice()
  lockBodyScroll(false)
  window.removeEventListener('keydown', handleGlobalKeydown)
  window.removeEventListener('resize', checkMobile)
  cleanupTouchMoveListener()
})
</script>

<template>
  <Teleport to="body">
    <!-- Badge -->
    <ClaudeBadge
      v-if="!isOpen"
      :position="badgePos"
      :status-color="statusColor"
      @click="toggleOverlay"
      @drag-end="onBadgeDragEnd"
    />

    <!-- Backdrop -->
    <Transition name="claude-fade">
      <div
        v-if="isOpen"
        class="claude-backdrop"
        @click="handleClose"
      />
    </Transition>

    <!-- Nickname Modal -->
    <NicknameModal
      :error="nicknameError"
      :show="showNicknameModal"
      @cancel="handleNicknameCancel"
      @submit="handleNicknameSubmit"
    />

    <!-- Chat Panel -->
    <Transition :name="isSwipeClosing ? '' : 'claude-slide'">
      <div
        v-if="isOpen"
        ref="panelRef"
        :class="['claude-panel', { 'claude-panel-dragging': isPanelDragging, 'claude-panel-resizing': isPanelResizing }]"
        :style="[isMobile ? {} : getPanelStyle(), { cursor: resizeCursor }]"
        @keydown="handleKeydown"
        @mouseleave="handlePanelMouseLeave"
        @mousemove="handlePanelMouseMove"
      >
        <!-- Resize edges -->
        <template v-if="!isMobile">
          <div
            v-for="edge in ['n', 's', 'e', 'w']"
            :key="edge"
            :class="`claude-resize-edge claude-resize-${edge}`"
            @mousedown="(e) => handlePanelResizeStart(edge, e)"
          />
          <div
            v-for="corner in ['nw', 'ne', 'sw', 'se']"
            :key="corner"
            :class="['claude-resize-corner', `claude-resize-${corner}`, { 'claude-resize-active': hoveredEdge === corner || activeResizeEdge === corner }]"
            @mousedown="(e) => handlePanelResizeStart(corner, e)"
          />
        </template>

        <!-- Mobile drag bumper -->
        <div
          v-if="isMobile"
          ref="headerRef"
          class="claude-drag-bumper"
          @touchend="handleTouchEnd"
          @touchstart="handleTouchStart"
        >
          <div class="claude-drag-handle-bar" />
        </div>

        <!-- Header -->
        <ChatHeader
          :is-mobile="isMobile"
          :show-share-copied="showShareCopied"
          :status-color="statusColor"
          @history="handleToggleHistory"
          @share="handleShareClick"
          @new-chat="newChat"
          @drag-start="handlePanelDragStart"
        />

        <!-- History -->
        <HistoryPanel
          :conversations="conversations"
          :show="showHistory"
          @close="showHistory = false"
          @select="handleSelectConversation"
        />

        <!-- Messages -->
        <ChatMessages
          ref="chatMessagesRef"
          :find-tool-result="findToolResult"
          :is-own-message="isOwnMessage"
          :is-share-mode="isShareMode"
          :messages="messages"
        />

        <!-- Input -->
        <ChatInput
          ref="chatInputRef"
          :commands="commands"
          :is-connected="isConnected"
          :is-processing="isProcessing"
          :is-recording="isRecording"
          :is-speech-supported="isSpeechSupported"
          @submit="handleMessageSubmit"
          @voice-input="handleVoiceInput"
          @stop="handleStopGeneration"
        />
      </div>
    </Transition>
  </Teleport>
</template>

<style>
/* CSS Variables */
:root {
  --claude-primary: #FE9A00;
  --claude-primary-hover: #FFB340;
  --claude-primary-dark: #E58A00;
  --claude-primary-glow: rgba(254, 154, 0, 0.5);
  --claude-glass: rgba(255, 255, 255, 0.05);
  --claude-glass-elevated: rgba(255, 255, 255, 0.08);
  --claude-glass-hover: rgba(255, 255, 255, 0.12);
  --claude-glass-solid: rgba(12, 12, 18, 0.88);
  --claude-text: rgba(255, 255, 255, 0.95);
  --claude-text-muted: rgba(255, 255, 255, 0.5);
  --claude-text-dim: rgba(255, 255, 255, 0.3);
  --claude-border: rgba(255, 255, 255, 0.1);
  --claude-border-light: rgba(255, 255, 255, 0.15);
  --claude-user-bg: linear-gradient(135deg, rgba(254, 154, 0, 0.25), rgba(251, 191, 36, 0.15));
  --claude-assistant-bg: rgba(255, 255, 255, 0.06);
  --claude-other-user-bg: linear-gradient(135deg, rgba(244, 63, 94, 0.2), rgba(254, 154, 0, 0.15));
  --claude-system-bg: rgba(255, 255, 255, 0.04);
  --claude-blur: 20px;
  --claude-blur-heavy: 40px;
  --claude-radius: 20px;
  --claude-radius-sm: 12px;
  --claude-radius-xs: 8px;
  --claude-shadow: 0 8px 32px rgba(0, 0, 0, 0.3);
  --claude-shadow-lg: 0 25px 50px -12px rgba(0, 0, 0, 0.5);
  --claude-glow: 0 0 40px var(--claude-primary-glow);
}

/* Backdrop */
.claude-backdrop {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.4);
  z-index: 99997;
}

.claude-fade-enter-active,
.claude-fade-leave-active {
  transition: opacity 0.3s ease;
}

.claude-fade-enter-from,
.claude-fade-leave-to {
  opacity: 0;
}

/* Panel */
.claude-panel {
  position: fixed;
  min-width: 320px;
  max-width: calc(100vw - 48px);
  min-height: 400px;
  max-height: calc(100vh - 48px);
  background: var(--claude-glass-solid);
  backdrop-filter: blur(var(--claude-blur-heavy));
  -webkit-backdrop-filter: blur(var(--claude-blur-heavy));
  border-radius: var(--claude-radius);
  border: 1px solid var(--claude-border-light);
  box-shadow: var(--claude-shadow-lg), inset 0 1px 0 rgba(255, 255, 255, 0.1), inset 0 -1px 0 rgba(0, 0, 0, 0.1);
  display: flex;
  flex-direction: column;
  z-index: 99999;
  font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
  font-size: 14px;
  color: var(--claude-text);
  overflow: hidden;
}

.claude-panel::before {
  content: '';
  position: absolute;
  inset: 0;
  background: linear-gradient(180deg, rgba(254, 154, 0, 0.04) 0%, transparent 30%, transparent 70%, rgba(251, 191, 36, 0.02) 100%);
  pointer-events: none;
  border-radius: inherit;
}

.claude-panel-dragging,
.claude-panel-resizing {
  transition: none !important;
  user-select: none;
}

.claude-panel-dragging {
  cursor: grabbing;
}

/* Resize edges */
.claude-resize-edge {
  position: absolute;
  z-index: 100;
}

.claude-resize-n {
  top: 0;
  left: 16px;
  right: 16px;
  height: 8px;
  cursor: ns-resize;
}

.claude-resize-s {
  bottom: 0;
  left: 16px;
  right: 16px;
  height: 8px;
  cursor: ns-resize;
}

.claude-resize-e {
  right: 0;
  top: 16px;
  bottom: 16px;
  width: 8px;
  cursor: ew-resize;
}

.claude-resize-w {
  left: 0;
  top: 16px;
  bottom: 16px;
  width: 8px;
  cursor: ew-resize;
}

/* Resize corners */
.claude-resize-corner {
  position: absolute;
  width: 16px;
  height: 16px;
  z-index: 101;
}

.claude-resize-corner::before {
  content: '';
  position: absolute;
  width: 12px;
  height: 12px;
  opacity: 0;
  transition: opacity 0.2s ease;
}

.claude-resize-corner:hover::before,
.claude-resize-active::before {
  opacity: 1;
}

.claude-resize-nw {
  top: 0;
  left: 0;
  cursor: nwse-resize;
}

.claude-resize-ne {
  top: 0;
  right: 0;
  cursor: nesw-resize;
}

.claude-resize-sw {
  bottom: 0;
  left: 0;
  cursor: nesw-resize;
}

.claude-resize-se {
  bottom: 0;
  right: 0;
  cursor: nwse-resize;
}

.claude-resize-nw::before {
  top: 2px;
  left: 2px;
  border-top: 3px solid var(--claude-primary);
  border-left: 3px solid var(--claude-primary);
  border-radius: 4px 0 0 0;
  box-shadow: 0 0 10px var(--claude-primary-glow);
}

.claude-resize-ne::before {
  top: 2px;
  right: 2px;
  border-top: 3px solid var(--claude-primary);
  border-right: 3px solid var(--claude-primary);
  border-radius: 0 4px 0 0;
  box-shadow: 0 0 10px var(--claude-primary-glow);
}

.claude-resize-sw::before {
  bottom: 2px;
  left: 2px;
  border-bottom: 3px solid var(--claude-primary);
  border-left: 3px solid var(--claude-primary);
  border-radius: 0 0 0 4px;
  box-shadow: 0 0 10px var(--claude-primary-glow);
}

.claude-resize-se::before {
  bottom: 2px;
  right: 2px;
  border-bottom: 3px solid var(--claude-primary);
  border-right: 3px solid var(--claude-primary);
  border-radius: 0 0 4px 0;
  box-shadow: 0 0 10px var(--claude-primary-glow);
}

/* Mobile drag bumper */
.claude-drag-bumper {
  display: none;
}

.claude-drag-handle-bar {
  display: none;
}

/* Transitions */
.claude-slide-enter-active,
.claude-slide-leave-active {
  transition: all 0.35s cubic-bezier(0.4, 0, 0.2, 1);
}

.claude-slide-enter-from,
.claude-slide-leave-to {
  opacity: 0;
  transform: scale(0.3);
}

/* Mobile */
@media (max-width: 640px) {
  .claude-panel {
    bottom: 0 !important;
    left: 0 !important;
    right: 0 !important;
    top: auto !important;
    width: 100% !important;
    max-width: 100%;
    height: 96dvh !important;
    max-height: 96dvh;
    min-height: auto;
    min-width: auto;
    border-radius: var(--claude-radius) var(--claude-radius) 0 0;
    transform-origin: bottom center;
  }

  .claude-slide-enter-from,
  .claude-slide-leave-to {
    opacity: 1;
    transform: translateY(100%);
  }

  .claude-slide-enter-active,
  .claude-slide-leave-active {
    transition: transform 0.35s cubic-bezier(0.4, 0, 0.2, 1);
  }

  .claude-drag-bumper {
    display: flex;
    align-items: center;
    justify-content: center;
    width: 100%;
    padding: 10px 20px;
    background: rgba(255, 255, 255, 0.06);
    border-bottom: 1px solid rgba(255, 255, 255, 0.08);
    cursor: grab;
    touch-action: none;
    user-select: none;
    flex-shrink: 0;
  }

  .claude-drag-bumper:active {
    cursor: grabbing;
    background: rgba(255, 255, 255, 0.1);
  }

  .claude-drag-handle-bar {
    display: block;
    width: 40px;
    height: 4px;
    background: rgba(255, 255, 255, 0.35);
    border-radius: 2px;
  }
}
</style>
