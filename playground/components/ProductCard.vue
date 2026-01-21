<script lang="ts" setup>
defineProps<{
  title: string
  price: number
  description?: string
  inStock?: boolean
}>()

const emit = defineEmits<{
  (e: 'add-to-cart'): void
}>()
</script>

<template>
  <div class="product-card">
    <div class="product-image">
      <span class="placeholder-icon">📦</span>
    </div>
    <div class="product-info">
      <h3>{{ title }}</h3>
      <p
        v-if="description"
        class="description"
      >
        {{ description }}
      </p>
      <div class="footer">
        <span class="price">${{ price.toFixed(2) }}</span>
        <span
          :class="['stock', inStock ? 'in-stock' : 'out-of-stock']"
        >
          {{ inStock ? 'In Stock' : 'Out of Stock' }}
        </span>
      </div>
      <button
        :disabled="!inStock"
        class="add-btn"
        @click="emit('add-to-cart')"
      >
        Add to Cart
      </button>
    </div>
  </div>
</template>

<style scoped>
.product-card {
  border: 1px solid #e0e0e0;
  border-radius: 12px;
  overflow: hidden;
  background: #fff;
  max-width: 280px;
}

.product-image {
  height: 120px;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  display: flex;
  align-items: center;
  justify-content: center;
}

.placeholder-icon {
  font-size: 48px;
}

.product-info {
  padding: 16px;
}

.product-info h3 {
  margin: 0 0 8px;
  font-size: 18px;
  color: #1f2937;
}

.description {
  margin: 0 0 12px;
  font-size: 14px;
  color: #6b7280;
}

.footer {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 12px;
}

.price {
  font-size: 20px;
  font-weight: bold;
  color: #059669;
}

.stock {
  font-size: 12px;
  padding: 4px 8px;
  border-radius: 4px;
}

.in-stock {
  background: #d1fae5;
  color: #065f46;
}

.out-of-stock {
  background: #fee2e2;
  color: #991b1b;
}

.add-btn {
  width: 100%;
  padding: 10px;
  border: none;
  border-radius: 6px;
  background: #6366f1;
  color: white;
  font-weight: 500;
  cursor: pointer;
  transition: background 0.2s;
}

.add-btn:hover:not(:disabled) {
  background: #4f46e5;
}

.add-btn:disabled {
  background: #d1d5db;
  cursor: not-allowed;
}
</style>
