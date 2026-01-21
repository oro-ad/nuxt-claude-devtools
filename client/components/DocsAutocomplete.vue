<script lang="ts" setup>
import { computed, ref, watch } from 'vue'

interface DocFile {
  path: string
  name: string
}

const props = defineProps<{
  docs: DocFile[]
  inputValue: string
  cursorPosition: number
  visible: boolean
}>()

const emit = defineEmits<{
  (e: 'select', value: string): void
  (e: 'close'): void
}>()

const selectedIndex = ref(0)

// Extract the current @docs/ query from cursor position
const currentQuery = computed(() => {
  if (!props.visible) return ''

  const textBeforeCursor = props.inputValue.slice(0, props.cursorPosition)
  const match = textBeforeCursor.match(/@docs\/(\S*)$/)
  return match ? match[1].toLowerCase() : ''
})

// Filter docs based on current query
const filteredDocs = computed(() => {
  const query = currentQuery.value
  if (!query) return props.docs

  return props.docs.filter(doc =>
    doc.path.toLowerCase().includes(query)
    || doc.name.toLowerCase().includes(query),
  )
})

// Reset selection when filtered docs change
watch(filteredDocs, () => {
  selectedIndex.value = 0
})

function handleKeydown(event: KeyboardEvent) {
  if (!props.visible || filteredDocs.value.length === 0) return false

  switch (event.key) {
    case 'ArrowDown':
      event.preventDefault()
      selectedIndex.value = (selectedIndex.value + 1) % filteredDocs.value.length
      return true
    case 'ArrowUp':
      event.preventDefault()
      selectedIndex.value = selectedIndex.value === 0
        ? filteredDocs.value.length - 1
        : selectedIndex.value - 1
      return true
    case 'Tab':
    case 'Enter':
      event.preventDefault()
      selectDoc(filteredDocs.value[selectedIndex.value])
      return true
    case 'Escape':
      event.preventDefault()
      emit('close')
      return true
  }
  return false
}

function selectDoc(doc: DocFile) {
  emit('select', doc.path)
}

// Expose handleKeydown for parent component
defineExpose({ handleKeydown })
</script>

<template>
  <Transition name="dropdown">
    <div
      v-if="visible && filteredDocs.length > 0"
      class="absolute bottom-full left-0 mb-1 w-full max-w-md z-50"
    >
      <div class="n-bg-base border border-neutral-200 dark:border-neutral-700 rounded-lg shadow-lg overflow-hidden">
        <div class="px-3 py-2 border-b border-neutral-200 dark:border-neutral-700 text-xs opacity-60 flex items-center gap-2">
          <NIcon icon="carbon:document" />
          <span>Select a document</span>
          <span class="ml-auto opacity-50">Tab/Enter to select</span>
        </div>
        <div class="max-h-48 overflow-y-auto">
          <button
            v-for="(doc, index) in filteredDocs"
            :key="doc.path"
            :class="[
              'w-full px-3 py-2 text-left flex items-center gap-2 text-sm transition-colors',
              index === selectedIndex
                ? 'bg-blue-500/20 text-blue-600 dark:text-blue-400'
                : 'hover:bg-neutral-100 dark:hover:bg-neutral-800',
            ]"
            type="button"
            @click="selectDoc(doc)"
            @mouseenter="selectedIndex = index"
          >
            <NIcon
              class="opacity-50"
              icon="carbon:document"
            />
            <span class="truncate">{{ doc.path }}</span>
          </button>
        </div>
        <div
          v-if="filteredDocs.length === 0"
          class="px-3 py-4 text-center text-sm opacity-50"
        >
          No documents found
        </div>
      </div>
    </div>
  </Transition>
</template>

<style scoped>
.dropdown-enter-active,
.dropdown-leave-active {
  transition: all 0.15s ease;
}

.dropdown-enter-from,
.dropdown-leave-to {
  opacity: 0;
  transform: translateY(8px);
}
</style>
