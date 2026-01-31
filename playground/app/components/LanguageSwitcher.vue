<script lang="ts" setup>
import { computed, ref } from 'vue'
import { useI18n } from '#imports'

const { locale, locales, setLocale } = useI18n()

const isOpen = ref(false)

const flags: Record<string, string> = {
  en: '🇺🇸',
  ru: '🇷🇺',
  zh: '🇨🇳',
  es: '🇪🇸',
  de: '🇩🇪',
  pt: '🇧🇷',
  ja: '🇯🇵',
  kk: '🇰🇿',
  tr: '🇹🇷',
  fr: '🇫🇷',
}

const currentLocale = computed(() => {
  const loc = locales.value.find((l) => {
    if (typeof l === 'string') return l === locale.value
    return l.code === locale.value
  })
  if (!loc) return { code: locale.value, name: locale.value }
  if (typeof loc === 'string') return { code: loc, name: loc }
  return loc
})

const availableLocales = computed(() => {
  return locales.value.filter((l) => {
    if (typeof l === 'string') return l !== locale.value
    return l.code !== locale.value
  })
})

function switchLocale(code: string) {
  setLocale(code)
  isOpen.value = false
}

function toggleDropdown() {
  isOpen.value = !isOpen.value
}

function closeDropdown() {
  isOpen.value = false
}
</script>

<template>
  <div
    class="language-switcher"
  >
    <button
      class="current-lang"
      @click="toggleDropdown"
    >
      <span class="flag">{{ flags[currentLocale.code] || '🌐' }}</span>
      <span class="name">{{ currentLocale.name }}</span>
      <span
        :class="{ open: isOpen }"
        class="arrow"
      >▾</span>
    </button>

    <Transition name="dropdown">
      <div
        v-if="isOpen"
        class="dropdown"
      >
        <button
          v-for="loc in availableLocales"
          :key="typeof loc === 'string' ? loc : loc.code"
          class="dropdown-item"
          @click="switchLocale(typeof loc === 'string' ? loc : loc.code)"
        >
          <span class="flag">{{ flags[typeof loc === 'string' ? loc : loc.code] || '🌐' }}</span>
          <span class="name">{{ typeof loc === 'string' ? loc : loc.name }}</span>
        </button>
      </div>
    </Transition>
  </div>
</template>

<style scoped>
.language-switcher {
  position: relative;
}

.current-lang {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.5rem 0.75rem;
  background: var(--color-bg-elevated, #1a1a1a);
  border: 1px solid var(--color-border, #333);
  border-radius: var(--radius, 8px);
  color: var(--color-text, #fff);
  font-size: 0.875rem;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s ease;
}

.current-lang:hover {
  border-color: var(--color-primary, #10a37f);
}

.flag {
  font-size: 1.1rem;
  line-height: 1;
}

.arrow {
  font-size: 0.75rem;
  color: var(--color-text-muted, #a0a0a0);
  transition: transform 0.2s ease;
}

.arrow.open {
  transform: rotate(180deg);
}

.dropdown {
  position: absolute;
  top: calc(100% + 0.5rem);
  right: 0;
  min-width: 160px;
  background: var(--color-bg-elevated, #1a1a1a);
  border: 1px solid var(--color-border, #333);
  border-radius: var(--radius, 8px);
  box-shadow: 0 8px 24px rgba(0, 0, 0, 0.4);
  overflow: hidden;
  z-index: 100;
}

.dropdown-item {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  width: 100%;
  padding: 0.625rem 0.75rem;
  background: transparent;
  border: none;
  color: var(--color-text-muted, #a0a0a0);
  font-size: 0.875rem;
  text-align: left;
  cursor: pointer;
  transition: all 0.15s ease;
}

.dropdown-item:hover {
  background: rgba(16, 163, 127, 0.1);
  color: var(--color-text, #fff);
}

.dropdown-item .name {
  flex: 1;
}

/* Transitions */
.dropdown-enter-active,
.dropdown-leave-active {
  transition: opacity 0.2s ease, transform 0.2s ease;
}

.dropdown-enter-from,
.dropdown-leave-to {
  opacity: 0;
  transform: translateY(-8px);
}
</style>
