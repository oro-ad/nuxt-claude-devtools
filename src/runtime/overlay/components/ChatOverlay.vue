<script lang="ts" setup>
import { computed, nextTick, onMounted, onUnmounted, ref, watch } from 'vue'
import { useClaudeChat } from '../../shared/composables/useClaudeChat'
import { useVoiceInput } from '../../shared/composables/useVoiceInput'
import { useShare } from '../../shared/composables/useShare'
import type { SlashCommand } from '../../shared/types'
import { ChatHeader, ChatInput, ChatMessages, ClaudeBadge, HistoryPanel, NicknameModal } from './chat'

const props = defineProps<{
  socketUrl?: string
}>()

// ============================================================================
// CORE STATE
// ============================================================================

const isOpen = ref(false)
const isMobile = ref(false)
const chatInputRef = ref<InstanceType<typeof ChatInput> | null>(null)
const chatMessagesRef = ref<InstanceType<typeof ChatMessages> | null>(null)

// ============================================================================
// PANEL POSITION & SIZE
// ============================================================================

const PANEL_STORAGE_KEY = 'claude-overlay-panel-state'
const panelRef = ref<HTMLElement | null>(null)
const headerRef = ref<HTMLElement | null>(null)

// Badge position stored as distance from right/bottom edges
const badgePos = ref({ x: 24, y: 24 })

// Panel dimensions
const panelSize = ref({ width: 440, height: 600 })

// Panel screen position (left, top) - used only when panel is open
const panelScreenPos = ref({ left: 0, top: 0 })

// Anchor direction: determines which corner of panel touches badge
// 'br' = bottom-right corner at badge (panel opens left & up)
// 'bl' = bottom-left corner at badge (panel opens right & up)
// 'tr' = top-right corner at badge (panel opens left & down)
// 'tl' = top-left corner at badge (panel opens right & down)
const panelAnchor = ref<'br' | 'bl' | 'tr' | 'tl'>('br')

const isPanelDragging = ref(false)
const isPanelResizing = ref(false)
const activeResizeEdge = ref<string | null>(null)
const panelDragStart = ref({ x: 0, y: 0, panelX: 0, panelY: 0 })
const panelResizeStart = ref({ x: 0, y: 0, width: 0, height: 0, panelX: 0, panelY: 0 })

// Hovered edge for resize indicators
const hoveredEdge = ref<string | null>(null)
const EDGE_THRESHOLD = 12

function checkMobile() {
  isMobile.value = window.innerWidth <= 640
}

function loadPanelState() {
  try {
    const saved = localStorage.getItem(PANEL_STORAGE_KEY)
    if (saved) {
      const parsed = JSON.parse(saved)
      // Replace whole objects to trigger reactivity
      if (parsed.x !== undefined && parsed.y !== undefined) {
        badgePos.value = { x: parsed.x, y: parsed.y }
      }
      if (parsed.width !== undefined && parsed.height !== undefined) {
        panelSize.value = { width: parsed.width, height: parsed.height }
      }
      if (parsed.anchor) {
        panelAnchor.value = parsed.anchor
      }
    }
  }
  catch { /* ignore */
  }
}

function savePanelState() {
  try {
    localStorage.setItem(PANEL_STORAGE_KEY, JSON.stringify({
      x: badgePos.value.x,
      y: badgePos.value.y,
      width: panelSize.value.width,
      height: panelSize.value.height,
      anchor: panelAnchor.value,
    }))
  }
  catch { /* ignore */
  }
}

