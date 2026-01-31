<script setup lang="ts">
/**
 * Custom select component using divs for cross-browser consistency
 */
import { computed, ref } from 'vue'
import { onClickOutside } from '@vueuse/core'

export interface SelectOption {
  value: string
  label: string
}

const props = defineProps<{
  modelValue: string
  options: SelectOption[]
  placeholder?: string
  disabled?: boolean
}>()

const emit = defineEmits<{
  'update:modelValue': [value: string]
}>()

const isOpen = ref(false)
const selectRef = ref<HTMLElement | null>(null)

const selectedLabel = computed(() => {
  const option = props.options.find(o => o.value === props.modelValue)
  return option?.label || props.placeholder || ''
})

const isPlaceholder = computed(() => {
  return !props.options.find(o => o.value === props.modelValue)
})

function toggle() {
  if (props.disabled) return
  isOpen.value = !isOpen.value
}

function selectOption(option: SelectOption) {
  emit('update:modelValue', option.value)
  isOpen.value = false
}

onClickOutside(selectRef, () => {
  isOpen.value = false
})
</script>

<template>
  <div
    ref="selectRef"
    class="n-select relative"
  >
    <div
      :class="[
        'flex items-center justify-between border n-border-base rounded n-bg-base py-1 px-2 cursor-pointer',
        isOpen ? 'border-context n-focus-base' : 'hover:border-neutral-400 dark:hover:border-neutral-600',
        disabled ? 'opacity-50 cursor-not-allowed' : '',
      ]"
      @click="toggle"
    >
      <span :class="isPlaceholder ? 'opacity-50' : ''">
        {{ selectedLabel }}
      </span>
      <NIcon
        :class="['transition-transform duration-150 op50 ml-2 flex-shrink-0', isOpen ? 'rotate-180' : '']"
        icon="carbon:chevron-down"
      />
    </div>

    <Transition
      enter-active-class="transition duration-100 ease-out"
      enter-from-class="opacity-0 -translate-y-1"
      enter-to-class="opacity-100 translate-y-0"
      leave-active-class="transition duration-75 ease-in"
      leave-from-class="opacity-100 translate-y-0"
      leave-to-class="opacity-0 -translate-y-1"
    >
      <div
        v-if="isOpen"
        class="absolute z-50 mt-1 w-full border n-border-base rounded n-bg-base shadow-lg max-h-60 overflow-auto"
      >
        <div
          v-for="option in options"
          :key="option.value"
          :class="[
            'px-3 py-1.5 cursor-pointer',
            'hover:n-bg-active',
            option.value === modelValue ? 'n-bg-active font-medium' : '',
          ]"
          @click="selectOption(option)"
        >
          {{ option.label }}
        </div>
      </div>
    </Transition>
  </div>
</template>
