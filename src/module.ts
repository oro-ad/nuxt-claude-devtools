import { createResolver, defineNuxtModule } from '@nuxt/kit'
import { setupDevToolsUI } from './devtools'
import { destroyClaudeSession, getClaudeSession, SOCKET_PORT } from './runtime/server/claude-session'

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

    // Store options in runtime config for server handler
    nuxt.options.runtimeConfig.claudeDevtools = {
      claude: options.claude,
      rootDir: nuxt.options.rootDir,
    }

    // Start Socket.IO server on separate port
    nuxt.hook('ready', () => {
      console.log(`[claude-devtools] Starting Socket.IO server on port ${SOCKET_PORT}`)

      const session = getClaudeSession({
        command: options.claude.command,
        args: options.claude.args,
        rootDir: nuxt.options.rootDir,
      })

      session.startSocketServer()
    })

    // Cleanup on close
    nuxt.hook('close', () => {
      console.log('[claude-devtools] Cleaning up Claude session')
      destroyClaudeSession()
    })

    // Setup DevTools UI
    setupDevToolsUI(nuxt, resolver)
  },
})
