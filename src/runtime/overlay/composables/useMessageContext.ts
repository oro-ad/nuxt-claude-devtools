/**
 * useMessageContext composable for Overlay
 * Uses shared core with simple window-based context collection
 */
import { useMessageContext as useMessageContextCore } from '../../shared/composables/useMessageContext'
import type { RouteInfo } from '../../shared/composables/useMessageContext'

/**
 * Simple overlay version - uses window directly
 */
export function useMessageContext() {
  /**
   * Get viewport from current window
   */
  function getViewport(): { width: number, height: number } | null {
    if (typeof window === 'undefined') return null
    return {
      width: window.innerWidth,
      height: window.innerHeight,
    }
  }

  /**
   * Get route from current window location
   */
  function getRoute(): RouteInfo | null {
    if (typeof window === 'undefined') return null

    // Parse query params from URL
    const searchParams = new URLSearchParams(window.location.search)
    const query: Record<string, string> = {}
    searchParams.forEach((value, key) => {
      query[key] = value
    })

    return {
      path: window.location.pathname,
      fullPath: window.location.pathname + window.location.search,
      query: Object.keys(query).length > 0 ? query : undefined,
    }
  }

  return useMessageContextCore({
    getViewport,
    getRoute,
    // Overlay doesn't have component selection
    getComponents: () => [],
  })
}

// Re-export types
export type { ContextChip, MessageContextData, RouteInfo } from '../../shared/composables/useMessageContext'
