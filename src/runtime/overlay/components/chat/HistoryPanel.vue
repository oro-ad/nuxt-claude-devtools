<script setup lang="ts">
defineProps<{
  show: boolean
  conversations: Array<{
    id: string
    title?: string
    updatedAt: string
  }>
}>()

const emit = defineEmits<{
  close: []
  select: [id: string]
}>()

function stripContextBlock(content: string): string {
  return content.replace(/^\[context\]\n[\s\S]*?\n\[\/context\]\n?/, '').trim()
}

function formatDate(dateStr: string): string {
  const date = new Date(dateStr)
  return date.toLocaleDateString() + ' ' + date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
}
</script>

<template>
  <Transition name="claude-slide-right">
    <div
      v-if="show"
      class="claude-history"
    >
      <div class="claude-history-header">
        <span>History</span>
        <button
          class="claude-btn-icon"
          @click="emit('close')"
        >
          <svg fill="currentColor" height="16" viewBox="0 0 24 24" width="16">
            <path d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z" />
          </svg>
        </button>
      </div>
      <div class="claude-history-list">
        <div
          v-for="conv in conversations"
          :key="conv.id"
          class="claude-history-item"
          @click="emit('select', conv.id)"
        >
          <div class="claude-history-title">
            {{ stripContextBlock(conv.title || '') || 'Untitled' }}
          </div>
          <div class="claude-history-date">
            {{ formatDate(conv.updatedAt) }}
          </div>
        </div>
        <div
          v-if="conversations.length === 0"
          class="claude-history-empty"
        >
          No conversations yet
        </div>
      </div>
    </div>
  </Transition>
</template>

<style>
.claude-history {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.6);
  backdrop-filter: blur(var(--claude-blur-heavy));
  -webkit-backdrop-filter: blur(var(--claude-blur-heavy));
  z-index: 10;
  display: flex;
  flex-direction: column;
}

.claude-history-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 16px 20px;
  background: transparent;
  position: relative;
  z-index: 1;
}

.claude-history-header > span {
  display: flex;
  align-items: center;
  gap: 10px;
  background: rgba(0, 0, 0, 0.4);
  backdrop-filter: blur(12px);
  -webkit-backdrop-filter: blur(12px);
  padding: 8px 14px;
  border-radius: var(--claude-radius-sm);
  border: 1px solid rgba(255, 255, 255, 0.1);
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.3);
  font-weight: 600;
  font-size: 15px;
}

.claude-history-list {
  flex: 1;
  overflow-y: auto;
  padding: 12px;
  padding-top: 70px;
  margin-top: -60px;
}

.claude-history-item {
  padding: 14px 16px;
  border-radius: var(--claude-radius-sm);
  cursor: pointer;
  transition: all 0.2s ease;
  border: 1px solid rgba(255, 255, 255, 0.05);
  margin-bottom: 8px;
  background: rgba(255, 255, 255, 0.03);
}

.claude-history-item:hover {
  background: rgba(254, 154, 0, 0.1);
  border-color: rgba(254, 154, 0, 0.2);
  transform: translateX(4px);
}

.claude-history-title {
  font-weight: 500;
  margin-bottom: 6px;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  color: var(--claude-text);
}

.claude-history-date {
  font-size: 12px;
  color: var(--claude-text-dim);
}

.claude-history-empty {
  text-align: center;
  color: var(--claude-text-muted);
  padding: 48px 24px;
  font-size: 14px;
}

.claude-slide-right-enter-active,
.claude-slide-right-leave-active {
  transition: transform 0.3s cubic-bezier(0.4, 0, 0.2, 1);
}

.claude-slide-right-enter-from,
.claude-slide-right-leave-to {
  transform: translateX(100%);
}
</style>
