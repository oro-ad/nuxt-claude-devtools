import { ref } from 'vue'
import type { useDevtoolsClient } from '@nuxt/devtools-kit/iframe-client'
import type { ContextChip } from '~/components/ContextChips.vue'
import type { MessageContextData } from '~/components/MessageContext.vue'
import type { SelectedComponent } from '~/components/ComponentContext.vue'

type DevtoolsClient = ReturnType<typeof useDevtoolsClient>

export function useMessageContext(
  client: DevtoolsClient,
  selectedComponents: Ref<SelectedComponent[]>,
) {
  const contextChips = ref<ContextChip[]>([
    { id: 'viewport', label: 'Viewport', icon: 'carbon:fit-to-screen', active: false },
    { id: 'user-agent', label: 'User Agent', icon: 'carbon:application-web', active: false },
    { id: 'routing', label: 'Routing', icon: 'carbon:location', active: false },
  ])

  function toggleContextChip(id: ContextChip['id']) {
    const chip = contextChips.value.find(c => c.id === id)
    if (chip) {
      chip.active = !chip.active
    }
  }

  function getHostRoute() {
    return client.value?.host?.nuxt?.vueApp?.config?.globalProperties?.$route
  }

  function getHostViewport(): { width: number, height: number } | null {
    try {
      // Method 1: Try to get viewport from DevTools host client
      const hostClient = client.value?.host
      if (hostClient) {
        const nuxtApp = hostClient.nuxt
        const appWindow = nuxtApp?.vueApp?.config?.globalProperties?.window
        if (appWindow?.innerWidth) {
          return {
            width: appWindow.innerWidth,
            height: appWindow.innerHeight,
          }
        }
      }

      // Method 2: Try window.top (topmost window in frame hierarchy)
      if (window.top && window.top !== window) {
        const _test = window.top.innerWidth
        return {
          width: window.top.innerWidth,
          height: window.top.innerHeight,
        }
      }

      // Method 3: Try window.parent.parent (devtools might be nested)
      if (window.parent?.parent && window.parent.parent !== window) {
        const _test = window.parent.parent.innerWidth
        return {
          width: window.parent.parent.innerWidth,
          height: window.parent.parent.innerHeight,
        }
      }

      // Method 4: window.parent as fallback
      if (window.parent && window.parent !== window) {
        const _test = window.parent.innerWidth
        return {
          width: window.parent.innerWidth,
          height: window.parent.innerHeight,
        }
      }
    }
    catch {
      // Cross-origin or other error
    }
    return null
  }

  function collectContext(): MessageContextData | null {
    const context: MessageContextData = {}
    let hasContext = false

    // Viewport
    if (contextChips.value.find(c => c.id === 'viewport')?.active) {
      const hostViewport = getHostViewport()
      if (hostViewport) {
        context.viewport = hostViewport
      }
      else {
        context.viewport = {
          width: window.innerWidth,
          height: window.innerHeight,
        }
      }
      hasContext = true
    }

    // User Agent
    if (contextChips.value.find(c => c.id === 'user-agent')?.active) {
      context.userAgent = navigator.userAgent
      hasContext = true
    }

    // Routing
    if (contextChips.value.find(c => c.id === 'routing')?.active) {
      const route = getHostRoute()
      if (route) {
        // Convert query and params to simple Record types
        const query = route.query && Object.keys(route.query).length > 0
          ? Object.fromEntries(Object.entries(route.query).map(([k, v]) => [k, Array.isArray(v) ? v.filter(Boolean).join(',') : v || '']))
          : undefined

        const params = route.params && Object.keys(route.params).length > 0
          ? Object.fromEntries(Object.entries(route.params).map(([k, v]) => [k, Array.isArray(v) ? v.join('/') : v || '']))
          : undefined

        // Try to get page component file path
        const lastMatched = route.matched?.[route.matched.length - 1]
        const defaultComponent = lastMatched?.components?.default as { __file?: string } | undefined
        const pageComponent = defaultComponent?.__file

        context.routing = {
          path: route.path,
          fullPath: route.fullPath,
          query: query as Record<string, string | string[]> | undefined,
          params: params as Record<string, string> | undefined,
          name: route.name?.toString(),
          pageComponent,
        }
        hasContext = true
      }
    }

    // Components
    if (selectedComponents.value.length > 0) {
      context.components = selectedComponents.value.map(c => c.filePath)
      hasContext = true
    }

    return hasContext ? context : null
  }

  function generateContextBlock(context: MessageContextData): string {
    const parts: string[] = []

    if (context.viewport) {
      parts.push(`viewport: ${context.viewport.width}x${context.viewport.height}`)
    }

    if (context.userAgent) {
      const ua = context.userAgent
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

  function parseMessageContext(content: string): { context: MessageContextData | null, body: string } {
    const contextBlockRegex = /^\[context\]\n([\s\S]*?)\n\[\/context\]\n?/
    const match = content.match(contextBlockRegex)

    if (!match || !match[1]) {
      return { context: null, body: content }
    }

    const contextContent = match[1]
    let body = content.slice(match[0].length)
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

  return {
    contextChips,
    toggleContextChip,
    collectContext,
    generateContextBlock,
    parseMessageContext,
  }
}
