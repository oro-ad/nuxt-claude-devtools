import { resolve } from 'node:path'
import { defineNuxtModule } from '@nuxt/kit'
import { startSubprocess } from '@nuxt/devtools-kit'

export default defineNuxtConfig({
  modules: [
    // Claude DevTools module
    '../src/module',

    '@oro.ad/nuxt-claude-devtools-bc',

    // i18n module
    '@nuxtjs/i18n',

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
      args: [
        '--chrome',
      ],
    },
    debug: true,
  },

  i18n: {
    locales: [
      { code: 'en', name: 'English', file: 'en.json' },
      { code: 'ru', name: 'Русский', file: 'ru.json' },
      { code: 'zh', name: '中文', file: 'zh.json' },
      { code: 'es', name: 'Español', file: 'es.json' },
      { code: 'de', name: 'Deutsch', file: 'de.json' },
      { code: 'pt', name: 'Português', file: 'pt.json' },
      { code: 'ja', name: '日本語', file: 'ja.json' },
      { code: 'kk', name: 'Қазақша', file: 'kk.json' },
      { code: 'tr', name: 'Türkçe', file: 'tr.json' },
      { code: 'fr', name: 'Français', file: 'fr.json' },
    ],
    defaultLocale: 'en',
    strategy: 'prefix_except_default',
    lazy: true,
    // i18n/{langDir}
    langDir: 'locales',
  },
})