// Open panel using saved anchor direction, constrain size if needed
function openPanel() {
  const vw = window.innerWidth
  const vh = window.innerHeight
  const padding = 20
  const minWidth = 320
  const minHeight = 400
  const badgeWidth = 100
  const badgeHeight = 40

  // Badge corner positions (badge uses right/bottom CSS positioning)
  const badgeRight = vw - badgePos.value.x
  const badgeLeft = badgeRight - badgeWidth
  const badgeBottom = vh - badgePos.value.y
  const badgeTop = badgeBottom - badgeHeight

  // Use saved anchor direction (don't recalculate)
  const anchor = panelAnchor.value

  // Calculate available space and constrain panel size
  let maxWidth: number
  let maxHeight: number

  if (anchor === 'br' || anchor === 'tr') {
    // Panel opens to the left
    maxWidth = badgeRight - padding
  }
  else {
    // Panel opens to the right
    maxWidth = vw - badgeLeft - padding
  }

  if (anchor === 'br' || anchor === 'bl') {
    // Panel opens upward
    maxHeight = badgeBottom - padding
  }
  else {
    // Panel opens downward
    maxHeight = vh - badgeTop - padding
  }

  // Constrain size
  panelSize.value.width = Math.max(minWidth, Math.min(panelSize.value.width, maxWidth))
  panelSize.value.height = Math.max(minHeight, Math.min(panelSize.value.height, maxHeight))

  // Calculate panel screen position (left, top)
  // The anchor corner of the panel should touch the corresponding badge corner
  if (anchor === 'br') {
    // Panel's bottom-right at badge's bottom-right
    panelScreenPos.value.left = badgeRight - panelSize.value.width
    panelScreenPos.value.top = badgeBottom - panelSize.value.height
  }
  else if (anchor === 'bl') {
    // Panel's bottom-left at badge's bottom-left
    panelScreenPos.value.left = badgeLeft
    panelScreenPos.value.top = badgeBottom - panelSize.value.height
  }
  else if (anchor === 'tr') {
    // Panel's top-right at badge's top-right
    panelScreenPos.value.left = badgeRight - panelSize.value.width
    panelScreenPos.value.top = badgeTop
  }
  else {
    // tl: Panel's top-left at badge's top-left
    panelScreenPos.value.left = badgeLeft
    panelScreenPos.value.top = badgeTop
  }
}

// Save panel position on close - anchor corner becomes new badge position
function closePanel() {
  const vw = window.innerWidth
  const vh = window.innerHeight
  const anchor = panelAnchor.value
  const badgeWidth = 100

  // Get the anchor corner's screen position
  // This is where the badge's corresponding corner should be
  let badgeRightEdge: number
  let badgeBottomEdge: number

  if (anchor === 'br') {
    // Panel's bottom-right corner - badge right edge here
    badgeRightEdge = panelScreenPos.value.left + panelSize.value.width
    badgeBottomEdge = panelScreenPos.value.top + panelSize.value.height
  }
  else if (anchor === 'bl') {
    // Panel's bottom-left corner - badge left edge here, so right edge is + badgeWidth
    badgeRightEdge = panelScreenPos.value.left + badgeWidth
    badgeBottomEdge = panelScreenPos.value.top + panelSize.value.height
  }
  else if (anchor === 'tr') {
    // Panel's top-right corner
    badgeRightEdge = panelScreenPos.value.left + panelSize.value.width
    badgeBottomEdge = panelScreenPos.value.top + 40 // badgeHeight
  }
  else {
    // tl: Panel's top-left corner
    badgeRightEdge = panelScreenPos.value.left + badgeWidth
    badgeBottomEdge = panelScreenPos.value.top + 40 // badgeHeight
  }

  // Convert to right/bottom distance for badge CSS positioning
  badgePos.value.x = vw - badgeRightEdge
  badgePos.value.y = vh - badgeBottomEdge

  savePanelState()
}

function getPanelStyle() {
  if (isMobile.value) return {}

  return {
    left: `${panelScreenPos.value.left}px`,
    top: `${panelScreenPos.value.top}px`,
    width: `${panelSize.value.width}px`,
    height: `${panelSize.value.height}px`,
    transformOrigin: getTransformOrigin(),
  }
}

function getTransformOrigin() {
  const anchor = panelAnchor.value
  if (anchor === 'br') return 'bottom right'
  if (anchor === 'bl') return 'bottom left'
  if (anchor === 'tr') return 'top right'
  return 'top left'
}

