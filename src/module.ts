import { addServerPlugin, createResolver, defineNuxtModule } from '@nuxt/kit'
import { getTunnelConfig } from '@oro.ad/nuxt-claude-devtools-bc/tunnel'
import { createLogger } from './runtime/logger'
import { setupDevToolsUI } from './devtools'
import { destroyClaudeSession, SOCKET_PATH } from './runtime/server/claude-session'

const log = createLogger('module')

export interface ClaudeOptions {
  command: string
  args: string[]
}

export interface ModuleOptions {
  enabled: boolean
  claude: ClaudeOptions
}

export default defineNuxtModule<ModuleOptions>({
  meta: {
    name: '@oro.ad/nuxt-claude-devtools',
    configKey: 'claudeDevtools',
  },
  defaults: {
    enabled: true,
    claude: {
      command: 'claude',
      args: [],
    },
  },
  setup(options, nuxt) {
    // Only run in development mode
    if (!nuxt.options.dev || !options.enabled) {
      return
    }

    const resolver = createResolver(import.meta.url)

    // Detect tunnel configuration
    const tunnel = getTunnelConfig()
    if (tunnel) {
      log(`Tunnel detected: ${tunnel.origin}`)
    }

    // Enable experimental WebSocket support in Nitro (required for Socket.IO)
    nuxt.options.nitro = nuxt.options.nitro || {}
    nuxt.options.nitro.experimental = nuxt.options.nitro.experimental || {}
    nuxt.options.nitro.experimental.websocket = true
    log('Enabled Nitro experimental WebSocket support')

    // Store options in runtime config for server handler
    nuxt.options.runtimeConfig.claudeDevtools = {
      claude: options.claude,
      rootDir: nuxt.options.rootDir,
      tunnelOrigin: tunnel?.origin || null,
    }

    // Expose tunnel info to client via public runtime config
    nuxt.options.runtimeConfig.public.claudeDevtools = {
      socketPath: SOCKET_PATH,
      tunnelOrigin: tunnel?.origin || null,
    }

    // Add Nitro plugin for Socket.IO
    addServerPlugin(resolver.resolve('./runtime/server/plugins/socket.io'))
    log('Added Socket.IO Nitro plugin')

    // Cleanup on close
    nuxt.hook('close', () => {
      log('Cleaning up Claude session')
      destroyClaudeSession()
    })

    // Setup DevTools UI
    setupDevToolsUI(nuxt, resolver)
  },
})
