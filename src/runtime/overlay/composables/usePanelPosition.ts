import { ref } from 'vue'

export type PanelAnchor = 'br' | 'bl' | 'tr' | 'tl'

export interface PanelPositionOptions {
  storageKey?: string
  defaultBadgePos?: { x: number, y: number }
  defaultSize?: { width: number, height: number }
  minSize?: { width: number, height: number }
  padding?: number
  badgeDimensions?: { width: number, height: number }
}

const DEFAULTS = {
  storageKey: 'claude-overlay-panel-state',
  badgePos: { x: 24, y: 24 },
  size: { width: 440, height: 600 },
  minSize: { width: 320, height: 400 },
  padding: 20,
  badgeDimensions: { width: 100, height: 40 },
}

export function usePanelPosition(options: PanelPositionOptions = {}) {
  const config = {
    storageKey: options.storageKey ?? DEFAULTS.storageKey,
    minSize: options.minSize ?? DEFAULTS.minSize,
    padding: options.padding ?? DEFAULTS.padding,
    badgeDimensions: options.badgeDimensions ?? DEFAULTS.badgeDimensions,
  }

  // State
  const badgePos = ref(options.defaultBadgePos ?? { ...DEFAULTS.badgePos })
  const panelSize = ref(options.defaultSize ?? { ...DEFAULTS.size })
  const panelScreenPos = ref({ left: 0, top: 0 })
  const panelAnchor = ref<PanelAnchor>('br')

  // Persistence
  function load() {
    try {
      const saved = localStorage.getItem(config.storageKey)
      if (saved) {
        const parsed = JSON.parse(saved)
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
    catch { /* ignore */ }
  }

  function save() {
    try {
      localStorage.setItem(config.storageKey, JSON.stringify({
        x: badgePos.value.x,
        y: badgePos.value.y,
        width: panelSize.value.width,
        height: panelSize.value.height,
        anchor: panelAnchor.value,
      }))
    }
    catch { /* ignore */ }
  }

  // Calculate badge corners from badge position (right/bottom CSS positioning)
  function getBadgeCorners() {
    const vw = window.innerWidth
    const vh = window.innerHeight
    const { width: bw, height: bh } = config.badgeDimensions

    const right = vw - badgePos.value.x
    const left = right - bw
    const bottom = vh - badgePos.value.y
    const top = bottom - bh

    return { left, right, top, bottom, centerX: left + bw / 2, centerY: top + bh / 2 }
  }

  // Calculate best anchor based on badge position
  function calculateAnchor(pos: { x: number, y: number }): PanelAnchor {
    const vw = window.innerWidth
    const vh = window.innerHeight
    const { width: bw, height: bh } = config.badgeDimensions

    const badgeRight = vw - pos.x
    const badgeLeft = badgeRight - bw
    const badgeBottom = vh - pos.y
    const badgeTop = badgeBottom - bh

    const centerX = badgeLeft + bw / 2
    const centerY = badgeTop + bh / 2

    const moreSpaceLeft = centerX > vw / 2
    const moreSpaceAbove = centerY > vh / 2

    if (moreSpaceLeft && moreSpaceAbove) return 'br'
    if (!moreSpaceLeft && moreSpaceAbove) return 'bl'
    if (moreSpaceLeft && !moreSpaceAbove) return 'tr'
    return 'tl'
  }

  // Open panel - calculate position and constrain size
  function openPanel() {
    const vw = window.innerWidth
    const vh = window.innerHeight
    const { padding, minSize } = config
    const badge = getBadgeCorners()
    const anchor = panelAnchor.value

    // Calculate available space
    const maxWidth = (anchor === 'br' || anchor === 'tr')
      ? badge.right - padding
      : vw - badge.left - padding

    const maxHeight = (anchor === 'br' || anchor === 'bl')
      ? badge.bottom - padding
      : vh - badge.top - padding

    // Constrain size
    panelSize.value.width = Math.max(minSize.width, Math.min(panelSize.value.width, maxWidth))
    panelSize.value.height = Math.max(minSize.height, Math.min(panelSize.value.height, maxHeight))

    // Calculate panel position based on anchor
    const positions: Record<PanelAnchor, { left: number, top: number }> = {
      br: { left: badge.right - panelSize.value.width, top: badge.bottom - panelSize.value.height },
      bl: { left: badge.left, top: badge.bottom - panelSize.value.height },
      tr: { left: badge.right - panelSize.value.width, top: badge.top },
      tl: { left: badge.left, top: badge.top },
    }

    panelScreenPos.value = positions[anchor]
  }

  // Close panel - save badge position at anchor corner
  function closePanel() {
    const vw = window.innerWidth
    const vh = window.innerHeight
    const anchor = panelAnchor.value
    const { width: bw, height: bh } = config.badgeDimensions
    const { left, top } = panelScreenPos.value
    const { width, height } = panelSize.value

    // Calculate badge edge positions based on anchor
    const edgePositions: Record<PanelAnchor, { right: number, bottom: number }> = {
      br: { right: left + width, bottom: top + height },
      bl: { right: left + bw, bottom: top + height },
      tr: { right: left + width, bottom: top + bh },
      tl: { right: left + bw, bottom: top + bh },
    }

    const edges = edgePositions[anchor]
    badgePos.value = { x: vw - edges.right, y: vh - edges.bottom }

    save()
  }

  // Handle badge drag end - update position and recalculate anchor
  function onBadgeDragEnd(pos: { x: number, y: number }) {
    badgePos.value = { x: pos.x, y: pos.y }
    panelAnchor.value = calculateAnchor(pos)
    save()
  }

  // Get CSS style for panel
  function getPanelStyle() {
    const origins: Record<PanelAnchor, string> = {
      br: 'bottom right',
      bl: 'bottom left',
      tr: 'top right',
      tl: 'top left',
    }

    return {
      left: `${panelScreenPos.value.left}px`,
      top: `${panelScreenPos.value.top}px`,
      width: `${panelSize.value.width}px`,
      height: `${panelSize.value.height}px`,
      transformOrigin: origins[panelAnchor.value],
    }
  }

  return {
    // State
    badgePos,
    panelSize,
    panelScreenPos,
    panelAnchor,

    // Methods
    load,
    save,
    openPanel,
    closePanel,
    onBadgeDragEnd,
    getPanelStyle,
  }
}
