<script lang="ts" setup>
import { computed, onMounted, onUnmounted, ref, watch } from 'vue'
import type { Socket } from 'socket.io-client'
import { io } from 'socket.io-client'
import { useRoute, useRouter } from 'vue-router'
import { useTunnel } from '#imports'
import { SOCKET_PATH } from '../constants'

const tunnel = useTunnel()
const { log } = useLogger('plugins')
const route = useRoute()
const router = useRouter()

interface PluginManifest {
  name: string
  version?: string
  description?: string
  author?: { name?: string }
  homepage?: string
  repository?: string
  license?: string
  keywords?: string[]
}

interface InstalledPlugin {
  id: string
  name: string
  marketplace: string
  scope: 'user' | 'project' | 'local' | 'managed'
  enabled: boolean
  manifest?: PluginManifest
  cachePath?: string
}

interface PluginDetails {
  plugin: InstalledPlugin
  skills: Array<{ name: string, description: string, fullName: string }>
  commands: Array<{ name: string, description?: string, fullName: string }>
  agents: Array<{ name: string, description: string }>
}

const socket = ref<Socket | null>(null)
const isConnected = ref(false)
const isLoading = ref(false)

const plugins = ref<InstalledPlugin[]>([])
const pluginDetails = ref<PluginDetails | null>(null)

// Computed selected plugin from route param
const selectedPlugin = computed(() => {
  const id = route.params.id as string | undefined
  if (!id) return null
  return plugins.value.find(p => p.id === id || p.name === id) || null
})

function getSocketUrl(): string {
  if (tunnel.isActive.value && tunnel.origin.value) {
    return tunnel.origin.value
  }
  return window.location.origin
}

function connectSocket() {
  const url = getSocketUrl()
  log('Connecting to socket at', url)

  socket.value = io(url, {
    path: SOCKET_PATH,
    transports: ['websocket', 'polling'],
    reconnection: true,
    reconnectionAttempts: 5,
  })

  socket.value.on('connect', () => {
    log('Connected to socket')
    isConnected.value = true
    loadData()
  })

  socket.value.on('disconnect', () => {
    log('Disconnected from socket')
    isConnected.value = false
  })

  socket.value.on('plugins:list', (data: InstalledPlugin[]) => {
    log('Plugins list received', data)
    plugins.value = data
    isLoading.value = false
  })

  socket.value.on('plugins:get', (data: PluginDetails) => {
    log('Plugin details received', data)
    pluginDetails.value = data
  })
}

function loadData() {
  if (socket.value) {
    isLoading.value = true
    socket.value.emit('plugins:list')
  }
}

function selectPlugin(plugin: InstalledPlugin) {
  pluginDetails.value = null
  router.push(`/plugins/${plugin.id}`)

  if (socket.value && plugin.cachePath) {
    socket.value.emit('plugins:get', plugin.id)
  }
}

function getScopeColor(scope: string): string {
  switch (scope) {
    case 'user':
      return 'purple'
    case 'project':
      return 'green'
    case 'local':
      return 'blue'
    case 'managed':
      return 'gray'
    default:
      return 'gray'
  }
}

// Watch for route changes to load plugin details
watch(
  selectedPlugin,
  (plugin) => {
    if (plugin && socket.value && plugin.cachePath) {
      pluginDetails.value = null
      socket.value.emit('plugins:get', plugin.id)
    }
  },
)

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
  <PageLayout
    color="cyan"
    icon="carbon:application"
    title="Plugins"
  >
    <template #actions>
      <NButton
        :disabled="!isConnected || isLoading"
        n="gray"
        @click="loadData"
      >
        <NIcon
          :class="{ 'animate-spin': isLoading }"
          class="mr-1"
          icon="carbon:restart"
        />
        Refresh
      </NButton>
    </template>

    <div class="flex gap-4 h-full">
      <!-- Sidebar -->
      <div class="w-72 flex-shrink-0 space-y-4 overflow-hidden">
        <div>
          <div class="text-sm font-medium opacity-50 mb-2 flex items-center gap-2">
            <NIcon icon="carbon:application" />
            Installed Plugins ({{ plugins.length }})
          </div>
          <div
            v-if="plugins.length === 0 && !isLoading"
            class="text-xs opacity-50"
          >
            No plugins installed
          </div>
          <div class="space-y-1 px-1">
            <div
              v-for="plugin in plugins"
              :key="plugin.id"
              :class="[
                selectedPlugin?.id === plugin.id ? 'n-bg-active ring-1 ring-cyan-500' : 'hover:n-bg-active',
                !plugin.enabled && 'opacity-50',
              ]"
              class="rounded-lg p-2 cursor-pointer"
              @click="selectPlugin(plugin)"
            >
              <div class="flex items-center gap-2">
                <NIcon
                  :class="plugin.enabled ? 'text-cyan-500' : 'text-gray-400'"
                  icon="carbon:application"
                />
                <span class="font-medium truncate">{{ plugin.name }}</span>
              </div>
              <div class="flex flex-wrap gap-1 mt-1 pl-6">
                <NBadge
                  :n="getScopeColor(plugin.scope)"
                  class="text-xs"
                >
                  {{ plugin.scope }}
                </NBadge>
                <NBadge
                  v-if="!plugin.enabled"
                  class="text-xs"
                  n="red"
                >
                  disabled
                </NBadge>
                <NBadge
                  v-if="plugin.manifest?.version"
                  class="text-xs"
                  n="gray"
                >
                  v{{ plugin.manifest.version }}
                </NBadge>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- Details Panel via NuxtPage -->
      <div class="flex-1 flex flex-col n-bg-active rounded-lg overflow-hidden">
        <NuxtPage
          :plugin="selectedPlugin"
          :plugin-details="pluginDetails"
          :get-scope-color="getScopeColor"
        />
      </div>
    </div>
  </PageLayout>
</template>
