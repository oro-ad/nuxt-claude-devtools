# Components Guide

Documentation for all Vue components in this project.

## DemoCard

A flexible card component with header and content areas.

### Props

| Prop | Type | Required | Default | Description |
|------|------|----------|---------|-------------|
| `title` | `string` | Yes | - | Card title text |
| `description` | `string` | No | - | Subtitle/description |

### Slots

| Slot | Description |
|------|-------------|
| `default` | Card content area |

### Usage

```vue
<DemoCard
  title="My Card"
  description="A brief description"
>
  <p>Card content goes here</p>
</DemoCard>
```

### Styling

The card uses CSS variables for theming:
- Background: `var(--color-bg-elevated)`
- Border: `var(--color-border)`
- Hover effect: Border changes to `var(--color-primary)`

---

## DemoButton

An interactive button with ripple effect animation.

### Props

None — button text is passed via slot.

### Events

| Event | Payload | Description |
|-------|---------|-------------|
| `click` | `MouseEvent` | Emitted when button is clicked |

### Slots

| Slot | Description |
|------|-------------|
| `default` | Button label text |

### Usage

```vue
<DemoButton @click="handleClick">
  Click Me
</DemoButton>
```

### Features

- **Ripple Effect**: Click creates expanding ripple animation
- **Hover State**: Arrow icon animates on hover
- **Gradient Background**: Uses primary color gradient

---

## DemoStats

Displays a row of statistics with labels and values.

### Props

| Prop | Type | Required | Description |
|------|------|----------|-------------|
| `stats` | `Array<{ label: string, value: string }>` | Yes | Statistics to display |

### Usage

```vue
<DemoStats
  :stats="[
    { label: 'Users', value: '1,234' },
    { label: 'Downloads', value: '10k+' },
    { label: 'Stars', value: '500+' }
  ]"
/>
```

### Styling

- Values displayed in `var(--color-primary)` color
- Labels in muted text color
- Responsive: Wraps on small screens

---

## Creating New Components

When creating new components, follow this template:

```vue
<script setup lang="ts">
// 1. Imports (if needed from external packages)
import { ref, computed } from 'vue'

// 2. Props with TypeScript interface
const props = defineProps<{
  requiredProp: string
  optionalProp?: number
}>()

// 3. Emits with TypeScript interface
const emit = defineEmits<{
  (e: 'eventName', payload: string): void
}>()

// 4. Local state
const localState = ref('')

// 5. Computed properties
const derivedValue = computed(() => props.requiredProp.toUpperCase())

// 6. Methods
function handleAction() {
  emit('eventName', 'payload')
}
</script>

<template>
  <div class="component-name">
    <!-- Use semantic HTML -->
    <!-- Include ARIA attributes for accessibility -->
  </div>
</template>

<style scoped>
.component-name {
  /* Use CSS variables */
  /* Mobile-first responsive design */
}
</style>
```
