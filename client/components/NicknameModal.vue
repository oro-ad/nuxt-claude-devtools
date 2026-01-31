<script lang="ts" setup>
import { ref } from 'vue'

// eslint-disable-next-line @typescript-eslint/no-unused-vars
const props = defineProps<{
  visible: boolean
  error?: string
}>()

const emit = defineEmits<{
  submit: [nickname: string]
  cancel: []
}>()

const nickname = ref('')
const localError = ref('')

function handleSubmit() {
  const trimmed = nickname.value.trim()
  if (!trimmed) {
    localError.value = 'Please enter a nickname'
    return
  }
  if (trimmed.length < 2) {
    localError.value = 'Nickname must be at least 2 characters'
    return
  }
  if (trimmed.length > 20) {
    localError.value = 'Nickname must be 20 characters or less'
    return
  }
  localError.value = ''
  emit('submit', trimmed)
}

function handleKeydown(e: KeyboardEvent) {
  if (e.key === 'Enter') {
    handleSubmit()
  }
  else if (e.key === 'Escape') {
    emit('cancel')
  }
}
</script>

<template>
  <Teleport to="body">
    <div
      v-if="visible"
      class="fixed inset-0 z-50 flex items-center justify-center"
    >
      <!-- Backdrop -->
      <div
        class="absolute inset-0 bg-black/50 backdrop-blur-sm"
        @click="emit('cancel')"
      />

      <!-- Modal -->
      <div class="relative z-10 w-full max-w-md mx-4 p-6 rounded-xl n-bg-base border border-neutral-200 dark:border-neutral-700 shadow-2xl">
        <div class="text-center mb-6">
          <div class="w-16 h-16 mx-auto mb-4 rounded-full bg-gradient-to-br from-green-500/20 to-blue-500/20 flex items-center justify-center">
            <NIcon
              class="text-3xl text-green-500"
              icon="carbon:user-avatar"
            />
          </div>
          <h2 class="text-xl font-bold mb-2">
            Join Collaborative Session
          </h2>
          <p class="text-sm text-neutral-500 dark:text-neutral-400">
            Enter a nickname to identify yourself in the chat
          </p>
        </div>

        <div class="space-y-4">
          <div>
            <label
              class="block text-sm font-medium mb-2"
              for="nickname"
            >
              Nickname
            </label>
            <input
              id="nickname"
              v-model="nickname"
              :class="{ 'border-red-500 focus:ring-red-500': localError || error }"
              autofocus
              class="w-full px-4 py-3 rounded-lg n-bg-base border border-neutral-200 dark:border-neutral-700 focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent"
              placeholder="Your nickname"
              type="text"
              @keydown="handleKeydown"
            >
            <p
              v-if="localError || error"
              class="mt-2 text-sm text-red-500"
            >
              {{ localError || error }}
            </p>
          </div>

          <div class="flex gap-3">
            <NButton
              class="flex-1"
              n="gray"
              @click="emit('cancel')"
            >
              Cancel
            </NButton>
            <NButton
              class="flex-1"
              n="green"
              @click="handleSubmit"
            >
              <NIcon
                class="mr-1"
                icon="carbon:checkmark"
              />
              Join
            </NButton>
          </div>
        </div>
      </div>
    </div>
  </Teleport>
</template>
