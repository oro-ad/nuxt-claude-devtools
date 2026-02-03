import { ref } from 'vue'
import type { ContextChip, MessageContextData } from '../types'

export interface MessageContextOptions {
  /**
   * Get viewport dimensions (context-specific)
   * For overlay: use window.innerWidth/innerHeight
   * For DevTools: try host client, window.top, parent windows
   */
  getViewport?: () => { width: number, height: number } | null
  /**
   * Get current route information (context-specific)
   * For overlay: use window.location
   * For DevTools: use host app $route
   */
  getRoute?: () => RouteInfo | null
  /**
   * Get selected components (DevTools only)
   */
  getComponents?: () => string[]
  /** Log function */
  log?: (...args: unknown[]) => void
}

export interface RouteInfo {
  path: string
  fullPath?: string
  query?: Record<string, string | string[] | undefined>
  params?: Record<string, string | string[]>
  name?: string
  pageComponent?: string
}

// Default implementations for simple contexts (like overlay)
function defaultGetViewport(): { width: number, height: number } | null {
  if (typeof window === 'undefined') return null
  return {
    width: window.innerWidth,
    height: window.innerHeight,
  }
}

function defaultGetRoute(): RouteInfo | null {
  if (typeof window === 'undefined') return null
  return {
    path: window.location.pathname,
    fullPath: window.location.pathname + window.location.search,
    query: window.location.search
      ? Object.fromEntries(new URLSearchParams(window.location.search))
      : undefined,
  }
}

/**
 * Parse user agent string to get browser and OS info
 */
function parseUserAgent(ua: string): { browser: string, os: string } {
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

  return { browser, os }
}