// Panel dragging - simple screen coordinates
function handlePanelDragStart(e: MouseEvent) {
  if (isMobile.value) return
  e.preventDefault()

  panelDragStart.value = {
    x: e.clientX,
    y: e.clientY,
    panelX: panelScreenPos.value.left,
    panelY: panelScreenPos.value.top,
  }
  isPanelDragging.value = true

  window.addEventListener('mousemove', handlePanelDragMove)
  window.addEventListener('mouseup', handlePanelDragEnd)
}

function handlePanelDragMove(e: MouseEvent) {
  if (!isPanelDragging.value) return

  const vw = window.innerWidth
  const vh = window.innerHeight
  const padding = 20

  const deltaX = e.clientX - panelDragStart.value.x
  const deltaY = e.clientY - panelDragStart.value.y

  let newLeft = panelDragStart.value.panelX + deltaX
  let newTop = panelDragStart.value.panelY + deltaY

  // Constrain to viewport
  newLeft = Math.max(padding, Math.min(vw - panelSize.value.width - padding, newLeft))
  newTop = Math.max(padding, Math.min(vh - panelSize.value.height - padding, newTop))

  panelScreenPos.value.left = newLeft
  panelScreenPos.value.top = newTop
}

function handlePanelDragEnd() {
  isPanelDragging.value = false
  window.removeEventListener('mousemove', handlePanelDragMove)
  window.removeEventListener('mouseup', handlePanelDragEnd)
}

// Panel resizing - simple, edges move naturally
function handlePanelResizeStart(edge: string, e: MouseEvent) {
  if (isMobile.value) return
  e.preventDefault()
  e.stopPropagation()

  activeResizeEdge.value = edge
  panelResizeStart.value = {
    x: e.clientX,
    y: e.clientY,
    width: panelSize.value.width,
    height: panelSize.value.height,
    panelX: panelScreenPos.value.left,
    panelY: panelScreenPos.value.top,
  }
  isPanelResizing.value = true

  window.addEventListener('mousemove', handlePanelResizeMove)
  window.addEventListener('mouseup', handlePanelResizeEnd)
}

function handlePanelResizeMove(e: MouseEvent) {
  if (!isPanelResizing.value || !activeResizeEdge.value) return

  const edge = activeResizeEdge.value
  const vw = window.innerWidth
  const vh = window.innerHeight
  const minWidth = 320
  const minHeight = 400
  const padding = 20

  const deltaX = e.clientX - panelResizeStart.value.x
  const deltaY = e.clientY - panelResizeStart.value.y

  let newWidth = panelResizeStart.value.width
  let newHeight = panelResizeStart.value.height
  let newLeft = panelResizeStart.value.panelX
  let newTop = panelResizeStart.value.panelY

  // West edge: move left side, change width
  if (edge.includes('w')) {
    newLeft = panelResizeStart.value.panelX + deltaX
    newWidth = panelResizeStart.value.width - deltaX
  }

  // East edge: change width only
  if (edge.includes('e')) {
    newWidth = panelResizeStart.value.width + deltaX
  }

  // North edge: move top side, change height
  if (edge.includes('n')) {
    newTop = panelResizeStart.value.panelY + deltaY
    newHeight = panelResizeStart.value.height - deltaY
  }

  // South edge: change height only
  if (edge.includes('s')) {
    newHeight = panelResizeStart.value.height + deltaY
  }

  // Apply minimum size constraints
  if (newWidth < minWidth) {
    if (edge.includes('w')) {
      newLeft = panelResizeStart.value.panelX + panelResizeStart.value.width - minWidth
    }
    newWidth = minWidth
  }
  if (newHeight < minHeight) {
    if (edge.includes('n')) {
      newTop = panelResizeStart.value.panelY + panelResizeStart.value.height - minHeight
    }
    newHeight = minHeight
  }

  // Apply viewport constraints
  newLeft = Math.max(padding, newLeft)
  newTop = Math.max(padding, newTop)
  if (newLeft + newWidth > vw - padding) {
    newWidth = vw - padding - newLeft
  }
  if (newTop + newHeight > vh - padding) {
    newHeight = vh - padding - newTop
  }

  panelScreenPos.value.left = newLeft
  panelScreenPos.value.top = newTop
  panelSize.value.width = newWidth
  panelSize.value.height = newHeight
}

