<script lang="ts" setup>
/**
 * Form error display component
 */
defineProps<{
  /** Error message to display */
  error: string
  /** Additional CSS class */
  class?: string
}>()
</script>

<template>
  <div
    v-if="error"
    :class="$props.class"
  >
    <NTip
      icon="carbon:warning"
      n="red"
    >
      {{ error }}
    </NTip>
  </div>
</template>
