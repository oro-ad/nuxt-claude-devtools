/**
 * useMessageContext composable for DevTools Client
 * Uses shared core with DevTools-specific context collection hooks
 */
import type { useDevtoolsClient } from '@nuxt/devtools-kit/iframe-client'
import { useMessageContext as useMessageContextCore } from '@shared/composables/useMessageContext'
import type { RouteInfo } from '@shared/composables/useMessageContext'

type DevtoolsClient = ReturnType<typeof useDevtoolsClient>

export interface SelectedComponent {
  uid: number
  name: string
  filePath: string
}

export function useMessageContext(
  client: DevtoolsClient,
  selectedComponents: Ref<SelectedComponent[]>,
) {
  /**
   * Get route from host app via DevTools client
   */
  function getRoute(): RouteInfo | null {
    const route = client.value?.host?.nuxt?.vueApp?.config?.globalProperties?.$route
    if (!route) return null

    // Try to get page component file path
    const lastMatched = route.matched?.[route.matched.length - 1]
    const defaultComponent = lastMatched?.components?.default as { __file?: string } | undefined
    const pageComponent = defaultComponent?.__file

    return {
      path: route.path,
      fullPath: route.fullPath,
      query: route.query,
      params: route.params,
      name: route.name?.toString(),
      pageComponent,
    }
  }

  /**
   * Get viewport from host app via multiple methods
   */
  function getViewport(): { width: number, height: number } | null {
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

  /**
   * Get selected components from DevTools
   */
  function getComponents(): string[] {
    return selectedComponents.value.map(c => c.filePath)
  }

  return useMessageContextCore({
    getViewport,
    getRoute,
    getComponents,
  })
}

// Re-export types from shared
export type { ContextChip, MessageContextData, RouteInfo } from '@shared/composables/useMessageContext'
