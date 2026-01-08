<script lang="ts" setup>
import { onMounted, onUnmounted, ref } from 'vue'
import type { Socket } from 'socket.io-client'
import { io } from 'socket.io-client'

interface McpServer {
  name: string
  command?: string
  args?: string[]
  url?: string
  transport: 'stdio' | 'http' | 'sse'
  env?: Record<string, string>
  scope: 'global' | 'local'
}

const socket = ref<Socket | null>(null)
const isConnected = ref(false)
const servers = ref<McpServer[]>([])
const isLoading = ref(false)

// Form state
const showAddForm = ref(false)
const newServer = ref({
  name: '',
  transport: 'stdio' as 'stdio' | 'http' | 'sse',
  command: '',
  args: '',
  url: '',
  scope: 'local' as 'global' | 'local',
})
const formError = ref('')

function connectSocket() {
  const url = window.location.origin.replace(/:3300$/, ':3355').replace(/:3000$/, ':3355')

  socket.value = io(url, {
    transports: ['websocket', 'polling'],
  })

  socket.value.on('connect', () => {
    console.log('[mcp-client] Connected to socket')
    isConnected.value = true
    loadServers()
  })

  socket.value.on('disconnect', () => {
    console.log('[mcp-client] Disconnected from socket')
    isConnected.value = false
  })

  socket.value.on('mcp:list', (data: McpServer[]) => {
    console.log('[mcp-client] MCP list received', data)
    servers.value = data
    isLoading.value = false
  })

  socket.value.on('mcp:added', (data: { success: boolean, name?: string, error?: string }) => {
    console.log('[mcp-client] MCP added result', data)
    if (data.success) {
      showAddForm.value = false
      resetForm()
    }
    else {
      formError.value = data.error || 'Failed to add MCP server'
    }
  })

  socket.value.on('mcp:removed', (data: { success: boolean, name?: string, error?: string }) => {
    console.log('[mcp-client] MCP removed result', data)
    if (!data.success) {
      alert(`Failed to remove: ${data.error}`)
    }
  })
}

function loadServers() {
  if (socket.value) {
    isLoading.value = true
    socket.value.emit('mcp:list')
  }
}

function resetForm() {
  newServer.value = {
    name: '',
    transport: 'stdio',
    command: '',
    args: '',
    url: '',
    scope: 'local',
  }
  formError.value = ''
}

function addServer() {
  if (!newServer.value.name) {
    formError.value = 'Name is required'
    return
  }

  if (newServer.value.transport === 'stdio' && !newServer.value.command) {
    formError.value = 'Command is required for stdio transport'
    return
  }

  if ((newServer.value.transport === 'http' || newServer.value.transport === 'sse') && !newServer.value.url) {
    formError.value = 'URL is required for HTTP/SSE transport'
    return
  }

  if (socket.value) {
    const argsArray = newServer.value.args
      .split(' ')
      .map(s => s.trim())
      .filter(s => s.length > 0)

    socket.value.emit('mcp:add', {
      name: newServer.value.name,
      transport: newServer.value.transport,
      command: newServer.value.command,
      args: argsArray,
      url: newServer.value.url,
      scope: newServer.value.scope,
    })
  }
}

