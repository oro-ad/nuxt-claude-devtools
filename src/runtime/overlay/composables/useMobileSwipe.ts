import { nextTick, ref, type Ref } from 'vue'

export interface MobileSwipeOptions {
  panelRef: Ref<HTMLElement | null>
  headerRef: Ref<HTMLElement | null>
  onSwipeClose: () => void
  threshold?: number
  mobileBreakpoint?: number
}

export function useMobileSwipe(options: MobileSwipeOptions) {
  const {
    panelRef,
    headerRef,
    onSwipeClose,
    threshold = 100,
    mobileBreakpoint = 640,
  } = options

  const touchStartY = ref(0)
  const touchDeltaY = ref(0)
  const isSwiping = ref(false)
  const isSwipeClosing = ref(false)

  function handleTouchStart(e: TouchEvent) {
    if (window.innerWidth > mobileBreakpoint) return

    touchStartY.value = e.touches[0].clientY
    touchDeltaY.value = 0
    isSwiping.value = true
  }

  function handleTouchMove(e: TouchEvent) {
    if (!isSwiping.value || window.innerWidth > mobileBreakpoint) return

    const currentY = e.touches[0].clientY
    const delta = currentY - touchStartY.value

    // Only allow swiping down (positive delta)
    if (delta > 0) {
      e.preventDefault()
      touchDeltaY.value = delta

      if (panelRef.value) {
        panelRef.value.style.transform = `translateY(${delta}px)`
        panelRef.value.style.transition = 'none'
      }
    }
  }

  function handleTouchEnd() {
    if (!isSwiping.value || window.innerWidth > mobileBreakpoint) return

    isSwiping.value = false

    if (panelRef.value) {
      panelRef.value.style.transition = 'transform 0.3s ease-out'

      if (touchDeltaY.value > threshold) {
        isSwipeClosing.value = true
        panelRef.value.style.transform = 'translateY(100%)'

        setTimeout(() => {
          onSwipeClose()
          // Reset styles after close - use nextTick to ensure DOM updates first
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

  // Must be called in watch(isOpen) with nextTick after open
  function setupTouchMoveListener() {
    if (headerRef.value) {
      headerRef.value.addEventListener('touchmove', handleTouchMove as EventListener, { passive: false })
    }
  }

  // Must be called in onUnmounted
  function cleanupTouchMoveListener() {
    if (headerRef.value) {
      headerRef.value.removeEventListener('touchmove', handleTouchMove as EventListener)
    }
  }

  return {
    isSwipeClosing,
    handleTouchStart,
    handleTouchEnd,
    setupTouchMoveListener,
    cleanupTouchMoveListener,
  }
}