function handlePanelResizeEnd() {
  isPanelResizing.value = false
  activeResizeEdge.value = null
  window.removeEventListener('mousemove', handlePanelResizeMove)
  window.removeEventListener('mouseup', handlePanelResizeEnd)
}

// Edge hover detection
function handlePanelMouseMove(e: MouseEvent) {
  if (isMobile.value || isPanelResizing.value || isPanelDragging.value) return
  if (!panelRef.value) return

  const rect = panelRef.value.getBoundingClientRect()
  const x = e.clientX - rect.left
  const y = e.clientY - rect.top
  const w = rect.width
  const h = rect.height

  const nearLeft = x < EDGE_THRESHOLD
  const nearRight = x > w - EDGE_THRESHOLD
  const nearTop = y < EDGE_THRESHOLD
  const nearBottom = y > h - EDGE_THRESHOLD

  if (nearTop && nearLeft) hoveredEdge.value = 'nw'
  else if (nearTop && nearRight) hoveredEdge.value = 'ne'
  else if (nearBottom && nearLeft) hoveredEdge.value = 'sw'
  else if (nearBottom && nearRight) hoveredEdge.value = 'se'
  else if (nearTop) hoveredEdge.value = 'n'
  else if (nearBottom) hoveredEdge.value = 's'
  else if (nearLeft) hoveredEdge.value = 'w'
  else if (nearRight) hoveredEdge.value = 'e'
  else hoveredEdge.value = null
}

function handlePanelMouseLeave() {
  if (!isPanelResizing.value) {
    hoveredEdge.value = null
  }
}

const resizeCursor = computed(() => {
  const edge = hoveredEdge.value || activeResizeEdge.value
  if (!edge) return 'default'
  const cursors: Record<string, string> = {
    n: 'ns-resize', s: 'ns-resize',
    e: 'ew-resize', w: 'ew-resize',
    ne: 'nesw-resize', sw: 'nesw-resize',
    nw: 'nwse-resize', se: 'nwse-resize',
  }
  return cursors[edge] || 'default'
})

// ============================================================================
// BADGE POSITION (synced with panel)
// ============================================================================

function handleBadgeDragEnd(position: { x: number, y: number }) {
  badgePos.value.x = position.x
  badgePos.value.y = position.y

  // Recalculate best anchor direction based on new badge position
  const vw = window.innerWidth
  const vh = window.innerHeight
  const badgeWidth = 100
  const badgeHeight = 40

  const badgeRight = vw - position.x
  const badgeLeft = badgeRight - badgeWidth
  const badgeBottom = vh - position.y
  const badgeTop = badgeBottom - badgeHeight

  const badgeCenterX = badgeLeft + badgeWidth / 2
  const badgeCenterY = badgeTop + badgeHeight / 2

  const moreSpaceOnLeft = badgeCenterX > vw / 2
  const moreSpaceAbove = badgeCenterY > vh / 2

  if (moreSpaceOnLeft && moreSpaceAbove) {
    panelAnchor.value = 'br'
  }
  else if (!moreSpaceOnLeft && moreSpaceAbove) {
    panelAnchor.value = 'bl'
  }
  else if (moreSpaceOnLeft && !moreSpaceAbove) {
    panelAnchor.value = 'tr'
  }
  else {
    panelAnchor.value = 'tl'
  }

  savePanelState()
}

// ============================================================================
// MOBILE SWIPE TO CLOSE
// ============================================================================

const swipeStartY = ref(0)
const swipeDeltaY = ref(0)
const isSwiping = ref(false)
const isSwipeClosing = ref(false)
const SWIPE_THRESHOLD = 100

