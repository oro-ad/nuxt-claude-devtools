<script lang="ts" setup>
import { computed, nextTick, onMounted, onUnmounted, ref } from 'vue'
import type { Socket } from 'socket.io-client'
import { io } from 'socket.io-client'
import { useDevtoolsClient } from '@nuxt/devtools-kit/iframe-client'

const client = useDevtoolsClient()

interface Message {
  id: string
  role: 'user' | 'assistant' | 'system'
  content: string
  timestamp: Date
  streaming?: boolean
}

const socket = ref<Socket | null>(null)
const messages = ref<Message[]>([])
const inputMessage = ref('')
const isConnected = ref(false)
const isSessionActive = ref(false)
const isProcessing = ref(false)
const messagesContainer = ref<HTMLElement | null>(null)

const statusText = computed(() => {
  if (!isConnected.value) return 'Disconnected'
  if (isProcessing.value) return 'Processing...'
  return 'Ready'
})

const statusColor = computed(() => {
  if (!isConnected.value) return 'red'
  if (isProcessing.value) return 'blue'
  return 'green'
})

function scrollToBottom() {
  nextTick(() => {
    if (messagesContainer.value) {
      messagesContainer.value.scrollTop = messagesContainer.value.scrollHeight
    }
  })
}

function generateId() {
  return Math.random().toString(36).substring(2, 9)
}

function addMessage(role: Message['role'], content: string, streaming = false): Message {
  const message: Message = {
    id: generateId(),
    role,
    content,
    timestamp: new Date(),
    streaming,
  }
  messages.value.push(message)
  scrollToBottom()
  return message
}

function connectSocket() {
  // Connect to the dedicated Socket.IO server on port 3355
  const url = window.location.origin.replace(/:3300$/, ':3355').replace(/:3000$/, ':3355')

  socket.value = io(url, {
    transports: ['websocket', 'polling'],
  })

  socket.value.on('connect', () => {
    console.log('[claude-client] Connected to socket')
    isConnected.value = true
    addMessage('system', 'Connected to Claude DevTools')
  })

  socket.value.on('disconnect', () => {
    console.log('[claude-client] Disconnected from socket')
    isConnected.value = false
    isSessionActive.value = false
    isProcessing.value = false
    addMessage('system', 'Disconnected from server')
  })

  socket.value.on('session:status', (status: { active: boolean, processing: boolean }) => {
    console.log('[claude-client] Session status:', status)
    isSessionActive.value = status.active
    isProcessing.value = status.processing
  })

  socket.value.on('output:chunk', (chunk: string) => {
    console.log('[claude-client] Output chunk:', chunk.length)
    const lastMessage = messages.value.findLast(m => m.role === 'assistant')
    if (lastMessage && lastMessage.streaming) {
      lastMessage.content += chunk
      scrollToBottom()
    }
    else {
      addMessage('assistant', chunk, true)
    }
  })

  socket.value.on('output:complete', () => {
    console.log('[claude-client] Output complete')
    const lastMessage = messages.value.findLast(m => m.role === 'assistant')
    if (lastMessage) {
      lastMessage.streaming = false
    }
  })

  socket.value.on('output:error', (error: string) => {
    console.log('[claude-client] Output error:', error)
    addMessage('system', `Error: ${error}`)
  })

  socket.value.on('session:error', (error: string) => {
    console.log('[claude-client] Session error:', error)
    addMessage('system', `Session error: ${error}`)
  })

  socket.value.on('session:closed', (data: { exitCode: number }) => {
    console.log('[claude-client] Session closed:', data)
    addMessage('system', `Session ended (exit code: ${data.exitCode})`)
  })
}

function newChat() {
  if (socket.value) {
    socket.value.emit('session:reset')
    messages.value = []
    addMessage('system', 'New conversation started')
  }
}

function sendMessage() {
  if (!inputMessage.value.trim() || isProcessing.value || !isConnected.value) return

  const message = inputMessage.value.trim()
  inputMessage.value = ''

  addMessage('user', message)

  if (socket.value) {
    socket.value.emit('message:send', message)
  }
}

function clearChat() {
  messages.value = []
  if (isConnected.value) {
    addMessage('system', 'Chat cleared')
  }
}

