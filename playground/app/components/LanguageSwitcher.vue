<script lang="ts" setup>
import { computed, onMounted, onUnmounted, ref } from 'vue'
import { useI18n } from '#imports'

const { locale, locales, setLocale } = useI18n()

const isOpen = ref(false)
const switcherRef = ref<HTMLElement | null>(null)

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

function handleClickOutside(e: MouseEvent) {
  if (switcherRef.value && !switcherRef.value.contains(e.target as Node)) {
    isOpen.value = false
  }
}

onMounted(() => {
  document.addEventListener('click', handleClickOutside)
})

onUnmounted(() => {
  document.removeEventListener('click', handleClickOutside)
})
</script>

<template>
  <div
    ref="switcherRef"
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
  background: transparent;
  border: none;
  border-radius: var(--radius-sm, 8px);
  color: var(--color-text-muted, #94a3b8);
  font-size: 0.875rem;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.3s ease;
}

.current-lang:hover {
  color: var(--color-text, #fff);
}

.flag {
  font-size: 1.1rem;
  line-height: 1;
}

.arrow {
  font-size: 0.75rem;
  color: var(--color-text-muted, #94a3b8);
  transition: transform 0.2s ease;
}

.arrow.open {
  transform: rotate(180deg);
}

.dropdown {
  position: absolute;
  top: calc(100% + 0.75rem);
  right: 0;
  min-width: 180px;
  background: var(--color-bg-elevated, rgba(20, 20, 30, 0.9));
  backdrop-filter: blur(20px);
  -webkit-backdrop-filter: blur(20px);
  border: 1px solid var(--color-border, rgba(255, 255, 255, 0.1));
  border-radius: var(--radius, 16px);
  box-shadow: var(--shadow-lg, 0 16px 64px rgba(0, 0, 0, 0.5));
  overflow: hidden;
  z-index: 100;
}

.dropdown-item {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  width: 100%;
  padding: 0.75rem 1rem;
  background: transparent;
  border: none;
  color: var(--color-text-muted, #94a3b8);
  font-size: 0.875rem;
  text-align: left;
  cursor: pointer;
  transition: all 0.2s ease;
}

.dropdown-item:hover {
  background: rgba(16, 163, 127, 0.15);
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
