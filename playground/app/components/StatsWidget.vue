<script lang="ts" setup>
import { computed } from 'vue'

const props = defineProps<{
  label: string
  value: number
  change?: number
  icon?: string
}>()

const changeClass = computed(() => {
  if (!props.change) return ''
  return props.change > 0 ? 'positive' : 'negative'
})

const changeText = computed(() => {
  if (!props.change) return ''
  const sign = props.change > 0 ? '+' : ''
  return `${sign}${props.change}%`
})
</script>

<template>
  <div class="stats-widget">
    <div class="header">
      <span class="icon">{{ icon || '📊' }}</span>
      <span class="label">{{ label }}</span>
    </div>
    <div class="value">
      {{ value.toLocaleString() }}
    </div>
    <div
      v-if="change !== undefined"
      :class="['change', changeClass]"
    >
      {{ changeText }} from last month
    </div>
  </div>
</template>

<style scoped>
.stats-widget {
  padding: 20px;
  border: 1px solid #e0e0e0;
  border-radius: 12px;
  background: #fff;
  min-width: 200px;
}

.header {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 12px;
}

.icon {
  font-size: 20px;
}

.label {
  font-size: 14px;
  color: #6b7280;
  font-weight: 500;
}

.value {
  font-size: 32px;
  font-weight: bold;
  color: #1f2937;
  margin-bottom: 8px;
}

.change {
  font-size: 13px;
}

.positive {
  color: #059669;
}

.negative {
  color: #dc2626;
}
</style>
