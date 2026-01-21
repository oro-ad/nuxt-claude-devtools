<script setup lang="ts">
interface Conversation {
  id: string
  title?: string
  messages: unknown[]
  createdAt: string
  updatedAt: string
  projectPath: string
}

const props = defineProps<{
  conversations: Conversation[]
  activeId: string | null
  isOpen: boolean
}>()

const emit = defineEmits<{
  (e: 'select', id: string): void
  (e: 'delete', id: string): void
  (e: 'new'): void
  (e: 'close'): void
}>()

function formatDate(dateStr: string): string {
  const date = new Date(dateStr)
  const now = new Date()
  const diffMs = now.getTime() - date.getTime()
  const diffMins = Math.floor(diffMs / 60000)
  const diffHours = Math.floor(diffMins / 60)
  const diffDays = Math.floor(diffHours / 24)

  if (diffMins < 1) return 'just now'
  if (diffMins < 60) return `${diffMins}m ago`
  if (diffHours < 24) return `${diffHours}h ago`
  if (diffDays < 7) return `${diffDays}d ago`

  return date.toLocaleDateString(undefined, {
    month: 'short',
    day: 'numeric',
  })
}

function handleDelete(e: Event, id: string) {
  e.stopPropagation()
  if (confirm('Delete this conversation?')) {
    emit('delete', id)
  }
}
</script>

<template>
  <Transition name="slide">
    <div
      v-if="isOpen"
      class="history-sidebar w-72 h-full border-r border-gray-200 dark:border-gray-700 flex flex-col n-bg-base absolute left-0 top-0 z-10 shadow-lg"
    >
      <!-- Header -->
      <div class="p-3 border-b border-gray-200 dark:border-gray-700 flex items-center justify-between">
        <h2 class="font-semibold text-sm">
          Chat History
        </h2>
        <button
          class="p-1 hover:bg-gray-100 dark:hover:bg-gray-800 rounded transition-colors"
          @click="emit('close')"
        >
          <NIcon icon="carbon:close" />
        </button>
      </div>

      <!-- New Chat Button -->
      <div class="p-3 border-b border-gray-200 dark:border-gray-700">
        <NButton
          n="blue"
          class="w-full"
          @click="emit('new')"
        >
          <NIcon
            icon="carbon:add"
            class="mr-1"
          />
          New Chat
        </NButton>
      </div>

      <!-- Conversations List -->
      <div class="flex-1 overflow-y-auto">
        <div
          v-for="conv in conversations"
          :key="conv.id"
          :class="{ 'bg-blue-500/10 border-l-2 border-l-blue-500': conv.id === activeId }"
          class="p-3 border-b border-gray-100 dark:border-gray-800 cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-800 group transition-colors"
          @click="emit('select', conv.id)"
        >
          <div class="flex items-start justify-between gap-2">
            <div class="flex-1 min-w-0">
              <div class="font-medium text-sm truncate">
                {{ conv.title || 'New conversation' }}
              </div>
              <div class="text-xs opacity-50 mt-1 flex items-center gap-2">
                <span>{{ formatDate(conv.updatedAt) }}</span>
                <span class="opacity-50">|</span>
                <span>{{ conv.messages.length }} msgs</span>
              </div>
            </div>
            <button
              class="opacity-0 group-hover:opacity-100 p-1 hover:bg-red-100 dark:hover:bg-red-900/20 rounded transition-opacity"
              title="Delete conversation"
              @click="handleDelete($event, conv.id)"
            >
              <NIcon
                icon="carbon:trash-can"
                class="text-red-500 text-sm"
              />
            </button>
          </div>
        </div>

        <!-- Empty state -->
        <div
          v-if="conversations.length === 0"
          class="p-4 text-center opacity-50 text-sm"
        >
          <NIcon
            icon="carbon:chat"
            class="text-2xl mb-2"
          />
          <p>No conversations yet</p>
        </div>
      </div>
    </div>
  </Transition>
</template>

<style scoped>
.slide-enter-active,
.slide-leave-active {
  transition: transform 0.2s ease;
}

.slide-enter-from,
.slide-leave-to {
  transform: translateX(-100%);
}
</style>
