<script setup lang="ts">
import { ref, watch } from 'vue'

const props = defineProps<{
  statusColor: 'green' | 'blue' | 'red'
  position: { x: number, y: number }
}>()

const emit = defineEmits<{
  click: []
  dragEnd: [position: { x: number, y: number }]
}>()

const badgeRef = ref<HTMLElement | null>(null)
const isDragging = ref(false)
const dragStart = ref({ x: 0, y: 0, posX: 0, posY: 0 })
const dragMoved = ref(false)
const currentPos = ref({ x: props.position.x, y: props.position.y })

function handleDragStart(e: MouseEvent | TouchEvent) {
  const clientX = 'touches' in e ? e.touches[0]?.clientX ?? 0 : e.clientX
  const clientY = 'touches' in e ? e.touches[0]?.clientY ?? 0 : e.clientY

  dragStart.value = {
    x: clientX,
    y: clientY,
    posX: currentPos.value.x,
    posY: currentPos.value.y,
  }
  isDragging.value = true
  dragMoved.value = false

  window.addEventListener('mousemove', handleDragMove)
  window.addEventListener('mouseup', handleDragEnd)
  window.addEventListener('touchmove', handleDragMove, { passive: false })
  window.addEventListener('touchend', handleDragEnd)
}

function handleDragMove(e: MouseEvent | TouchEvent) {
  if (!isDragging.value) return
  e.preventDefault()

  const clientX = 'touches' in e ? e.touches[0]?.clientX ?? 0 : e.clientX
  const clientY = 'touches' in e ? e.touches[0]?.clientY ?? 0 : e.clientY

  // Right/bottom positioning - invert deltas
  const deltaX = dragStart.value.x - clientX
  const deltaY = dragStart.value.y - clientY

  if (Math.abs(deltaX) > 5 || Math.abs(deltaY) > 5) {
    dragMoved.value = true
  }

  const vw = window.innerWidth
  const vh = window.innerHeight
  const padding = 16

  let newX = dragStart.value.posX + deltaX
  let newY = dragStart.value.posY + deltaY

  // Constrain to viewport (with badge size ~100x40)
  newX = Math.max(padding, Math.min(vw - 120, newX))
  newY = Math.max(padding, Math.min(vh - 60, newY))

  currentPos.value = { x: newX, y: newY }
}

function handleDragEnd() {
  isDragging.value = false
  window.removeEventListener('mousemove', handleDragMove)
  window.removeEventListener('mouseup', handleDragEnd)
  window.removeEventListener('touchmove', handleDragMove)
  window.removeEventListener('touchend', handleDragEnd)

  if (dragMoved.value) {
    emit('dragEnd', currentPos.value)
  }
}

function handleClick() {
  if (!dragMoved.value) {
    emit('click')
  }
}

// Update local position when prop changes
watch(() => props.position, (newPos) => {
  currentPos.value = { x: newPos.x, y: newPos.y }
}, { immediate: true, deep: true })
</script>

<template>
  <button
    ref="badgeRef"
    :class="['claude-badge', { 'claude-badge-dragging': isDragging }]"
    :style="{ right: `${currentPos.x}px`, bottom: `${currentPos.y}px` }"
    title="Chat with Claude (Ctrl+Shift+K) — drag to move"
    @click="handleClick"
    @mousedown="handleDragStart"
    @touchstart="handleDragStart"
  >
    <span class="claude-badge-title">Claude</span>
    <span :class="['claude-badge-status', `claude-badge-status-${statusColor}`]" />
  </button>
</template>

<style>
.claude-badge {
  position: fixed;
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 10px 16px;
  background: rgba(0, 0, 0, 0.6);
  backdrop-filter: blur(20px);
  -webkit-backdrop-filter: blur(20px);
  border: 1px solid rgba(255, 255, 255, 0.15);
  border-radius: var(--claude-radius-sm);
  color: rgba(255, 255, 255, 0.95);
  cursor: pointer;
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.4),
    0 0 0 1px rgba(254, 154, 0, 0.1);
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
  z-index: 99998;
  font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
}

.claude-badge:hover {
  transform: translateY(-2px);
  background: rgba(0, 0, 0, 0.7);
  border-color: rgba(254, 154, 0, 0.3);
  box-shadow: 0 12px 40px rgba(0, 0, 0, 0.5),
    0 0 30px rgba(254, 154, 0, 0.15);
}

.claude-badge-dragging {
  cursor: grabbing;
  transform: scale(1.05);
  box-shadow: 0 16px 50px rgba(0, 0, 0, 0.6),
    0 0 40px rgba(254, 154, 0, 0.2);
  transition: none;
}

.claude-badge-title {
  font-weight: 600;
  font-size: 14px;
  letter-spacing: 0.01em;
}

.claude-badge-status {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  flex-shrink: 0;
}

.claude-badge-status-green {
  background: #4ade80;
  box-shadow: 0 0 8px rgba(74, 222, 128, 0.6);
}

.claude-badge-status-blue {
  background: #FBBF24;
  box-shadow: 0 0 8px rgba(251, 191, 36, 0.6);
  animation: claude-badge-pulse 1.5s ease-in-out infinite;
}

.claude-badge-status-red {
  background: #f87171;
  box-shadow: 0 0 8px rgba(248, 113, 113, 0.6);
}

@keyframes claude-badge-pulse {
  0%, 100% { opacity: 1; }
  50% { opacity: 0.5; }
}

@media (max-width: 640px) {
  .claude-badge {
    padding: 8px 14px;
  }

  .claude-badge-title {
    font-size: 13px;
  }
}
</style>
