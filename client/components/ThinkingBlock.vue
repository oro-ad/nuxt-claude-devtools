<script setup lang="ts">
import { computed, ref } from 'vue'

const props = defineProps<{
  thinking: string
}>()

const isExpanded = ref(false)

const preview = computed(() => {
  const text = props.thinking
  if (text.length <= 80) return text
  return text.substring(0, 80) + '...'
})

const lineCount = computed(() => {
  return props.thinking.split('\n').length
})
</script>

<template>
  <div class="thinking-block rounded-lg border border-purple-200 dark:border-purple-800 my-2 overflow-hidden text-sm bg-purple-500/5">
    <!-- Header -->
    <button
      class="w-full px-3 py-2 text-left flex items-center gap-2 hover:bg-purple-500/10 transition-colors"
      @click="isExpanded = !isExpanded"
    >
      <NIcon
        :icon="isExpanded ? 'carbon:chevron-down' : 'carbon:chevron-right'"
        class="text-xs text-purple-500"
      />
      <NIcon
        icon="carbon:idea"
        class="text-purple-500"
      />
      <span class="font-medium text-purple-700 dark:text-purple-300">Thinking</span>
      <span class="text-xs opacity-50">
        {{ lineCount }} {{ lineCount === 1 ? 'line' : 'lines' }}
      </span>
    </button>

    <!-- Content -->
    <div
      v-if="isExpanded"
      class="px-3 pb-2"
    >
      <pre class="text-xs n-bg-base p-2 rounded overflow-x-auto max-h-96 whitespace-pre-wrap text-purple-800 dark:text-purple-200">{{ thinking }}</pre>
    </div>
    <div
      v-else
      class="px-3 pb-2"
    >
      <div class="text-xs opacity-50 truncate font-mono text-purple-700 dark:text-purple-300">
        {{ preview }}
      </div>
    </div>
  </div>
</template>
