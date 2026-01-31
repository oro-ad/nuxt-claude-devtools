<script setup lang="ts">
defineProps<{
  stats: Array<{
    label: string
    value: string
  }>
}>()
</script>

<template>
  <div class="demo-stats">
    <div
      v-for="stat in stats"
      :key="stat.label"
      class="stat-item"
    >
      <div class="stat-value">
        {{ stat.value }}
      </div>
      <div class="stat-label">
        {{ stat.label }}
      </div>
    </div>
  </div>
</template>

<style scoped>
.demo-stats {
  display: flex;
  gap: 32px;
  padding: 24px 32px;
  background: var(--color-bg-elevated, #1a1a1a);
  border: 1px solid var(--color-border, #333);
  border-radius: 12px;
  transition: all 0.2s;
}

.demo-stats:hover {
  border-color: var(--color-primary, #10a37f);
  transform: translateY(-2px);
}

.stat-item {
  text-align: center;
}

.stat-value {
  font-size: 28px;
  font-weight: 700;
  color: var(--color-primary, #10a37f);
  line-height: 1;
  margin-bottom: 4px;
}

.stat-label {
  font-size: 13px;
  color: var(--color-text-muted, #a0a0a0);
}
</style>
