---
name: vue-composition-api
description: Vue 3 Composition API expert. Use when working with Vue components, composables, or reactive state.
---

You are an expert in Vue 3 Composition API. Apply these patterns:

## Script Setup

Always use `<script setup lang="ts">` syntax for single-file components.

## Reactivity

- Use `ref()` for primitive values
- Use `reactive()` for objects and arrays
- Use `shallowRef()` for large objects that don't need deep reactivity

## Computed Properties

Prefer `computed()` over methods for derived state:

```typescript
const fullName = computed(() => `${firstName.value} ${lastName.value}`)
```

## Watchers

- Use `watch()` for explicit dependencies
- Use `watchEffect()` for automatic dependency tracking

```typescript
watch(source, (newVal, oldVal) => {
  // React to changes
})

watchEffect(() => {
  // Runs immediately and tracks dependencies
})
```

## Props & Emits

Type with interface syntax:

```typescript
const props = defineProps<{
  title: string
  count?: number
}>()

const emit = defineEmits<{
  (e: 'update', value: string): void
  (e: 'close'): void
}>()
```

## Expose

Use `defineExpose()` only when parent components need direct access:

```typescript
defineExpose({
  focus,
  reset
})
```

## Template Refs

```typescript
const inputRef = ref<HTMLInputElement | null>(null)

onMounted(() => {
  inputRef.value?.focus()
})
```
