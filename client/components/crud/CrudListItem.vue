<script lang="ts" setup>
/**
 * List item for CRUD pages with selection state, icon, and delete button
 */

defineProps<{
  /** Whether this item is selected */
  selected: boolean
  /** Icon for the item (carbon icon name) */
  icon: string
  /** Color theme for selection ring and icon */
  color: 'purple' | 'orange' | 'green' | 'blue'
  /** Primary text (name) */
  name: string
  /** Secondary text (description) */
  description?: string
  /** Whether to show the name with font-mono (for commands) */
  monoName?: boolean
  /** Prefix for the name (e.g., "/" for commands) */
  namePrefix?: string
}>()

defineEmits<{
  select: []
  delete: []
}>()
</script>

<template>
  <div
    :class="[
      selected ? `n-bg-active ring-1 ring-${color}-500` : 'hover:n-bg-active',
    ]"
    class="rounded-lg p-2 cursor-pointer group"
    @click="$emit('select')"
  >
    <div class="flex items-center justify-between">
      <div class="flex items-center gap-2 truncate">
        <NIcon
          :class="`opacity-50 text-${color}-500`"
          :icon="icon"
        />
        <span :class="{ 'font-mono': monoName, 'font-medium': !monoName }">
          {{ namePrefix }}{{ name }}
        </span>
      </div>
      <NButton
        class="opacity-0 group-hover:opacity-100"
        n="red xs"
        @click.stop="$emit('delete')"
      >
        <NIcon icon="carbon:trash-can" />
      </NButton>
    </div>
    <div
      v-if="description"
      class="text-xs opacity-50 pl-6 truncate line-clamp-2"
    >
      {{ description }}
    </div>
    <!-- Extra content slot for badges etc -->
    <slot name="extra" />
  </div>
</template>
