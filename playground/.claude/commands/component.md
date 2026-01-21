# /component — Generate Vue Component

Create a new Vue 3 component with TypeScript and Composition API.

## Usage

```
/component ComponentName
```

## Instructions

When the user runs this command, generate a Vue component with:

1. **Script Setup**: Use `<script setup lang="ts">`
2. **Props**: Define typed props using `defineProps<T>()`
3. **Emits**: Define typed emits using `defineEmits<T>()`
4. **Styling**: Add scoped styles with CSS variables
5. **Accessibility**: Include ARIA attributes where needed

## Template

```vue
<script setup lang="ts">
// Props
const props = defineProps<{
  // Add props here
}>()

// Emits
const emit = defineEmits<{
  // Add emits here
}>()

// State and logic here
</script>

<template>
  <div class="component-name">
    <!-- Component content -->
  </div>
</template>

<style scoped>
.component-name {
  /* Styles using CSS variables */
}
</style>
```

## Example

User: `/component UserAvatar`

Creates a UserAvatar.vue component with appropriate props (src, alt, size) and styles.
