import { existsSync } from 'node:fs'
import type { Nuxt } from 'nuxt/schema'
import type { Resolver } from '@nuxt/kit'

const DEVTOOLS_UI_ROUTE = '/__claude-devtools'
const DEVTOOLS_UI_LOCAL_PORT = 3300

export interface DevToolsUIOptions {
  debug?: boolean
}

export function setupDevToolsUI(nuxt: Nuxt, resolver: Resolver, options: DevToolsUIOptions = {}) {
  const clientPath = resolver.resolve('./client')
  const isProductionBuild = existsSync(clientPath)

  // Serve production-built client (used when package is published)
  if (isProductionBuild) {
    nuxt.hook('vite:serverCreated', async (server) => {
      const sirv = await import('sirv').then(r => r.default || r)
      server.middlewares.use(
        DEVTOOLS_UI_ROUTE,
        sirv(clientPath, { dev: true, single: true }),
      )
    })
  }
  // In local development, start a separate Nuxt Server and proxy to serve the client
  else {
    nuxt.hook('vite:extendConfig', (config) => {
      config.server = config.server || {}
      config.server.proxy = config.server.proxy || {}
      config.server.proxy[DEVTOOLS_UI_ROUTE] = {
        target: 'http://localhost:' + DEVTOOLS_UI_LOCAL_PORT + DEVTOOLS_UI_ROUTE,
        changeOrigin: true,
        followRedirects: true,
        rewrite: path => path.replace(DEVTOOLS_UI_ROUTE, ''),
      }
    })
  }

  nuxt.hook('devtools:customTabs', (tabs) => {
    const hash = options.debug ? '#debug=true' : ''
    tabs.push({
      name: 'claude-ai',
      title: 'AI',
      icon: 'carbon:machine-learning-model',
      view: {
        type: 'iframe',
        src: `${DEVTOOLS_UI_ROUTE}${hash}`,
      },
    })
  })
}