export function useMessageContext(options: MessageContextOptions = {}) {
  const {
    getViewport = defaultGetViewport,
    getRoute = defaultGetRoute,
    getComponents = () => [],
    log: _log = () => {},
  } = options

  // Context chips state
  const contextChips = ref<ContextChip[]>([
    { id: 'viewport', label: 'Viewport', icon: 'carbon:fit-to-screen', active: false },
    { id: 'user-agent', label: 'User Agent', icon: 'carbon:application-web', active: false },
    { id: 'routing', label: 'Routing', icon: 'carbon:location', active: false },
  ])

  /**
   * Toggle a context chip on/off
   */
  function toggleContextChip(id: ContextChip['id']) {
    const chip = contextChips.value.find(c => c.id === id)
    if (chip) {
      chip.active = !chip.active
    }
  }

  /**
   * Collect context data based on active chips
   */
  function collectContext(): MessageContextData | null {
    const context: MessageContextData = {}
    let hasContext = false

    // Viewport
    if (contextChips.value.find(c => c.id === 'viewport')?.active) {
      const viewport = getViewport()
      if (viewport) {
        context.viewport = viewport
        hasContext = true
      }
    }

    // User Agent
    if (contextChips.value.find(c => c.id === 'user-agent')?.active) {
      if (typeof navigator !== 'undefined') {
        context.userAgent = navigator.userAgent
        hasContext = true
      }
    }

    // Routing
    if (contextChips.value.find(c => c.id === 'routing')?.active) {
      const route = getRoute()
      if (route) {
        // Normalize query params
        const query = route.query && Object.keys(route.query).length > 0
          ? Object.fromEntries(
            Object.entries(route.query)
              .filter(([_, v]) => v !== undefined)
              .map(([k, v]) => [k, Array.isArray(v) ? v.filter(Boolean).join(',') : v || '']),
          ) as Record<string, string | string[]>
          : undefined

        // Normalize params
        const params = route.params && Object.keys(route.params).length > 0
          ? Object.fromEntries(
            Object.entries(route.params).map(([k, v]) => [k, Array.isArray(v) ? v.join('/') : v || '']),
          ) as Record<string, string>
          : undefined

        context.routing = {
          path: route.path,
          fullPath: route.fullPath,
          query,
          params,
          name: route.name,
          pageComponent: route.pageComponent,
        }
        hasContext = true
      }
    }

    // Components (DevTools only)
    const components = getComponents()
    if (components.length > 0) {
      context.components = components
      hasContext = true
    }

    return hasContext ? context : null
  }

  /**
   * Generate context block string from context data
   */
  function generateContextBlock(context: MessageContextData): string {
    const parts: string[] = []

    if (context.viewport) {
      parts.push(`viewport: ${context.viewport.width}x${context.viewport.height}`)
    }

    if (context.userAgent) {
      const { browser, os } = parseUserAgent(context.userAgent)
      parts.push(`browser: ${browser} on ${os}`)
    }

    if (context.routing) {
      parts.push(`route: ${context.routing.path}`)
      if (context.routing.query && Object.keys(context.routing.query).length > 0) {
        const queryStr = Object.entries(context.routing.query)
          .map(([k, v]) => `${k}=${Array.isArray(v) ? v.join(',') : v}`)
          .join('&')
        parts.push(`query: ?${queryStr}`)
      }
      if (context.routing.params && Object.keys(context.routing.params).length > 0) {
        const paramsStr = Object.entries(context.routing.params)
          .map(([k, v]) => `${k}=${v}`)
          .join(', ')
        parts.push(`params: ${paramsStr}`)
      }
      if (context.routing.pageComponent) {
        parts.push(`page: ${context.routing.pageComponent}`)
      }
    }

    if (context.components && context.components.length > 0) {
      parts.push(`components: ${context.components.join(', ')}`)
    }

    return `[context]\n${parts.join('\n')}\n[/context]`
  }

  /**
   * Parse context block from message content
   */
  function parseMessageContext(content: string): { context: MessageContextData | null, body: string } {
    const contextBlockRegex = /^\[context\]\n([\s\S]*?)\n\[\/context\]\n?/
    const match = content.match(contextBlockRegex)

    if (!match || !match[1]) {
      return { context: null, body: content }
    }

    const contextContent = match[1]
    let body = content.slice(match[0].length)
    // Remove any mention prefix (e.g., @nickname)
    body = body.replace(/^(@\S+\s+)+/g, '').trim()

    try {
      const context: MessageContextData = {}

      const viewportMatch = contextContent.match(/viewport:\s*(\d+)x(\d+)/)
      if (viewportMatch && viewportMatch[1] && viewportMatch[2]) {
        context.viewport = {
          width: Number.parseInt(viewportMatch[1]),
          height: Number.parseInt(viewportMatch[2]),
        }
      }

      const browserMatch = contextContent.match(/browser:\s*(\w+)\s+on\s+(\w+)/)
      if (browserMatch && browserMatch[1] && browserMatch[2]) {
        context.userAgent = `${browserMatch[1]} on ${browserMatch[2]}`
      }

      const routeMatch = contextContent.match(/route:\s*(\S+)/)
      if (routeMatch && routeMatch[1]) {
        context.routing = { path: routeMatch[1] }

        const queryMatch = contextContent.match(/query:\s*\?(.+)/)
        if (queryMatch && queryMatch[1] && context.routing) {
          context.routing.query = {}
          const pairs = queryMatch[1].split('&')
          for (const pair of pairs) {
            const [key, value] = pair.split('=')
            if (key && context.routing.query) context.routing.query[key] = value || ''
          }
        }

        const paramsMatch = contextContent.match(/params:\s*(.+)/)
        if (paramsMatch && paramsMatch[1] && context.routing) {
          context.routing.params = {}
          const pairs = paramsMatch[1].split(',').map(s => s.trim())
          for (const pair of pairs) {
            const [key, value] = pair.split('=')
            if (key && context.routing.params) context.routing.params[key] = value || ''
          }
        }

        const pageMatch = contextContent.match(/page:\s*(\S+)/)
        if (pageMatch && pageMatch[1] && context.routing) {
          context.routing.pageComponent = pageMatch[1]
        }
      }

      const componentsMatch = contextContent.match(/components:\s*(.+)/)
      if (componentsMatch && componentsMatch[1]) {
        context.components = componentsMatch[1].split(',').map(s => s.trim())
      }

      return { context: Object.keys(context).length > 0 ? context : null, body }
    }
    catch {
      return { context: null, body: content }
    }
  }

  /**
   * Collect context and generate block string (convenience method)
   */
  function collectContextBlock(): string | null {
    const context = collectContext()
    if (!context) return null
    return generateContextBlock(context)
  }

  return {
    // State
    contextChips,

    // Methods
    toggleContextChip,
    collectContext,
    generateContextBlock,
    parseMessageContext,
    collectContextBlock,
  }
}

// Re-export types
export type { ContextChip, MessageContextData } from '../types'
