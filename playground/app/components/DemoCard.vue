<script setup lang="ts">
defineProps<{
  title: string
  description?: string
}>()
</script>

<template>
  <div class="demo-card">
    <div class="card-header">
      <h3>{{ title }}</h3>
      <p
        v-if="description"
        class="card-description"
      >
        {{ description }}
      </p>
    </div>
    <div class="card-content">
      <slot />
    </div>
  </div>
</template>

<style scoped>
.demo-card {
  background: var(--color-bg-elevated, #1a1a1a);
  border: 1px solid var(--color-border, #333);
  border-radius: 12px;
  overflow: hidden;
  max-width: 320px;
  transition: all 0.2s;
}

.demo-card:hover {
  border-color: var(--color-primary, #10a37f);
  transform: translateY(-2px);
}

.card-header {
  padding: 20px;
  border-bottom: 1px solid var(--color-border, #333);
}

.card-header h3 {
  margin: 0 0 4px;
  font-size: 18px;
  color: var(--color-text, #fff);
}

.card-description {
  margin: 0;
  font-size: 13px;
  color: var(--color-text-muted, #a0a0a0);
}

.card-content {
  padding: 20px;
  font-size: 14px;
  color: var(--color-text-muted, #a0a0a0);
  line-height: 1.6;
}

.card-content p {
  margin: 0;
}
</style>
