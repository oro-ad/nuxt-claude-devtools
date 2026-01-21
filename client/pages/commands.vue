<script lang="ts" setup>
import { onMounted, onUnmounted, ref } from 'vue'
import type { Socket } from 'socket.io-client'
import { io } from 'socket.io-client'
import { useTunnel } from '#imports'

const tunnel = useTunnel()

interface SlashCommand {
  name: string
  path: string
  description?: string
  allowedTools?: string[]
  disableModelInvocation?: boolean
  content: string
  rawContent: string
  updatedAt: string
}

const socket = ref<Socket | null>(null)
const isConnected = ref(false)
const isLoading = ref(false)

const commands = ref<SlashCommand[]>([])
const selectedCommand = ref<SlashCommand | null>(null)
const isEditing = ref(false)
const showNewForm = ref(false)

const newCommand = ref({
  name: '',
  description: '',
  content: '',
  allowedTools: '',
})

const editCommand = ref({
  name: '',
  description: '',
  content: '',
  allowedTools: '',
})

const formError = ref('')

function getSocketUrl(): string {
  if (tunnel.isActive.value && tunnel.origin.value) {
    return tunnel.origin.value
  }
  return window.location.origin
}

function connectSocket() {
  const url = getSocketUrl()
  console.log('[commands-client] Connecting to socket at', url)

  socket.value = io(url, {
    path: '/__claude_devtools_socket',
    transports: ['websocket', 'polling'],
    reconnection: true,
    reconnectionAttempts: 5,
  })

  socket.value.on('connect', () => {
    console.log('[commands-client] Connected')
    isConnected.value = true
    loadCommands()
  })

  socket.value.on('disconnect', () => {
    console.log('[commands-client] Disconnected')
    isConnected.value = false
  })

  socket.value.on('commands:list', (data: SlashCommand[]) => {
    console.log('[commands-client] Commands list received', data)
    commands.value = data
    isLoading.value = false
  })

  socket.value.on('commands:saved', (data: { success: boolean, command?: SlashCommand, error?: string }) => {
    if (data.success && data.command) {
      selectedCommand.value = data.command
      isEditing.value = false
      showNewForm.value = false
      resetNewForm()
      formError.value = ''
    }
    else {
      formError.value = data.error || 'Failed to save command'
    }
  })

  socket.value.on('commands:deleted', (data: { name: string, success: boolean }) => {
    if (data.success && selectedCommand.value?.name === data.name) {
      selectedCommand.value = null
    }
  })
}

function loadCommands() {
  if (socket.value) {
    isLoading.value = true
    socket.value.emit('commands:list')
  }
}

function resetNewForm() {
  newCommand.value = {
    name: '',
    description: '',
    content: '',
    allowedTools: '',
  }
  formError.value = ''
}

function selectCommand(cmd: SlashCommand) {
  selectedCommand.value = cmd
  editCommand.value = {
    name: cmd.name,
    description: cmd.description || '',
    content: cmd.content,
    allowedTools: cmd.allowedTools?.join(', ') || '',
  }
  isEditing.value = false
}

function startEditing() {
  if (selectedCommand.value) {
    editCommand.value = {
      name: selectedCommand.value.name,
      description: selectedCommand.value.description || '',
      content: selectedCommand.value.content,
      allowedTools: selectedCommand.value.allowedTools?.join(', ') || '',
    }
    isEditing.value = true
  }
}

function saveCommand() {
  const data = isEditing.value ? editCommand.value : newCommand.value

  if (!data.name) {
    formError.value = 'Name is required'
    return
  }
  if (!data.content) {
    formError.value = 'Content is required'
    return
  }

  if (socket.value) {
    const allowedTools = data.allowedTools
      .split(',')
      .map(s => s.trim())
      .filter(s => s.length > 0)

    socket.value.emit('commands:save', {
      name: data.name,
      content: data.content,
      description: data.description || undefined,
      allowedTools: allowedTools.length > 0 ? allowedTools : undefined,
    })
  }
}

