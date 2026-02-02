<script setup lang="ts">
defineProps<{
  statusColor: 'green' | 'blue' | 'red'
  showShareCopied: boolean
  isMobile: boolean
}>()

const emit = defineEmits<{
  share: []
  history: []
  newChat: []
  dragStart: [e: MouseEvent]
}>()
</script>

<template>
  <div class="claude-header">
    <div
      :class="['claude-header-left', { 'claude-header-draggable': !isMobile }]"
      @mousedown="(e) => !isMobile && emit('dragStart', e)"
    >
      <span class="claude-header-title">Claude</span>
      <span :class="['claude-status-dot', `claude-status-dot-${statusColor}`]" />
    </div>
    <div class="claude-header-actions">
      <!-- Share button -->
      <button
        :class="{ 'claude-btn-success': showShareCopied }"
        :title="showShareCopied ? 'Link copied!' : 'Share chat'"
        class="claude-btn-icon"
        @click="emit('share')"
      >
        <svg
          v-if="showShareCopied"
          fill="currentColor"
          height="18"
          viewBox="0 0 24 24"
          width="18"
        >
          <path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z" />
        </svg>
        <svg
          v-else
          fill="currentColor"
          height="18"
          viewBox="0 0 24 24"
          width="18"
        >
          <path d="M18 16.08c-.76 0-1.44.3-1.96.77L8.91 12.7c.05-.23.09-.46.09-.7s-.04-.47-.09-.7l7.05-4.11c.54.5 1.25.81 2.04.81 1.66 0 3-1.34 3-3s-1.34-3-3-3-3 1.34-3 3c0 .24.04.47.09.7L8.04 9.81C7.5 9.31 6.79 9 6 9c-1.66 0-3 1.34-3 3s1.34 3 3 3c.79 0 1.5-.31 2.04-.81l7.12 4.16c-.05.21-.08.43-.08.65 0 1.61 1.31 2.92 2.92 2.92s2.92-1.31 2.92-2.92-1.31-2.92-2.92-2.92z" />
        </svg>
      </button>
      <!-- History button -->
      <button
        class="claude-btn-icon"
        title="History"
        @click="emit('history')"
      >
        <svg
          fill="currentColor"
          height="18"
          viewBox="0 0 24 24"
          width="18"
        >
          <path d="M13 3a9 9 0 0 0-9 9H1l3.89 3.89.07.14L9 12H6c0-3.87 3.13-7 7-7s7 3.13 7 7-3.13 7-7 7c-1.93 0-3.68-.79-4.94-2.06l-1.42 1.42A8.954 8.954 0 0 0 13 21a9 9 0 0 0 0-18zm-1 5v5l4.28 2.54.72-1.21-3.5-2.08V8H12z" />
        </svg>
      </button>
      <!-- New chat button -->
      <button
        class="claude-btn-icon"
        title="New chat"
        @click="emit('newChat')"
      >
        <svg
          fill="currentColor"
          height="18"
          viewBox="0 0 24 24"
          width="18"
        >
          <path d="M19 13h-6v6h-2v-6H5v-2h6V5h2v6h6v2z" />
        </svg>
      </button>
    </div>
  </div>
</template>

<style>
.claude-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 16px 20px;
  background: transparent;
  flex-shrink: 0;
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  z-index: 10;
  pointer-events: none;
}

.claude-header > * {
  pointer-events: auto;
}

.claude-header-draggable {
  cursor: grab;
}

.claude-header-draggable:active {
  cursor: grabbing;
}

.claude-header-left {
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
}

.claude-header-title {
  font-weight: 600;
  font-size: 15px;
  color: rgba(255, 255, 255, 0.95);
}

.claude-status-dot {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  flex-shrink: 0;
}

.claude-status-dot-green {
  background: #4ade80;
  box-shadow: 0 0 8px rgba(74, 222, 128, 0.6);
}

.claude-status-dot-blue {
  background: #FBBF24;
  box-shadow: 0 0 8px rgba(251, 191, 36, 0.6);
  animation: claude-status-pulse 1.5s ease-in-out infinite;
}

.claude-status-dot-red {
  background: #f87171;
  box-shadow: 0 0 8px rgba(248, 113, 113, 0.6);
}

@keyframes claude-status-pulse {
  0%, 100% { opacity: 1; }
  50% { opacity: 0.5; }
}

.claude-header-actions {
  display: flex;
  gap: 8px;
}

.claude-btn-icon {
  width: 38px;
  height: 38px;
  border: 1px solid rgba(255, 255, 255, 0.1);
  background: rgba(0, 0, 0, 0.4);
  backdrop-filter: blur(12px);
  -webkit-backdrop-filter: blur(12px);
  color: rgba(255, 255, 255, 0.7);
  cursor: pointer;
  border-radius: var(--claude-radius-sm);
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.2s ease;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.3);
}

.claude-btn-icon:hover {
  background: rgba(0, 0, 0, 0.5);
  color: #fff;
  border-color: rgba(255, 255, 255, 0.2);
  transform: translateY(-2px);
  box-shadow: 0 6px 16px rgba(0, 0, 0, 0.4);
}

.claude-btn-success {
  color: #4ade80 !important;
  background: rgba(74, 222, 128, 0.2) !important;
  border-color: rgba(74, 222, 128, 0.3) !important;
}

@media (max-width: 640px) {
  .claude-header {
    top: 36px;
    padding: 6px 16px;
  }

  .claude-header-left {
    padding: 8px 12px;
  }

  .claude-btn-icon {
    width: 44px;
    height: 44px;
  }
}
</style>
