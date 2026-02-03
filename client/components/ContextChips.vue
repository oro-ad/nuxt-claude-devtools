<script lang="ts" setup>
import { computed } from 'vue'
import type { ContextChip } from '@shared/types'

const props = defineProps<{
  chips: ContextChip[]
}>()

const emit = defineEmits<{
  (e: 'toggle', id: ContextChip['id']): void
}>()

function getActiveClasses(chip: ContextChip): string {
  switch (chip.id) {
    case 'viewport':
      return 'bg-blue-500/20 text-blue-600 dark:text-blue-400 ring-1 ring-blue-500/30'
    case 'user-agent':
      return 'bg-orange-500/20 text-orange-600 dark:text-orange-400 ring-1 ring-orange-500/30'
    case 'routing':
      return 'bg-green-500/20 text-green-600 dark:text-green-400 ring-1 ring-green-500/30'
    default:
      return 'bg-gray-500/20 text-gray-600 dark:text-gray-400 ring-1 ring-gray-500/30'
  }
}

const inactiveClasses = 'bg-neutral-100 dark:bg-neutral-800 text-neutral-500 hover:bg-neutral-200 dark:hover:bg-neutral-700'

// Check if any chip is active for displaying indicator
const hasActiveChips = computed(() => props.chips.some(c => c.active))
</script>

<template>
  <div class="flex items-center gap-1">
    <span
      v-if="hasActiveChips"
      class="text-xs opacity-50 mr-1"
    >Context:</span>
    <button
      v-for="chip in chips"
      :key="chip.id"
      :class="[
        'flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium transition-all',
        chip.active ? getActiveClasses(chip) : inactiveClasses,
      ]"
      :title="`${chip.active ? 'Disable' : 'Enable'} ${chip.label} context`"
      @click="emit('toggle', chip.id)"
    >
      <NIcon
        :icon="chip.icon"
        class="text-sm"
      />
      <span>{{ chip.label }}</span>
    </button>
  </div>
</template>