function handleKeydown(event: KeyboardEvent) {
  console.log(event)

  if (event.key === 'Enter' && !event.shiftKey) {
    event.preventDefault()
    sendMessage()
  }
}

onMounted(() => {
  connectSocket()
})

onUnmounted(() => {
  if (socket.value) {
    socket.value.disconnect()
  }
})
</script>

<template>
  <div class="relative flex flex-col h-screen n-bg-base">
    <!-- Header -->
    <div
      class="flex items-center justify-between p-4"
    >
      <div class="flex items-center gap-3">
        <h1 class="text-xl font-bold flex items-center gap-2">
          <NIcon
            class="text-green"
            icon="carbon:machine-learning-model"
          />
          Claude AI
        </h1>
        <NBadge :n="statusColor">
          {{ statusText }}
        </NBadge>
      </div>
      <div class="flex items-center gap-2">
        <NButton
          :disabled="!isConnected || isProcessing"
          n="blue"
          @click="newChat"
        >
          <NIcon
            class="mr-1"
            icon="carbon:add"
          />
          New Chat
        </NButton>
        <NButton
          n="gray"
          @click="clearChat"
        >
          <NIcon
            class="mr-1"
            icon="carbon:trash-can"
          />
          Clear
        </NButton>
        <NuxtLink to="/mcp">
          <NButton n="gray">
            <NIcon
              class="mr-1"
              icon="carbon:plug"
            />
            MCP
          </NButton>
        </NuxtLink>
      </div>
    </div>

    <!-- Connection Warning -->
    <div
      v-if="!client"
      class="px-4 pt-4"
    >
      <NTip n="yellow">
        Open this page inside Nuxt DevTools for best experience.
      </NTip>
    </div>

    <!-- Messages -->
    <div
      ref="messagesContainer"
      class="flex-1 overflow-auto p-4 space-y-4"
    >
      <div
        v-for="message in messages"
        :key="message.id"
        :class="message.role === 'user' ? 'justify-end' : 'justify-start'"
        class="flex"
      >
        <div
          :class="{
            'bg-green-500/20 text-green-800 dark:text-green-100': message.role === 'user',
            'n-bg-active': message.role === 'assistant',
            'bg-yellow-500/20 text-yellow-800 dark:text-yellow-200 text-sm': message.role === 'system',
          }"
          class="max-w-[80%] rounded-lg px-4 py-2"
        >
          <div
            v-if="message.role === 'assistant'"
            class="text-xs opacity-50 mb-1"
          >
            Claude
            <span
              v-if="message.streaming"
              class="ml-2"
            >
              <NIcon
                class="animate-pulse"
                icon="carbon:circle-filled"
              />
            </span>
          </div>
          <div class="whitespace-pre-wrap font-mono text-sm">
            {{ message.content }}
          </div>
          <div class="text-xs opacity-30 mt-1">
            {{ message.timestamp.toLocaleTimeString() }}
          </div>
        </div>
      </div>

      <!-- Empty state -->
      <div
        v-if="messages.length === 0"
        class="flex items-center justify-center h-full opacity-50"
      >
        <div class="text-center">
          <NIcon
            class="text-4xl mb-2"
            icon="carbon:chat"
          />
          <p>Send a message to start chatting with Claude</p>
        </div>
      </div>
    </div>

    <!-- Input -->
    <div class="p-4">
      <div
        class="flex gap-2"
        @keydown.enter="handleKeydown"
      >
        <NTextInput
          v-model="inputMessage"
          :disabled="!isConnected || isProcessing"
          class="flex-1 font-mono"
          placeholder="Type your message..."
        />
        <NButton
          :disabled="!inputMessage.trim() || !isConnected || isProcessing"
          n="green"
          @click="sendMessage"
        >
          <NIcon
            v-if="isProcessing"
            class="animate-spin"
            icon="carbon:loading"
          />
          <NIcon
            v-else
            icon="carbon:send"
          />
        </NButton>
      </div>
      <div class="text-xs opacity-50 mt-2">
        Press Enter to send | --continue will be used for follow-up messages
      </div>
    </div>
  </div>
</template>
