<script lang="ts" setup>
import { computed, ref, watch } from 'vue'

interface Command {
  name: string
  description?: string
}

const props = defineProps<{
  commands: Command[]
  inputValue: string
  cursorPosition: number
  visible: boolean
}>()

const emit = defineEmits<{
  (e: 'select', value: string): void
  (e: 'close'): void
}>()

const selectedIndex = ref(0)

// Extract the current / query from cursor position
const currentQuery = computed(() => {
  if (!props.visible) return ''

  const textBeforeCursor = props.inputValue.slice(0, props.cursorPosition)
  // Match / at start of input or after whitespace
  const match = textBeforeCursor.match(/(?:^|\s)\/(\S*)$/)
  return match ? match[1].toLowerCase() : ''
})

// Filter commands based on current query
const filteredCommands = computed(() => {
  const query = currentQuery.value

  const filtered = props.commands.filter((cmd) => {
    if (!query) return true
    return cmd.name.toLowerCase().includes(query)
      || cmd.description?.toLowerCase().includes(query)
  })

  return filtered
})

// Check if we should show (has matches or empty query)
const shouldShow = computed(() => {
  return props.visible && filteredCommands.value.length > 0
})

// Reset selection when filtered commands change
watch(filteredCommands, () => {
  selectedIndex.value = 0
})

// Close autocomplete when no matches and user has typed something
watch([filteredCommands, currentQuery], ([filtered, query]) => {
  if (props.visible && filtered.length === 0 && query.length > 0) {
    emit('close')
  }
})

function handleKeydown(event: KeyboardEvent) {
  if (!shouldShow.value) return false

  switch (event.key) {
    case 'ArrowDown':
      event.preventDefault()
      selectedIndex.value = (selectedIndex.value + 1) % filteredCommands.value.length
      return true
    case 'ArrowUp':
      event.preventDefault()
      selectedIndex.value = selectedIndex.value === 0
        ? filteredCommands.value.length - 1
        : selectedIndex.value - 1
      return true
    case 'Tab':
    case 'Enter':
      event.preventDefault()
      selectCommand(filteredCommands.value[selectedIndex.value])
      return true
    case 'Escape':
      event.preventDefault()
      emit('close')
      return true
  }
  return false
}

function selectCommand(cmd: Command) {
  emit('select', cmd.name)
}

// Expose handleKeydown for parent component
defineExpose({ handleKeydown })
</script>

<template>
  <Transition name="dropdown">
    <div
      v-if="shouldShow"
      class="absolute bottom-full left-0 mb-1 w-full max-w-md z-50"
    >
      <div class="n-bg-base border border-neutral-200 dark:border-neutral-700 rounded-lg shadow-lg overflow-hidden">
        <div class="px-3 py-2 border-b border-neutral-200 dark:border-neutral-700 text-xs opacity-60 flex items-center gap-2">
          <NIcon icon="carbon:terminal" />
          <span>Slash Commands</span>
          <span class="ml-auto opacity-50">Tab/Enter to select</span>
        </div>
        <div class="max-h-48 overflow-y-auto">
          <button
            v-for="(cmd, index) in filteredCommands"
            :key="cmd.name"
            :class="[
              'w-full px-3 py-2 text-left flex items-center gap-2 text-sm transition-colors',
              index === selectedIndex
                ? 'bg-green-500/20 text-green-600 dark:text-green-400'
                : 'hover:bg-neutral-100 dark:hover:bg-neutral-800',
            ]"
            type="button"
            @click="selectCommand(cmd)"
            @mouseenter="selectedIndex = index"
          >
            <NIcon
              class="opacity-50 text-green-500"
              icon="carbon:terminal"
            />
            <div class="flex-1 min-w-0">
              <div class="font-mono truncate">
                /{{ cmd.name }}
              </div>
              <div
                v-if="cmd.description"
                class="text-xs opacity-50 truncate"
              >
                {{ cmd.description }}
              </div>
            </div>
          </button>
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
