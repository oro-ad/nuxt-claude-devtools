import { resolve } from 'node:path'
import { defineNuxtModule } from '@nuxt/kit'
import { startSubprocess } from '@nuxt/devtools-kit'

export default defineNuxtConfig({
  modules: [
    // Claude DevTools module
    '../src/module',

    '@oro.ad/nuxt-claude-devtools-bc',

    // Start a sub Nuxt Server for developing the client
    defineNuxtModule({
      setup(_, nuxt) {
        if (!nuxt.options.dev) {
          return
        }

        startSubprocess(
          {
            command: 'npx',
            args: ['nuxi', 'dev', '--port', '3300'],
            cwd: resolve(__dirname, '../client'),
          },
          {
            id: 'claude-devtools:client',
            name: 'Claude DevTools Client Dev',
          },
        )
      },
    }),
  ],

  devtools: {
    enabled: true,
  },

  compatibilityDate: '2024-08-21',

  claudeDevtools: {
    enabled: true,
    claude: {
      command: 'claude',
      args: [],
    },
    debug: true
  },
})
