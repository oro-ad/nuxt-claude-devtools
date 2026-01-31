<script lang="ts" setup>
import { onMounted, ref } from 'vue'
import { io } from 'socket.io-client'
import type { Socket } from 'socket.io-client'
import { useTunnel } from '#imports'

const tunnel = useTunnel()
const { log } = useLogger('settings')

interface DevToolsSettings {
  criticalFiles: {
    autoConfirm: boolean
  }
}

const socket = ref<Socket | null>(null)
const isConnected = ref(false)
const isSaving = ref(false)
const settings = ref<DevToolsSettings>({
  criticalFiles: {
    autoConfirm: false,
  },
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
    path: '/__claude_devtools_socket',
    transports: ['websocket', 'polling'],
    reconnection: true,
    reconnectionAttempts: 5,
  })

  socket.value.on('connect', () => {
    log('Connected to socket')
    isConnected.value = true
    socket.value?.emit('settings:get')
  })

  socket.value.on('disconnect', () => {
    log('Disconnected from socket')
    isConnected.value = false
  })

  socket.value.on('settings:get', (data: DevToolsSettings) => {
    log('Settings received', data)
    settings.value = data
  })

  socket.value.on('settings:updated', (data: DevToolsSettings) => {
    log('Settings updated', data)
    settings.value = data
    isSaving.value = false
  })
}

function updateSettings() {
  if (!socket.value || !isConnected.value) return
  isSaving.value = true
  socket.value.emit('settings:update', settings.value)
}

function toggleAutoConfirm() {
  settings.value.criticalFiles.autoConfirm = !settings.value.criticalFiles.autoConfirm
  updateSettings()
}

onMounted(() => {
  connectSocket()
})

onUnmounted(() => {
  socket.value?.disconnect()
})
</script>

<template>
  <div class="flex flex-col h-screen n-bg-base overflow-hidden">
    <!-- Header -->
    <div class="flex items-center justify-between p-4 border-b border-neutral-200 dark:border-neutral-800">
      <div class="flex items-center gap-3">
        <NuxtLink to="/">
          <NButton n="gray">
            <NIcon icon="carbon:arrow-left" />
          </NButton>
        </NuxtLink>
        <h1 class="text-xl font-bold flex items-center gap-2">
          <NIcon
            class="text-purple"
            icon="carbon:settings"
          />
          Settings
        </h1>
        <NBadge :n="isConnected ? 'green' : 'red'">
          {{ isConnected ? 'Connected' : 'Disconnected' }}
        </NBadge>
      </div>
    </div>

    <!-- Content -->
    <div class="flex-1 overflow-auto p-6">
      <div class="max-w-2xl mx-auto space-y-6">
        <!-- Critical Files Section -->
        <div class="n-bg-active rounded-lg p-6">
          <h2 class="text-lg font-semibold mb-4 flex items-center gap-2">
            <NIcon
              class="text-orange"
              icon="carbon:warning"
            />
            Critical Files Behavior
          </h2>

          <p class="text-sm opacity-70 mb-4">
            Configure how Claude handles changes to critical configuration files
            (nuxt.config.ts, app.config.ts, etc.) that trigger a Nuxt restart.
          </p>

          <div class="space-y-4">
            <!-- Auto-confirm toggle -->
            <div
              class="flex items-center justify-between p-4 rounded-lg border border-neutral-200 dark:border-neutral-700 cursor-pointer hover:border-purple-500/50 transition-colors"
              @click="toggleAutoConfirm"
            >
              <div class="flex-1">
                <div class="font-medium mb-1">
                  Auto-confirm critical file changes
                </div>
                <div class="text-sm opacity-60">
                  <template v-if="settings.criticalFiles.autoConfirm">
                    Claude will automatically proceed with changes without asking for confirmation.
                  </template>
                  <template v-else>
                    Claude will ask for your confirmation before modifying critical files.
                  </template>
                </div>
              </div>
              <div class="ml-4">
                <div
                  :class="[
                    'w-12 h-6 rounded-full transition-colors relative',
                    settings.criticalFiles.autoConfirm
                      ? 'bg-purple-500'
                      : 'bg-neutral-300 dark:bg-neutral-600',
                  ]"
                >
                  <div
                    :class="[
                      'absolute top-1 w-4 h-4 rounded-full bg-white transition-transform',
                      settings.criticalFiles.autoConfirm ? 'translate-x-7' : 'translate-x-1',
                    ]"
                  />
                </div>
              </div>
            </div>

            <!-- Status indicator -->
            <div
              v-if="isSaving"
              class="text-sm text-purple-500 flex items-center gap-2"
            >
              <NIcon
                class="animate-spin"
                icon="carbon:rotate"
              />
              Saving...
            </div>
          </div>
        </div>

        <!-- Info box -->
        <NTip n="blue">
          <strong>Note:</strong> Settings are stored in
          <code class="text-xs bg-blue-500/20 px-1 rounded">.claude-devtools/settings.json</code>
          and the CLAUDE.md instructions are updated automatically when you change settings.
        </NTip>

        <!-- Critical files list -->
        <div class="n-bg-active rounded-lg p-6">
          <h3 class="font-medium mb-3 flex items-center gap-2">
            <NIcon
              class="text-yellow"
              icon="carbon:document"
            />
            Files that trigger Nuxt restart:
          </h3>
          <div class="flex flex-wrap gap-2">
            <code
              v-for="file in ['nuxt.config.ts', 'nuxt.config.js', 'app.config.ts', 'app.config.js', '.nuxtrc', 'tsconfig.json']"
              :key="file"
              class="text-xs px-2 py-1 bg-yellow-500/10 text-yellow-600 dark:text-yellow-400 rounded"
            >
              {{ file }}
            </code>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>
