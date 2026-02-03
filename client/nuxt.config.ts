import { resolve } from 'pathe'

export default defineNuxtConfig({
  modules: [
    '@nuxt/devtools-ui-kit',
    '@oro.ad/nuxt-claude-devtools-bc',
  ],
  ssr: false,

  components: {
    dirs: [
      { path: '~/components', pathPrefix: false },
    ],
  },

  devtools: {
    enabled: false,
  },

  app: {
    baseURL: '/__claude-devtools',
  },

  alias: {
    '@shared': resolve(__dirname, '../src/runtime/shared'),
  },

  compatibilityDate: '2024-08-21',

  nitro: {
    output: {
      publicDir: resolve(__dirname, '../dist/client'),
    },
  },

  vite: {
    server: {
      hmr: {
        // Instead of go through proxy, we directly connect real port of the client app
        clientPort: +(process.env.PORT || 3300),
      },
    },
  },
})