function removeServer(server: McpServer) {
  if (!confirm(`Remove MCP server "${server.name}"?`)) {
    return
  }

  if (socket.value) {
    socket.value.emit('mcp:remove', {
      name: server.name,
    })
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
    <div class="flex items-center justify-between p-4">
      <div class="flex items-center gap-3">
        <NuxtLink
          class="text-sm opacity-50 hover:opacity-100"
          to="/"
        >
          &larr; Chat
        </NuxtLink>
        <h1 class="text-xl font-bold flex items-center gap-2">
          <NIcon
            class="text-blue"
            icon="carbon:plug"
          />
          MCP Servers
        </h1>
      </div>
      <div class="flex items-center gap-2">
        <NButton
          :disabled="!isConnected"
          n="blue"
          @click="showAddForm = true"
        >
          <NIcon
            class="mr-1"
            icon="carbon:add"
          />
          Add Server
        </NButton>
        <NButton
          :disabled="!isConnected || isLoading"
          n="gray"
          @click="loadServers"
        >
          <NIcon
            :class="{ 'animate-spin': isLoading }"
            class="mr-1"
            icon="carbon:restart"
          />
          Refresh
        </NButton>
      </div>
    </div>

    <!-- Content -->
    <div class="flex-1 overflow-auto p-4 space-y-6">
      <!-- Add Form Modal -->
      <div
        v-if="showAddForm"
        class="n-bg-active rounded-lg p-4 mb-4"
      >
        <h3 class="font-bold mb-4">
          Add MCP Server
        </h3>

        <div
          v-if="formError"
          class="mb-4"
        >
          <NTip
            icon="carbon:warning"
            n="red"
          >
            {{ formError }}
          </NTip>
        </div>

        <div class="space-y-4">
          <div>
            <label class="block text-sm font-medium mb-1">Name</label>
            <NTextInput
              v-model="newServer.name"
              class="w-full"
              placeholder="e.g. github, nuxt-ui-remote"
            />
          </div>

          <div>
            <label class="block text-sm font-medium mb-1">Transport</label>
            <div class="flex gap-4">
              <label class="flex items-center gap-2">
                <input
                  v-model="newServer.transport"
                  name="transport"
                  type="radio"
                  value="stdio"
                >
                <span>stdio (local command)</span>
              </label>
              <label class="flex items-center gap-2">
                <input
                  v-model="newServer.transport"
                  name="transport"
                  type="radio"
                  value="http"
                >
                <span>HTTP (remote)</span>
              </label>
              <label class="flex items-center gap-2">
                <input
                  v-model="newServer.transport"
                  name="transport"
                  type="radio"
                  value="sse"
                >
                <span>SSE (remote)</span>
              </label>
            </div>
          </div>

          <!-- stdio fields -->
          <template v-if="newServer.transport === 'stdio'">
            <div>
              <label class="block text-sm font-medium mb-1">Command</label>
              <NTextInput
                v-model="newServer.command"
                class="w-full font-mono"
                placeholder="e.g. npx"
              />
            </div>

            <div>
              <label class="block text-sm font-medium mb-1">Arguments (space separated)</label>
              <NTextInput
                v-model="newServer.args"
                class="w-full font-mono"
                placeholder="e.g. -y @modelcontextprotocol/server-github"
              />
            </div>
          </template>

          <!-- http/sse fields -->
          <template v-if="newServer.transport === 'http' || newServer.transport === 'sse'">
            <div>
              <label class="block text-sm font-medium mb-1">URL</label>
              <NTextInput
                v-model="newServer.url"
                class="w-full font-mono"
                placeholder="e.g. https://ui.nuxt.com/mcp"
              />
            </div>
          </template>

          <div>
            <label class="block text-sm font-medium mb-1">Scope</label>
            <div class="flex gap-4">
              <label class="flex items-center gap-2">
                <input
                  v-model="newServer.scope"
                  name="scope"
                  type="radio"
                  value="local"
                >
                <span>Local (this project, private)</span>
              </label>
              <label class="flex items-center gap-2">
                <input
                  v-model="newServer.scope"
                  name="scope"
                  type="radio"
                  value="global"
                >
                <span>User (all projects)</span>
              </label>
            </div>
          </div>

          <div class="flex gap-2 pt-2">
            <NButton
              n="green"
              @click="addServer"
            >
              Add Server
            </NButton>
            <NButton
              n="gray"
              @click="showAddForm = false; resetForm()"
            >
              Cancel
            </NButton>
          </div>
        </div>
      </div>

      <!-- All Servers -->
      <div>
        <h2 class="text-lg font-semibold mb-3 flex items-center gap-2">
          <NIcon icon="carbon:plug" />
          Configured Servers
        </h2>

        <div
          v-if="servers.length === 0"
          class="n-bg-active rounded-lg p-4 opacity-50"
        >
          No MCP servers configured
        </div>

        <div
          v-else
          class="space-y-2"
        >
          <div
            v-for="server in servers"
            :key="server.name"
            class="n-bg-active rounded-lg p-4 flex items-center justify-between"
          >
            <div>
              <div class="font-bold flex items-center gap-2">
                {{ server.name }}
                <NBadge
                  :n="server.transport === 'stdio' ? 'gray' : 'blue'"
                  class="text-xs"
                >
                  {{ server.transport }}
                </NBadge>
              </div>
              <div class="text-sm opacity-70 font-mono">
                <template v-if="server.transport === 'stdio'">
                  {{ server.command }} {{ server.args?.join(' ') }}
                </template>
                <template v-else>
                  {{ server.url }}
                </template>
              </div>
            </div>
            <NButton
              n="red"
              @click="removeServer(server)"
            >
              <NIcon icon="carbon:trash-can" />
            </NButton>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>
