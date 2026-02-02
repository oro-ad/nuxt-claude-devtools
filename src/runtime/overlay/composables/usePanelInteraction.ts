import { computed, ref, type Ref } from 'vue'

export interface PanelInteractionOptions {
  panelScreenPos: Ref<{ left: number, top: number }>
  panelSize: Ref<{ width: number, height: number }>
  panelRef: Ref<HTMLElement | null>
  isMobile: Ref<boolean>
  minSize?: { width: number, height: number }
  padding?: number
  edgeThreshold?: number
}

const DEFAULTS = {
  minSize: { width: 320, height: 400 },
  padding: 20,
  edgeThreshold: 12,
}

export function usePanelInteraction(options: PanelInteractionOptions) {
  const {
    panelScreenPos,
    panelSize,
    panelRef,
    isMobile,
    minSize = DEFAULTS.minSize,
    padding = DEFAULTS.padding,
    edgeThreshold = DEFAULTS.edgeThreshold,
  } = options

  // Drag state
  const isDragging = ref(false)
  const dragStart = ref({ x: 0, y: 0, panelX: 0, panelY: 0 })

  // Resize state
  const isResizing = ref(false)
  const activeEdge = ref<string | null>(null)
  const resizeStart = ref({ x: 0, y: 0, width: 0, height: 0, panelX: 0, panelY: 0 })

  // Hover state for resize indicators
  const hoveredEdge = ref<string | null>(null)

  // Computed cursor based on hovered/active edge
  const cursor = computed(() => {
    const edge = hoveredEdge.value || activeEdge.value
    if (!edge) return 'default'

    const cursors: Record<string, string> = {
      n: 'ns-resize',
      s: 'ns-resize',
      e: 'ew-resize',
      w: 'ew-resize',
      ne: 'nesw-resize',
      sw: 'nesw-resize',
      nw: 'nwse-resize',
      se: 'nwse-resize',
    }
    return cursors[edge] || 'default'
  })

  // Drag handlers
  function startDrag(e: MouseEvent) {
    if (isMobile.value) return
    e.preventDefault()

    dragStart.value = {
      x: e.clientX,
      y: e.clientY,
      panelX: panelScreenPos.value.left,
      panelY: panelScreenPos.value.top,
    }
    isDragging.value = true

    window.addEventListener('mousemove', onDragMove)
    window.addEventListener('mouseup', endDrag)
  }

  function onDragMove(e: MouseEvent) {
    if (!isDragging.value) return

    const vw = window.innerWidth
    const vh = window.innerHeight

    const deltaX = e.clientX - dragStart.value.x
    const deltaY = e.clientY - dragStart.value.y

    let newLeft = dragStart.value.panelX + deltaX
    let newTop = dragStart.value.panelY + deltaY

    // Constrain to viewport
    newLeft = Math.max(padding, Math.min(vw - panelSize.value.width - padding, newLeft))
    newTop = Math.max(padding, Math.min(vh - panelSize.value.height - padding, newTop))

    panelScreenPos.value.left = newLeft
    panelScreenPos.value.top = newTop
  }

  function endDrag() {
    isDragging.value = false
    window.removeEventListener('mousemove', onDragMove)
    window.removeEventListener('mouseup', endDrag)
  }

  // Resize handlers
  function startResize(edge: string, e: MouseEvent) {
    if (isMobile.value) return
    e.preventDefault()
    e.stopPropagation()

    activeEdge.value = edge
    resizeStart.value = {
      x: e.clientX,
      y: e.clientY,
      width: panelSize.value.width,
      height: panelSize.value.height,
      panelX: panelScreenPos.value.left,
      panelY: panelScreenPos.value.top,
    }
    isResizing.value = true

    window.addEventListener('mousemove', onResizeMove)
    window.addEventListener('mouseup', endResize)
  }

  function onResizeMove(e: MouseEvent) {
    if (!isResizing.value || !activeEdge.value) return

    const edge = activeEdge.value
    const vw = window.innerWidth
    const vh = window.innerHeight

    const deltaX = e.clientX - resizeStart.value.x
    const deltaY = e.clientY - resizeStart.value.y

    let newWidth = resizeStart.value.width
    let newHeight = resizeStart.value.height
    let newLeft = resizeStart.value.panelX
    let newTop = resizeStart.value.panelY

    // West edge
    if (edge.includes('w')) {
      newLeft = resizeStart.value.panelX + deltaX
      newWidth = resizeStart.value.width - deltaX
    }

    // East edge
    if (edge.includes('e')) {
      newWidth = resizeStart.value.width + deltaX
    }

    // North edge
    if (edge.includes('n')) {
      newTop = resizeStart.value.panelY + deltaY
      newHeight = resizeStart.value.height - deltaY
    }

    // South edge
    if (edge.includes('s')) {
      newHeight = resizeStart.value.height + deltaY
    }

    // Apply minimum size constraints
    if (newWidth < minSize.width) {
      if (edge.includes('w')) {
        newLeft = resizeStart.value.panelX + resizeStart.value.width - minSize.width
      }
      newWidth = minSize.width
    }

    if (newHeight < minSize.height) {
      if (edge.includes('n')) {
        newTop = resizeStart.value.panelY + resizeStart.value.height - minSize.height
      }
      newHeight = minSize.height
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

  function endResize() {
    isResizing.value = false
    activeEdge.value = null
    window.removeEventListener('mousemove', onResizeMove)
    window.removeEventListener('mouseup', endResize)
  }

  // Edge hover detection
  function onMouseMove(e: MouseEvent) {
    if (isMobile.value || isResizing.value || isDragging.value) return
    if (!panelRef.value) return

    const rect = panelRef.value.getBoundingClientRect()
    const x = e.clientX - rect.left
    const y = e.clientY - rect.top
    const w = rect.width
    const h = rect.height

    const nearLeft = x < edgeThreshold
    const nearRight = x > w - edgeThreshold
    const nearTop = y < edgeThreshold
    const nearBottom = y > h - edgeThreshold

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

  function onMouseLeave() {
    if (!isResizing.value) {
      hoveredEdge.value = null
    }
  }

  return {
    // State
    isDragging,
    isResizing,
    activeEdge,
    hoveredEdge,
    cursor,

    // Drag methods
    startDrag,

    // Resize methods
    startResize,

    // Mouse handlers
    onMouseMove,
    onMouseLeave,
  }
}