function handleSwipeStart(e: TouchEvent | MouseEvent) {
  if (window.innerWidth > 640) return
  const clientY = 'touches' in e ? e.touches[0].clientY : e.clientY
  swipeStartY.value = clientY
  swipeDeltaY.value = 0
  isSwiping.value = true

  if (!('touches' in e)) {
    window.addEventListener('mousemove', handleSwipeMove)
    window.addEventListener('mouseup', handleSwipeEnd)
  }
}

function handleSwipeMove(e: TouchEvent | MouseEvent) {
  if (!isSwiping.value || window.innerWidth > 640) return

  const clientY = 'touches' in e ? e.touches[0].clientY : e.clientY
  const delta = clientY - swipeStartY.value

  if (delta > 0) {
    e.preventDefault()
    swipeDeltaY.value = delta
    if (panelRef.value) {
      panelRef.value.style.transform = `translateY(${delta}px)`
      panelRef.value.style.transition = 'none'
    }
  }
}

function handleSwipeEnd() {
  if (!isSwiping.value || window.innerWidth > 640) return

  window.removeEventListener('mousemove', handleSwipeMove)
  window.removeEventListener('mouseup', handleSwipeEnd)

  isSwiping.value = false

  if (panelRef.value) {
    panelRef.value.style.transition = 'transform 0.3s ease-out'

    if (swipeDeltaY.value > SWIPE_THRESHOLD) {
      isSwipeClosing.value = true
      panelRef.value.style.transform = 'translateY(100%)'
      setTimeout(() => {
        isOpen.value = false
        lockBodyScroll(false)
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
      panelRef.value.style.transform = 'translateY(0)'
      setTimeout(() => {
        if (panelRef.value) {
          panelRef.value.style.transition = ''
        }
      }, 300)
    }
  }

  swipeDeltaY.value = 0
}

// ============================================================================
// CHAT LOGIC
// ============================================================================

const commands = ref<SlashCommand[]>([])
const showHistory = ref(false)

// Sharing
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
  getTunnelUrl: () => props.socketUrl || null,
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

// Context chips
const contextEnabled = ref({
  viewport: true,
  userAgent: true,
  routing: true,
})

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

function handleMessageSubmit(message: string) {
  if (needsNicknameForMessage()) {
    pendingNicknameAction.value = 'message'
    showNicknameModal.value = true
    return
  }

  const context = collectContext()
  const messageWithContext = context ? context + message : message
  sendChatMessage(messageWithContext, isShareMode.value ? userId.value || undefined : undefined, nickname.value || undefined)
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
  const success = await copyShareLink()
  if (success) {
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
  else if (pendingNicknameAction.value === 'message') {
    // Will need to re-trigger submit - for now just close modal
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

// ============================================================================
// UI HELPERS
// ============================================================================

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

function handleClose() {
  closePanel()
  isOpen.value = false
  lockBodyScroll(false)
}

function toggleOverlay() {
  if (!isOpen.value) {
    // Opening
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
    if (open && headerRef.value) {
      headerRef.value.addEventListener('touchmove', handleSwipeMove as EventListener, { passive: false })
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
  if (headerRef.value) {
    headerRef.value.removeEventListener('touchmove', handleSwipeMove as EventListener)
  }
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
      @drag-end="handleBadgeDragEnd"
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
        :style="[getPanelStyle(), { cursor: resizeCursor }]"
        @keydown="handleKeydown"
        @mouseleave="handlePanelMouseLeave"
        @mousemove="handlePanelMouseMove"
      >
        <!-- Resize edges -->
        <template v-if="!isMobile">
          <div
            class="claude-resize-edge claude-resize-n"
            @mousedown="(e) => handlePanelResizeStart('n', e)"
          />
          <div
            class="claude-resize-edge claude-resize-s"
            @mousedown="(e) => handlePanelResizeStart('s', e)"
          />
          <div
            class="claude-resize-edge claude-resize-e"
            @mousedown="(e) => handlePanelResizeStart('e', e)"
          />
          <div
            class="claude-resize-edge claude-resize-w"
            @mousedown="(e) => handlePanelResizeStart('w', e)"
          />
          <div
            :class="['claude-resize-corner', 'claude-resize-nw', { 'claude-resize-active': hoveredEdge === 'nw' || activeResizeEdge === 'nw' }]"
            @mousedown="(e) => handlePanelResizeStart('nw', e)"
          />
          <div
            :class="['claude-resize-corner', 'claude-resize-ne', { 'claude-resize-active': hoveredEdge === 'ne' || activeResizeEdge === 'ne' }]"
            @mousedown="(e) => handlePanelResizeStart('ne', e)"
          />
          <div
            :class="['claude-resize-corner', 'claude-resize-sw', { 'claude-resize-active': hoveredEdge === 'sw' || activeResizeEdge === 'sw' }]"
            @mousedown="(e) => handlePanelResizeStart('sw', e)"
          />
          <div
            :class="['claude-resize-corner', 'claude-resize-se', { 'claude-resize-active': hoveredEdge === 'se' || activeResizeEdge === 'se' }]"
            @mousedown="(e) => handlePanelResizeStart('se', e)"
          />
        </template>

        <!-- Mobile drag bumper -->
        <div
          v-if="isMobile"
          ref="headerRef"
          class="claude-drag-bumper"
          @mousedown="handleSwipeStart"
          @touchend="handleSwipeEnd"
          @touchstart="handleSwipeStart"
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
  backdrop-filter: blur(8px);
  -webkit-backdrop-filter: blur(8px);
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
  box-shadow: var(--claude-shadow-lg),
  inset 0 1px 0 rgba(255, 255, 255, 0.1),
  inset 0 -1px 0 rgba(0, 0, 0, 0.1);
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
  transition: all 0.2s ease;
}

.claude-resize-corner::before {
  content: '';
  position: absolute;
  width: 0;
  height: 0;
  opacity: 0;
  transition: all 0.2s ease;
}

.claude-resize-corner:hover::before,
.claude-resize-active::before {
  opacity: 1;
}

.claude-resize-nw {
  top: 0;
  left: 0;
  cursor: nwse-resize;
  border-radius: var(--claude-radius) 0 0 0;
}

.claude-resize-nw::before {
  top: 2px;
  left: 2px;
  width: 12px;
  height: 12px;
  border-top: 3px solid var(--claude-primary);
  border-left: 3px solid var(--claude-primary);
  border-radius: 4px 0 0 0;
  box-shadow: 0 0 10px var(--claude-primary-glow);
}

.claude-resize-ne {
  top: 0;
  right: 0;
  cursor: nesw-resize;
  border-radius: 0 var(--claude-radius) 0 0;
}

.claude-resize-ne::before {
  top: 2px;
  right: 2px;
  width: 12px;
  height: 12px;
  border-top: 3px solid var(--claude-primary);
  border-right: 3px solid var(--claude-primary);
  border-radius: 0 4px 0 0;
  box-shadow: 0 0 10px var(--claude-primary-glow);
}

.claude-resize-sw {
  bottom: 0;
  left: 0;
  cursor: nesw-resize;
  border-radius: 0 0 0 var(--claude-radius);
}

.claude-resize-sw::before {
  bottom: 2px;
  left: 2px;
  width: 12px;
  height: 12px;
  border-bottom: 3px solid var(--claude-primary);
  border-left: 3px solid var(--claude-primary);
  border-radius: 0 0 0 4px;
  box-shadow: 0 0 10px var(--claude-primary-glow);
}

.claude-resize-se {
  bottom: 0;
  right: 0;
  cursor: nwse-resize;
  border-radius: 0 0 var(--claude-radius) 0;
}

.claude-resize-se::before {
  bottom: 2px;
  right: 2px;
  width: 12px;
  height: 12px;
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
