<script lang="ts" setup>
/**
 * Base page layout with header (back link, title, actions) and content area
 * Used directly for simple pages or extended by CrudPageLayout
 */

defineProps<{
  /** Page title */
  title: string
  /** Icon for the page (carbon icon name) */
  icon: string
  /** Color theme */
  color: 'purple' | 'orange' | 'green' | 'blue' | 'cyan'
  /** Show connection badge */
  showConnectionBadge?: boolean
  /** Whether connected (for badge) */
  isConnected?: boolean
  /** Use centered content layout (like Settings) */
  centered?: boolean
  /** Max width for centered content */
  maxWidth?: string
}>()
</script>

<template>
  <div class="flex flex-col h-screen n-bg-base overflow-hidden">
    <!-- Header -->
    <div class="flex items-center justify-between p-4">
      <div class="flex items-center gap-3">
        <NuxtLink
          class="text-sm opacity-50 hover:opacity-100"
          to="/"
        >
          &larr; Chat
        </NuxtLink>
        <h1 class="text-xl font-bold flex items-center gap-2">
          <NIcon
            :class="`text-${color}-500`"
            :icon="icon"
          />
          {{ title }}
        </h1>
        <NBadge
          v-if="showConnectionBadge"
          :n="isConnected ? 'green' : 'red'"
        >
          {{ isConnected ? 'Connected' : 'Disconnected' }}
        </NBadge>
      </div>
      <div class="flex items-center gap-2">
        <slot name="actions" />
      </div>
    </div>

    <!-- Content -->
    <div class="flex-1 overflow-auto p-4">
      <div
        v-if="centered"
        :class="maxWidth || 'max-w-2xl'"
        class="mx-auto"
      >
        <slot />
      </div>
      <slot v-else />
    </div>
  </div>
</template>
