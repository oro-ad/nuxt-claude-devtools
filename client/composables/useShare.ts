/**
 * useShare composable for DevTools Client
 * Uses shared core with DevTools-specific URL parameter handling
 */
import { useShare as useShareCore } from '@shared/composables/useShare'

interface DevToolsShareOptions {
  getTunnelUrl?: () => { isActive: boolean, origin: string | null }
  getHostRoute?: () => { query?: Record<string, string | string[] | undefined> } | undefined
}

export function useShare(options: DevToolsShareOptions = {}) {
  /**
   * Get URL parameter from multiple sources (DevTools iframe context)
   * Checks: current window → host route → parent window
   */
  function getUrlParam(param: string): string | null {
    if (typeof window === 'undefined') return null

    // First check current window
    let params = new URLSearchParams(window.location.search)
    let value = params.get(param)
    if (value) return value

    // Check host app route via DevTools client (most reliable for iframe context)
    const hostRoute = options.getHostRoute?.()
    if (hostRoute?.query?.[param]) {
      value = (Array.isArray(hostRoute.query[param])
        ? hostRoute.query[param]![0]
        : hostRoute.query[param]) as string
      if (value) return value
    }

    // Fallback: try parent window URL
    if (window.parent !== window) {
      try {
        params = new URLSearchParams(window.parent.location.search)
        value = params.get(param)
        if (value) return value
      }
      catch {
        // Cross-origin, can't access parent
      }
    }

    return null
  }

  /**
   * Get base URL for share links (DevTools iframe context)
   * Prefers: tunnel URL → parent window → current window
   */
  function getBaseUrl(): string {
    if (typeof window === 'undefined') return ''

    // Try tunnel URL first
    const tunnel = options.getTunnelUrl?.()
    if (tunnel?.isActive && tunnel.origin) {
      return tunnel.origin
    }

    // Try parent window (if we're in an iframe like DevTools)
    if (window.parent !== window) {
      try {
        return window.parent.location.origin
      }
      catch {
        // Cross-origin, fall back to current
      }
    }

    return window.location.origin
  }

  return useShareCore({
    getUrlParam,
    getBaseUrl,
  })
}

// Re-export types
export type { ShareOptions } from '@shared/composables/useShare'
