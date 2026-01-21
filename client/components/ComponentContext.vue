<script lang="ts" setup>
import { computed } from 'vue'

export interface SelectedComponent {
  filePath: string
  name: string
  timestamp: number
}

const props = defineProps<{
  components: SelectedComponent[]
}>()

const emit = defineEmits<{
  (e: 'remove', filePath: string): void
  (e: 'toggle-picker' | 'clear-all'): void
}>()

// Extract component name from file path
function getComponentName(filePath: string): string {
  const parts = filePath.split('/')
  const fileName = parts[parts.length - 1]
  return fileName.replace('.vue', '')
}

// Get relative path from project root
function getRelativePath(filePath: string): string {
  // Try to extract meaningful path
  const match = filePath.match(/(?:components|pages|layouts|app)\/.*\.vue$/)
  return match ? match[0] : filePath
}

const hasComponents = computed(() => props.components.length > 0)
</script>

<template>
  <div
    v-if="hasComponents"
    class="mb-2"
  >
    <!-- Selected components display -->
    <div
      class="flex flex-wrap gap-2 mb-2"
    >
      <div
        v-for="comp in components"
        :key="comp.filePath"
        class="flex items-center gap-1 px-2 py-1 bg-purple-500/20 text-purple-600 dark:text-purple-400 rounded-md text-sm group"
      >
        <NIcon
          class="text-purple-500"
          icon="carbon:application"
        />
        <span class="font-mono">{{ getComponentName(comp.filePath) }}</span>
        <span
          :title="comp.filePath"
          class="text-xs opacity-50 hidden sm:inline"
        >
          ({{ getRelativePath(comp.filePath) }})
        </span>
        <button
          class="ml-1 opacity-50 hover:opacity-100 hover:text-red-500 transition-opacity"
          title="Remove from context"
          @click.stop="emit('remove', comp.filePath)"
        >
          <NIcon icon="carbon:close" />
        </button>
      </div>
      <button
        v-if="components.length > 1"
        class="flex items-center gap-1 px-2 py-1 text-xs opacity-50 hover:opacity-100 hover:text-red-500 transition-opacity"
        title="Clear all components"
        @click.stop="emit('clear-all')"
      >
        <NIcon icon="carbon:trash-can" />
        Clear all
      </button>
    </div>
  </div>
</template>
