<script lang="ts" setup>
/**
 * Editor header with title, description, and edit/save/cancel buttons
 */

withDefaults(defineProps<{
  /** Title text */
  title: string
  /** Optional description */
  description?: string
  /** Whether in editing mode */
  isEditing: boolean
  /** Icon for the title (carbon icon name) */
  icon?: string
  /** Icon color class */
  iconColor?: string
  /** Whether to show icon */
  showIcon?: boolean
  /** Whether title is mono font */
  monoTitle?: boolean
}>(), {
  iconColor: '',
  showIcon: false,
})

defineEmits<{
  edit: []
  save: []
  cancel: []
}>()
</script>

<template>
  <div class="p-4 border-b border-neutral-200 dark:border-neutral-800 flex items-center justify-between">
    <div>
      <h3
        :class="{ 'font-mono': monoTitle }"
        class="font-bold flex items-center gap-2"
      >
        <NIcon
          v-if="showIcon && icon"
          :class="[iconColor]"
          :icon="icon"
        />
        {{ title }}
      </h3>
      <div
        v-if="description"
        class="text-sm opacity-70"
      >
        {{ description }}
      </div>
      <slot name="subtitle" />
    </div>
    <div class="flex gap-2">
      <template v-if="isEditing">
        <NButton
          n="green"
          @click="$emit('save')"
        >
          <NIcon
            class="mr-1"
            icon="carbon:save"
          />
          Save
        </NButton>
        <NButton
          n="gray"
          @click="$emit('cancel')"
        >
          Cancel
        </NButton>
      </template>
      <template v-else>
        <NButton
          n="blue"
          @click="$emit('edit')"
        >
          <NIcon
            class="mr-1"
            icon="carbon:edit"
          />
          Edit
        </NButton>
      </template>
    </div>
  </div>
</template>