function cancelEditing() {
  if (selectedCommand.value) {
    editCommand.value = {
      name: selectedCommand.value.name,
      description: selectedCommand.value.description || '',
      content: selectedCommand.value.content,
      allowedTools: selectedCommand.value.allowedTools?.join(', ') || '',
    }
  }
  isEditing.value = false
  formError.value = ''
}

function deleteCommand(name: string) {
  if (!confirm(`Delete command "/${name}"?`)) return

  if (socket.value) {
    socket.value.emit('commands:delete', name)
  }
}

function formatDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString()
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
            class="text-green"
            icon="carbon:terminal"
          />
          Slash Commands
        </h1>
      </div>
      <div class="flex items-center gap-2">
        <NButton
          :disabled="!isConnected"
          n="green"
          @click="showNewForm = true; selectedCommand = null"
        >
          <NIcon
            class="mr-1"
            icon="carbon:add"
          />
          New Command
        </NButton>
        <NButton
          :disabled="!isConnected || isLoading"
          n="gray"
          @click="loadCommands"
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
    <div class="flex-1 overflow-auto p-4">
      <div class="flex gap-4 h-full">
        <!-- Commands List -->
        <div class="w-64 flex-shrink-0 space-y-4">
          <NTip
            class="text-xs"
            icon="carbon:information"
            n="green"
          >
            Slash commands are markdown files with YAML frontmatter.
            <br>
            Stored as <code class="font-mono">.claude/commands/&lt;name&gt;.md</code>
          </NTip>

          <div
            v-if="commands.length === 0 && !isLoading"
            class="n-bg-active rounded-lg p-4 opacity-50 text-sm"
          >
            No slash commands yet.
            <br>
            Create one to get started.
          </div>

          <div class="space-y-1">
            <div
              v-for="cmd in commands"
              :key="cmd.name"
              :class="selectedCommand?.name === cmd.name ? 'n-bg-active ring-1 ring-green-500' : 'hover:n-bg-active'"
              class="rounded-lg p-2 cursor-pointer group"
              @click="selectCommand(cmd)"
            >
              <div class="flex items-center justify-between">
                <div class="flex items-center gap-2 truncate">
                  <NIcon
                    class="opacity-50 text-green-500"
                    icon="carbon:terminal"
                  />
                  <span class="font-mono">/{{ cmd.name }}</span>
                </div>
                <NButton
                  class="opacity-0 group-hover:opacity-100"
                  n="red xs"
                  @click.stop="deleteCommand(cmd.name)"
                >
                  <NIcon icon="carbon:trash-can" />
                </NButton>
              </div>
              <div
                v-if="cmd.description"
                class="text-xs opacity-50 pl-6 truncate"
              >
                {{ cmd.description }}
              </div>
            </div>
          </div>
        </div>

        <!-- Editor -->
        <div class="flex-1 flex flex-col n-bg-active rounded-lg overflow-hidden">
          <!-- New Command Form -->
          <template v-if="showNewForm">
            <div class="flex-1 overflow-auto">
              <div class="p-4 border-b border-neutral-200 dark:border-neutral-800">
                <h3 class="font-bold mb-4">
                  Create New Slash Command
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
                    <label class="block text-sm font-medium mb-1">Command Name</label>
                    <NTextInput
                      v-model="newCommand.name"
                      class="w-full font-mono"
                      placeholder="e.g. review, deploy, test"
                    />
                    <div class="text-xs opacity-50 mt-1">
                      Will be invoked as /{{ newCommand.name || 'command-name' }}
                    </div>
                  </div>

                  <div>
                    <label class="block text-sm font-medium mb-1">Description (optional)</label>
                    <NTextInput
                      v-model="newCommand.description"
                      class="w-full"
                      placeholder="Brief description of what this command does"
                    />
                  </div>

                  <div>
                    <label class="block text-sm font-medium mb-1">Allowed Tools (optional)</label>
                    <NTextInput
                      v-model="newCommand.allowedTools"
                      class="w-full font-mono"
                      placeholder="e.g. Bash(git:*), Read, Edit"
                    />
                    <div class="text-xs opacity-50 mt-1">
                      Comma-separated list of allowed tools
                    </div>
                  </div>
                </div>
              </div>

              <div class="p-4">
                <label class="block text-sm font-medium mb-1">Command Prompt</label>
                <textarea
                  v-model="newCommand.content"
                  class="w-full min-h-[200px] p-3 font-mono text-sm n-bg-base rounded-lg border border-neutral-200 dark:border-neutral-800 resize-y"
                  placeholder="Write the prompt for this command...&#10;&#10;Example:&#10;Review the current code changes and provide feedback on:&#10;1. Code quality&#10;2. Potential bugs&#10;3. Performance issues"
                />
              </div>
            </div>

            <div class="p-4 border-t border-neutral-200 dark:border-neutral-800 flex gap-2 flex-shrink-0">
              <NButton
                n="green"
                @click="saveCommand"
              >
                Create Command
              </NButton>
              <NButton
                n="gray"
                @click="showNewForm = false; resetNewForm()"
              >
                Cancel
              </NButton>
            </div>
          </template>

          <!-- View/Edit Command -->
          <template v-else-if="selectedCommand">
            <div class="p-4 border-b border-neutral-200 dark:border-neutral-800 flex items-center justify-between">
              <div>
                <h3 class="font-bold font-mono">
                  /{{ selectedCommand.name }}
                </h3>
                <div
                  v-if="selectedCommand.description"
                  class="text-sm opacity-70"
                >
                  {{ selectedCommand.description }}
                </div>
                <div class="text-xs opacity-50 mt-1">
                  Updated: {{ formatDate(selectedCommand.updatedAt) }}
                </div>
              </div>
              <div class="flex gap-2">
                <template v-if="isEditing">
                  <NButton
                    n="green"
                    @click="saveCommand"
                  >
                    <NIcon
                      class="mr-1"
                      icon="carbon:save"
                    />
                    Save
                  </NButton>
                  <NButton
                    n="gray"
                    @click="cancelEditing"
                  >
                    Cancel
                  </NButton>
                </template>
                <template v-else>
                  <NButton
                    n="blue"
                    @click="startEditing"
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

            <div
              v-if="formError && isEditing"
              class="px-4 pt-4"
            >
              <NTip
                icon="carbon:warning"
                n="red"
              >
                {{ formError }}
              </NTip>
            </div>

            <div class="flex-1 p-4 overflow-auto">
              <template v-if="isEditing">
                <div class="space-y-4 mb-4">
                  <div>
                    <label class="block text-sm font-medium mb-1">Description</label>
                    <NTextInput
                      v-model="editCommand.description"
                      class="w-full"
                      placeholder="Brief description"
                    />
                  </div>
                  <div>
                    <label class="block text-sm font-medium mb-1">Allowed Tools</label>
                    <NTextInput
                      v-model="editCommand.allowedTools"
                      class="w-full font-mono"
                      placeholder="e.g. Bash(git:*), Read, Edit"
                    />
                  </div>
                </div>
                <label class="block text-sm font-medium mb-1">Command Prompt</label>
                <textarea
                  v-model="editCommand.content"
                  class="w-full h-full min-h-[300px] p-3 font-mono text-sm n-bg-base rounded-lg border border-neutral-200 dark:border-neutral-800 resize-none"
                />
              </template>
              <template v-else>
                <div
                  v-if="selectedCommand.allowedTools && selectedCommand.allowedTools.length > 0"
                  class="mb-4"
                >
                  <div class="text-xs font-medium opacity-50 mb-1">
                    Allowed Tools
                  </div>
                  <div class="flex flex-wrap gap-1">
                    <NBadge
                      v-for="tool in selectedCommand.allowedTools"
                      :key="tool"
                      class="font-mono text-xs"
                      n="blue"
                    >
                      {{ tool }}
                    </NBadge>
                  </div>
                </div>
                <MarkdownContent
                  :content="selectedCommand.content"
                  class="max-w-none"
                />
              </template>
            </div>
          </template>

          <!-- Empty State -->
          <div
            v-else
            class="flex-1 flex items-center justify-center opacity-50"
          >
            <div class="text-center">
              <NIcon
                class="text-4xl mb-2"
                icon="carbon:terminal"
              />
              <p>Select a command or create a new one</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>
