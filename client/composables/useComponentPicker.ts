import { ref } from 'vue'
import type { useDevtoolsClient } from '@nuxt/devtools-kit/iframe-client'
import type { SelectedComponent } from '~/components/ComponentContext.vue'
import { DEVTOOLS_UI_ROUTE } from '../constants'

type DevtoolsClient = ReturnType<typeof useDevtoolsClient>

export function useComponentPicker(
  client: DevtoolsClient,
  log: (...args: unknown[]) => void,
) {
  const selectedComponents = ref<SelectedComponent[]>([])

  function toggleComponentPicker() {
    if (!client.value?.host?.inspector) {
      console.warn('[claude-client] Inspector not available')
      return
    }

    client.value.host.inspector.toggle()
  }

  function handleComponentSelected(filePath: string) {
    log('Component selected:', filePath)

    if (selectedComponents.value.some(c => c.filePath === filePath)) {
      return
    }

    const parts = filePath.split('/')
    const fileName = parts[parts.length - 1] || filePath
    const name = fileName.replace('.vue', '')

    selectedComponents.value.push({
      filePath,
      name,
      timestamp: Date.now(),
    })
  }

  function removeComponent(filePath: string) {
    selectedComponents.value = selectedComponents.value.filter(c => c.filePath !== filePath)
  }

  function clearAllComponents() {
    selectedComponents.value = []
  }

  function isClaudeTabActive(): boolean {
    const currentPath = window.location.pathname
    return currentPath.includes(DEVTOOLS_UI_ROUTE)
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  function setupInspectorHook(devtoolsClient: any) {
    log('DevTools client connected')

    const hooks = devtoolsClient.host.hooks as { callHook: (name: string, ...args: unknown[]) => Promise<unknown> }
    const originalCallHook = hooks.callHook.bind(hooks)

    hooks.callHook = async (name: string, ...args: unknown[]) => {
      if (name === 'host:inspector:click' && args[0] && isClaudeTabActive()) {
        const filePath = args[0] as string
        log('Intercepted callHook:', name, filePath)

        handleComponentSelected(filePath)
        devtoolsClient.host.inspector?.disable()

        return
      }

      return originalCallHook(name, ...args)
    }

    log('Monkey-patched hooks.callHook')
  }

  return {
    selectedComponents,
    toggleComponentPicker,
    handleComponentSelected,
    removeComponent,
    clearAllComponents,
    isClaudeTabActive,
    setupInspectorHook,
  }
}
