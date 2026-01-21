import { createConfigForNuxt } from '@nuxt/eslint-config/flat'

export default createConfigForNuxt({
  features: {
    tooling: true,
    stylistic: true,
  },
  dirs: {
    root: [
      '',
      'playground',
      'client',
    ],
  },
}, {
  rules: {
    '@typescript-eslint/no-explicit-any': 'warn',
    'vue/no-v-html': 'warn',
  },
})
