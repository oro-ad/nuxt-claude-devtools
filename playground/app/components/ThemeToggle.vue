<script lang="ts" setup>
import { computed } from 'vue'
import { useColorMode } from '#imports'

const colorMode = useColorMode()

const isDark = computed({
  get: () => colorMode.value === 'dark',
  set: (value: boolean) => {
    colorMode.preference = value ? 'dark' : 'light'
  },
})

function toggle() {
  isDark.value = !isDark.value
}
</script>

<template>
  <client-only>
    <button
      :title="isDark ? 'Switch to light mode' : 'Switch to dark mode'"
      class="theme-toggle"
      @click="toggle"
    >
      <!-- Sun icon -->
      <svg
        v-if="isDark"
        fill="none"
        height="20"
        stroke="currentColor"
        stroke-linecap="round"
        stroke-linejoin="round"
        stroke-width="2"
        viewBox="0 0 24 24"
        width="20"
        xmlns="http://www.w3.org/2000/svg"
      >
        <circle
          cx="12"
          cy="12"
          r="5"
        />
        <line
          x1="12"
          x2="12"
          y1="1"
          y2="3"
        />
        <line
          x1="12"
          x2="12"
          y1="21"
          y2="23"
        />
        <line
          x1="4.22"
          x2="5.64"
          y1="4.22"
          y2="5.64"
        />
        <line
          x1="18.36"
          x2="19.78"
          y1="18.36"
          y2="19.78"
        />
        <line
          x1="1"
          x2="3"
          y1="12"
          y2="12"
        />
        <line
          x1="21"
          x2="23"
          y1="12"
          y2="12"
        />
        <line
          x1="4.22"
          x2="5.64"
          y1="19.78"
          y2="18.36"
        />
        <line
          x1="18.36"
          x2="19.78"
          y1="5.64"
          y2="4.22"
        />
      </svg>
      <!-- Moon icon -->
      <svg
        v-else
        fill="none"
        height="20"
        stroke="currentColor"
        stroke-linecap="round"
        stroke-linejoin="round"
        stroke-width="2"
        viewBox="0 0 24 24"
        width="20"
        xmlns="http://www.w3.org/2000/svg"
      >
        <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" />
      </svg>
    </button>
  </client-only>
</template>

<style scoped>
.theme-toggle {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 40px;
  height: 40px;
  border: 1px solid var(--color-border);
  border-radius: var(--radius-sm);
  background: transparent;
  color: var(--color-text-muted);
  cursor: pointer;
  transition: all 0.3s ease;
}

.theme-toggle:hover {
  color: var(--color-primary);
  transform: scale(1.05);
}

.theme-toggle:active {
  transform: scale(0.95);
}
</style>
