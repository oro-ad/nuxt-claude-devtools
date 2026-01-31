<script lang="ts" setup>
defineProps<{
  name: string
  email: string
  avatar?: string
}>()
</script>

<template>
  <div class="user-card">
    <div class="avatar">
      <img
        v-if="avatar"
        :alt="name"
        :src="avatar"
      >
      <div
        v-else
        class="avatar-placeholder"
      >
        {{ name.charAt(0).toUpperCase() }}
      </div>
    </div>
    <div class="info">
      <h3>{{ name }}</h3>
      <p>{{ email }}</p>
    </div>
  </div>
</template>

<style scoped>
.user-card {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 16px;
  border: 1px solid #e0e0e0;
  border-radius: 8px;
  background: #fff;
}

.avatar {
  width: 48px;
  height: 48px;
  border-radius: 50%;
  overflow: hidden;
}

.avatar img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.avatar-placeholder {
  width: 100%;
  height: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
  background: #6366f1;
  color: white;
  font-weight: bold;
  font-size: 18px;
}

.info h3 {
  margin: 0;
  font-size: 16px;
  color: #1f2937;
}

.info p {
  margin: 4px 0 0;
  font-size: 14px;
  color: #6b7280;
}
</style>
