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
/* ═══════════════════════════════════════════════════════════════════════════
   TOOL CALL BLOCK - Glassmorphism styled tool call display
   ═══════════════════════════════════════════════════════════════════════════ */

.claude-tool-block {
  background: rgba(0, 0, 0, 0.25);
  backdrop-filter: blur(10px);
  -webkit-backdrop-filter: blur(10px);
  border: 1px solid rgba(255, 255, 255, 0.08);
  border-radius: 10px;
  margin: 10px 0;
  overflow: hidden;
  transition: all 0.2s ease;
}

.claude-tool-block:hover {
  border-color: rgba(254, 154, 0, 0.2);
  box-shadow: 0 4px 15px rgba(0, 0, 0, 0.2);
}

.claude-tool-header {
  width: 100%;
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 10px 14px;
  background: transparent;
  border: none;
  color: rgba(255, 255, 255, 0.9);
  cursor: pointer;
  font-size: 13px;
  text-align: left;
  transition: all 0.15s ease;
}

.claude-tool-header:hover {
  background: rgba(254, 154, 0, 0.1);
}

.claude-tool-icon {
  font-size: 13px;
  filter: drop-shadow(0 0 6px currentColor);
}

.claude-tool-name {
  flex: 1;
  font-family: 'JetBrains Mono', 'Fira Code', monospace;
  font-size: 12px;
  color: #FBBF24;
  text-shadow: 0 0 15px rgba(254, 154, 0, 0.4);
}

.claude-tool-expand {
  font-size: 10px;
  color: rgba(255, 255, 255, 0.4);
  transition: transform 0.2s ease;
}

.claude-tool-header:hover .claude-tool-expand {
  color: rgba(255, 255, 255, 0.6);
}

.claude-tool-details {
  padding: 0 14px 14px;
  animation: tool-details-in 0.2s ease-out;
}

@keyframes tool-details-in {
  from {
    opacity: 0;
    transform: translateY(-5px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

.claude-tool-section {
  margin-top: 12px;
}

.claude-tool-section-title {
  font-size: 11px;
  font-weight: 500;
  color: rgba(255, 255, 255, 0.5);
  margin-bottom: 6px;
  display: flex;
  align-items: center;
  gap: 8px;
  text-transform: uppercase;
  letter-spacing: 0.04em;
}

.claude-tool-error-badge {
  background: linear-gradient(135deg, #ef4444 0%, #dc2626 100%);
  color: white;
  padding: 2px 8px;
  border-radius: 6px;
  font-size: 10px;
  font-weight: 500;
  text-transform: uppercase;
  letter-spacing: 0.02em;
  box-shadow: 0 2px 8px rgba(239, 68, 68, 0.3);
}

.claude-tool-code {
  background: rgba(0, 0, 0, 0.4);
  border: 1px solid rgba(255, 255, 255, 0.06);
  border-radius: 8px;
  padding: 10px 12px;
  font-family: 'JetBrains Mono', 'Fira Code', 'SF Mono', Monaco, monospace;
  font-size: 11px;
  line-height: 1.5;
  overflow-x: auto;
  max-height: 200px;
  overflow-y: auto;
  margin: 0;
  white-space: pre-wrap;
  word-break: break-all;
  color: rgba(255, 255, 255, 0.8);
}

/* Custom scrollbar for code blocks */
.claude-tool-code::-webkit-scrollbar {
  width: 4px;
  height: 4px;
}

.claude-tool-code::-webkit-scrollbar-track {
  background: transparent;
}

.claude-tool-code::-webkit-scrollbar-thumb {
  background: rgba(255, 255, 255, 0.15);
  border-radius: 2px;
}

.claude-tool-code::-webkit-scrollbar-thumb:hover {
  background: rgba(255, 255, 255, 0.25);
}
</style>
