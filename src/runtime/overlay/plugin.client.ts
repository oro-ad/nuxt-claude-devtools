import { createApp, h } from 'vue'
import { defineNuxtPlugin, useRuntimeConfig } from '#app'
import ChatOverlay from './components/ChatOverlay.vue'

export default defineNuxtPlugin((nuxtApp) => {
  // Only run on client
  if (import.meta.server) return

  const config = useRuntimeConfig()

  // Create mount point
  const mountPoint = document.createElement('div')
  mountPoint.id = 'claude-chat-overlay-root'
  document.body.appendChild(mountPoint)

  // Get tunnel URL if available
  const tunnelOrigin = config.public.claudeDevtools?.tunnelOrigin as string | null

  // Create and mount overlay app
  const overlayApp = createApp({
    render() {
      return h(ChatOverlay, {
        socketUrl: tunnelOrigin || undefined,
      })
    },
  })

  // Share Vue's app context for potential future integrations
  overlayApp.config.globalProperties = nuxtApp.vueApp.config.globalProperties

  overlayApp.mount(mountPoint)

  // Cleanup on unmount
  nuxtApp.hook('app:beforeMount', () => {
    // Already mounted
  })

  // Provide overlay API for advanced usage
  return {
    provide: {
      claudeOverlay: {
        // Could expose methods to control overlay programmatically
      },
    },
  }
})
