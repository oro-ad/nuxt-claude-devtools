<script setup lang="ts">
import { ref } from 'vue'

const isHovered = ref(false)
const ripples = ref<Array<{ id: number, x: number, y: number }>>([])
let rippleId = 0

function handleClick(e: MouseEvent) {
  const rect = (e.currentTarget as HTMLElement).getBoundingClientRect()
  const x = e.clientX - rect.left
  const y = e.clientY - rect.top

  const id = rippleId++
  ripples.value.push({ id, x, y })

  setTimeout(() => {
    ripples.value = ripples.value.filter(r => r.id !== id)
  }, 600)
}
</script>

<template>
  <button
    class="demo-button"
    :class="{ hovered: isHovered }"
    @click="handleClick"
    @mouseenter="isHovered = true"
    @mouseleave="isHovered = false"
  >
    <span class="button-content">
      <slot />
    </span>
    <span class="button-icon">→</span>
    <span
      v-for="ripple in ripples"
      :key="ripple.id"
      class="ripple"
      :style="{ left: ripple.x + 'px', top: ripple.y + 'px' }"
    />
  </button>
</template>

<style scoped>
.demo-button {
  position: relative;
  display: inline-flex;
  align-items: center;
  gap: 8px;
  padding: 16px 32px;
  background: linear-gradient(135deg, var(--color-primary, #10a37f) 0%, #0d8a6a 100%);
  color: white;
  border: none;
  border-radius: 12px;
  font-size: 16px;
  font-weight: 500;
  cursor: pointer;
  overflow: hidden;
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
}

.demo-button:hover {
  transform: translateY(-2px);
  box-shadow: 0 10px 30px rgba(16, 163, 127, 0.3);
}

.demo-button:active {
  transform: translateY(0);
}

.button-content {
  position: relative;
  z-index: 1;
}

.button-icon {
  position: relative;
  z-index: 1;
  transition: transform 0.3s;
}

.demo-button:hover .button-icon {
  transform: translateX(4px);
}

.ripple {
  position: absolute;
  width: 100px;
  height: 100px;
  margin-left: -50px;
  margin-top: -50px;
  background: rgba(255, 255, 255, 0.3);
  border-radius: 50%;
  animation: ripple 0.6s ease-out;
  pointer-events: none;
}

@keyframes ripple {
  from {
    transform: scale(0);
    opacity: 1;
  }
  to {
    transform: scale(4);
    opacity: 0;
  }
}
</style>
