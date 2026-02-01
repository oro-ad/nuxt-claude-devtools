<script setup lang="ts">
import { computed, ref } from 'vue'
import type { ContentBlock } from '../../shared/types'

const props = defineProps<{
  block: ContentBlock
  result?: ContentBlock
}>()

const isExpanded = ref(false)

const statusIcon = computed(() => {
  if (!props.result) return '⏳' // pending
  if (props.result.is_error) return '❌' // error
  return '✓' // success
})

const statusColor = computed(() => {
  if (!props.result) return 'var(--claude-text-muted)'
  if (props.result.is_error) return '#ef4444'
  return '#22c55e'
})

const resultPreview = computed(() => {
  if (!props.result?.content) return ''
  const content = typeof props.result.content === 'string'
    ? props.result.content
    : JSON.stringify(props.result.content, null, 2)
  if (content.length > 200) {
    return content.slice(0, 200) + '...'
  }
  return content
})
</script>

<template>
  <div class="claude-tool-block">
    <button
      class="claude-tool-header"
      @click="isExpanded = !isExpanded"
    >
      <span
        class="claude-tool-icon"
        :style="{ color: statusColor }"
      >{{ statusIcon }}</span>
      <span class="claude-tool-name">{{ block.name }}</span>
      <span class="claude-tool-expand">{{ isExpanded ? '▼' : '▶' }}</span>
    </button>

    <div
      v-if="isExpanded"
      class="claude-tool-details"
    >
      <!-- Input -->
      <div
        v-if="block.input"
        class="claude-tool-section"
      >
        <div class="claude-tool-section-title">
          Input
        </div>
        <pre class="claude-tool-code">{{ JSON.stringify(block.input, null, 2) }}</pre>
      </div>

      <!-- Result -->
      <div
        v-if="result"
        class="claude-tool-section"
      >
        <div class="claude-tool-section-title">
          Result
          <span
            v-if="result.is_error"
            class="claude-tool-error-badge"
          >Error</span>
        </div>
        <pre class="claude-tool-code">{{ resultPreview }}</pre>
      </div>
    </div>
  </div>
</template>

<style>
.claude-tool-block {
  background: rgba(0, 0, 0, 0.2);
  border-radius: 6px;
  margin: 8px 0;
  overflow: hidden;
}

.claude-tool-header {
  width: 100%;
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 8px 12px;
  background: transparent;
  border: none;
  color: var(--claude-text);
  cursor: pointer;
  font-size: 13px;
  text-align: left;
  transition: background 0.15s;
}

.claude-tool-header:hover {
  background: rgba(255, 255, 255, 0.05);
}

.claude-tool-icon {
  font-size: 12px;
}

.claude-tool-name {
  flex: 1;
  font-family: monospace;
  color: var(--claude-primary);
}

.claude-tool-expand {
  font-size: 10px;
  color: var(--claude-text-muted);
}

.claude-tool-details {
  padding: 0 12px 12px;
}

.claude-tool-section {
  margin-top: 8px;
}

.claude-tool-section-title {
  font-size: 11px;
  color: var(--claude-text-muted);
  margin-bottom: 4px;
  display: flex;
  align-items: center;
  gap: 8px;
}

.claude-tool-error-badge {
  background: #ef4444;
  color: white;
  padding: 1px 6px;
  border-radius: 4px;
  font-size: 10px;
}

.claude-tool-code {
  background: #0d0d0d;
  border-radius: 4px;
  padding: 8px;
  font-family: 'SF Mono', Monaco, monospace;
  font-size: 11px;
  overflow-x: auto;
  max-height: 200px;
  overflow-y: auto;
  margin: 0;
  white-space: pre-wrap;
  word-break: break-all;
}
</style>
