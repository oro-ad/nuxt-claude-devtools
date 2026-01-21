<script lang="ts" setup>
import { onMounted, onUnmounted, ref } from 'vue'
import type { Socket } from 'socket.io-client'
import { io } from 'socket.io-client'
import { useTunnel } from '#imports'

const tunnel = useTunnel()

interface Agent {
  name: string
  description: string
  prompt: string
  rawContent: string
  model?: string
  tools?: string[]
  skills?: string[]
  updatedAt: string
}

const socket = ref<Socket | null>(null)
const isConnected = ref(false)
const isLoading = ref(false)

const agents = ref<Agent[]>([])
const selectedAgent = ref<Agent | null>(null)
const isEditing = ref(false)
const showNewForm = ref(false)

// Available skills for selector
const availableSkills = ref<string[]>([])

const newAgent = ref({
  name: '',
  description: '',
  prompt: '',
  model: '',
  tools: '',
  skills: [] as string[],
})

const editAgent = ref({
  name: '',
  description: '',
  prompt: '',
  model: '',
  tools: '',
  skills: [] as string[],
})

const formError = ref('')

const modelOptions = [
  { value: '', label: 'Default' },
  { value: 'sonnet', label: 'Sonnet (fast)' },
  { value: 'opus', label: 'Opus (powerful)' },
  { value: 'haiku', label: 'Haiku (fastest)' },
]

function getSocketUrl(): string {
  if (tunnel.isActive.value && tunnel.origin.value) {
    return tunnel.origin.value
  }
  return window.location.origin
}

function connectSocket() {
  const url = getSocketUrl()
  console.log('[agents-client] Connecting to socket at', url)

  socket.value = io(url, {
    path: '/__claude_devtools_socket',
    transports: ['websocket', 'polling'],
    reconnection: true,
    reconnectionAttempts: 5,
  })

  socket.value.on('connect', () => {
    console.log('[agents-client] Connected')
    isConnected.value = true
    loadAgents()
    loadSkillNames()
  })

  socket.value.on('skills:names', (names: string[]) => {
    console.log('[agents-client] Skill names received', names)
    availableSkills.value = names
  })

  socket.value.on('disconnect', () => {
    console.log('[agents-client] Disconnected')
    isConnected.value = false
  })

  socket.value.on('agents:list', (data: Agent[]) => {
    console.log('[agents-client] Agents list received', data)
    agents.value = data
    isLoading.value = false
  })

  socket.value.on('agents:saved', (data: { success: boolean, agent?: Agent, error?: string }) => {
    if (data.success && data.agent) {
      selectedAgent.value = data.agent
      isEditing.value = false
      showNewForm.value = false
      resetNewForm()
      formError.value = ''
    }
    else {
      formError.value = data.error || 'Failed to save agent'
    }
  })

  socket.value.on('agents:deleted', (data: { name: string, success: boolean }) => {
    if (data.success && selectedAgent.value?.name === data.name) {
      selectedAgent.value = null
    }
  })
}

function loadAgents() {
  if (socket.value) {
    isLoading.value = true
    socket.value.emit('agents:list')
  }
}

function loadSkillNames() {
  if (socket.value) {
    socket.value.emit('skills:names')
  }
}

function resetNewForm() {
  newAgent.value = {
    name: '',
    description: '',
    prompt: '',
    model: '',
    tools: '',
    skills: [],
  }
  formError.value = ''
}

function selectAgent(agent: Agent) {
  selectedAgent.value = agent
  editAgent.value = {
    name: agent.name,
    description: agent.description,
    prompt: agent.prompt,
    model: agent.model || '',
    tools: agent.tools?.join(', ') || '',
    skills: agent.skills || [],
  }
  isEditing.value = false
}

function startEditing() {
  if (selectedAgent.value) {
    editAgent.value = {
      name: selectedAgent.value.name,
      description: selectedAgent.value.description,
      prompt: selectedAgent.value.prompt,
      model: selectedAgent.value.model || '',
      tools: selectedAgent.value.tools?.join(', ') || '',
      skills: selectedAgent.value.skills || [],
    }
    isEditing.value = true
  }
}

function saveAgent() {
  const data = isEditing.value ? editAgent.value : newAgent.value

  if (!data.name) {
    formError.value = 'Name is required'
    return
  }
  if (!data.description) {
    formError.value = 'Description is required'
    return
  }
  if (!data.prompt) {
    formError.value = 'Prompt is required'
    return
  }

  if (socket.value) {
    const tools = data.tools
      .split(',')
      .map(s => s.trim())
      .filter(s => s.length > 0)

    socket.value.emit('agents:save', {
      name: data.name,
      description: data.description,
      prompt: data.prompt,
      model: data.model || undefined,
      tools: tools.length > 0 ? tools : undefined,
      skills: data.skills.length > 0 ? data.skills : undefined,
    })
  }
}

function cancelEditing() {
  if (selectedAgent.value) {
    editAgent.value = {
      name: selectedAgent.value.name,
      description: selectedAgent.value.description,
      prompt: selectedAgent.value.prompt,
      model: selectedAgent.value.model || '',
      tools: selectedAgent.value.tools?.join(', ') || '',
      skills: selectedAgent.value.skills || [],
    }
  }
  isEditing.value = false
  formError.value = ''
}

function toggleSkill(skillName: string, form: typeof newAgent.value | typeof editAgent.value) {
  const idx = form.skills.indexOf(skillName)
  if (idx >= 0) {
    form.skills.splice(idx, 1)
  }
  else {
    form.skills.push(skillName)
  }
}

function formatDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString()
}

function deleteAgent(name: string) {
  if (!confirm(`Delete agent "${name}"?`)) return

  if (socket.value) {
    socket.value.emit('agents:delete', name)
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
            class="text-purple"
            icon="carbon:bot"
          />
          Subagents
        </h1>
      </div>
      <div class="flex items-center gap-2">
        <NButton
          :disabled="!isConnected"
          n="purple"
          @click="showNewForm = true; selectedAgent = null"
        >
          <NIcon
            class="mr-1"
            icon="carbon:add"
          />
          New Agent
        </NButton>
        <NButton
          :disabled="!isConnected || isLoading"
          n="gray"
          @click="loadAgents"
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
        <!-- Agents List -->
        <div class="w-72 flex-shrink-0 space-y-4">
          <NTip
            class="text-xs"
            icon="carbon:information"
            n="purple"
          >
            Subagents are specialized AI agents that Claude can delegate tasks to.
            <br>
            Stored as <code class="font-mono">.claude/agents/&lt;name&gt;.md</code>
          </NTip>

          <div
            v-if="agents.length === 0 && !isLoading"
            class="n-bg-active rounded-lg p-4 opacity-50 text-sm"
          >
            No subagents configured.
            <br>
            Create one to get started.
          </div>

          <div class="space-y-2">
            <div
              v-for="agent in agents"
              :key="agent.name"
              :class="selectedAgent?.name === agent.name ? 'n-bg-active ring-1 ring-purple-500' : 'hover:n-bg-active'"
              class="rounded-lg p-3 cursor-pointer group"
              @click="selectAgent(agent)"
            >
              <div class="flex items-center justify-between">
                <div class="flex items-center gap-2">
                  <NIcon
                    class="text-purple-500"
                    icon="carbon:bot"
                  />
                  <span class="font-medium">{{ agent.name }}</span>
                </div>
                <NButton
                  class="opacity-0 group-hover:opacity-100"
                  n="red xs"
                  @click.stop="deleteAgent(agent.name)"
                >
                  <NIcon icon="carbon:trash-can" />
                </NButton>
              </div>
              <div class="text-sm opacity-60 mt-1 pl-6 truncate">
                {{ agent.description }}
              </div>
              <div class="flex flex-wrap gap-1 mt-1 pl-6">
                <NBadge
                  v-if="agent.model"
                  class="text-xs"
                  n="gray"
                >
                  {{ agent.model }}
                </NBadge>
                <NBadge
                  v-if="agent.skills && agent.skills.length > 0"
                  class="text-xs"
                  n="orange"
                >
                  {{ agent.skills.length }} skill{{ agent.skills.length > 1 ? 's' : '' }}
                </NBadge>
              </div>
            </div>
          </div>
        </div>

        <!-- Editor -->
        <div class="flex-1 flex flex-col n-bg-active rounded-lg overflow-hidden">
          <!-- New Agent Form -->
          <template v-if="showNewForm">
            <div class="flex-1 overflow-auto">
              <div class="p-4 border-b border-neutral-200 dark:border-neutral-800">
                <h3 class="font-bold mb-4">
                  Create New Subagent
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
                      v-model="newAgent.name"
                      class="w-full font-mono"
                      placeholder="e.g. reviewer, test-runner, docs-writer"
                    />
                    <div class="text-xs opacity-50 mt-1">
                      Use lowercase with hyphens (kebab-case)
                    </div>
                  </div>

                  <div>
                    <label class="block text-sm font-medium mb-1">Description</label>
                    <NTextInput
                      v-model="newAgent.description"
                      class="w-full"
                      placeholder="Brief description of what this agent does"
                    />
                  </div>

                  <div>
                    <label class="block text-sm font-medium mb-1">Model (optional)</label>
                    <select
                      v-model="newAgent.model"
                      class="w-full p-2 rounded-lg n-bg-base border border-neutral-200 dark:border-neutral-800"
                    >
                      <option
                        v-for="opt in modelOptions"
                        :key="opt.value"
                        :value="opt.value"
                      >
                        {{ opt.label }}
                      </option>
                    </select>
                  </div>

                  <div>
                    <label class="block text-sm font-medium mb-1">Tools (optional)</label>
                    <NTextInput
                      v-model="newAgent.tools"
                      class="w-full font-mono"
                      placeholder="e.g. Read, Grep, Glob, Bash"
                    />
                    <div class="text-xs opacity-50 mt-1">
                      Comma-separated list. Leave empty for all tools.
                    </div>
                  </div>

                  <div v-if="availableSkills.length > 0">
                    <label class="block text-sm font-medium mb-1">Skills</label>
                    <div class="flex flex-wrap gap-2">
                      <button
                        v-for="skill in availableSkills"
                        :key="skill"
                        :class="newAgent.skills.includes(skill) ? 'bg-orange-500 text-white' : 'n-bg-base'"
                        class="px-2 py-1 rounded text-sm border border-neutral-200 dark:border-neutral-700"
                        type="button"
                        @click="toggleSkill(skill, newAgent)"
                      >
                        {{ skill }}
                      </button>
                    </div>
                    <div class="text-xs opacity-50 mt-1">
                      Click to add/remove skills. Skills will be preloaded for the agent.
                    </div>
                  </div>
                </div>
              </div>

              <div class="p-4">
                <label class="block text-sm font-medium mb-1">System Prompt</label>
                <textarea
                  v-model="newAgent.prompt"
                  class="w-full min-h-[200px] p-3 font-mono text-sm n-bg-base rounded-lg border border-neutral-200 dark:border-neutral-800 resize-y"
                  placeholder="Write the system prompt for this agent...&#10;&#10;Example:&#10;You are a code reviewer. Your job is to:&#10;1. Review code for bugs and issues&#10;2. Suggest improvements&#10;3. Check for security vulnerabilities"
                />
              </div>
            </div>

            <div class="p-4 border-t border-neutral-200 dark:border-neutral-800 flex gap-2 flex-shrink-0">
              <NButton
                n="purple"
                @click="saveAgent"
              >
                Create Agent
              </NButton>
              <NButton
                n="gray"
                @click="showNewForm = false; resetNewForm()"
              >
                Cancel
              </NButton>
            </div>
          </template>

          <!-- View/Edit Agent -->
          <template v-else-if="selectedAgent">
            <div class="p-4 border-b border-neutral-200 dark:border-neutral-800 flex items-center justify-between">
              <div>
                <h3 class="font-bold flex items-center gap-2">
                  <NIcon
                    class="text-purple-500"
                    icon="carbon:bot"
                  />
                  {{ selectedAgent.name }}
                </h3>
                <div class="text-sm opacity-70">
                  {{ selectedAgent.description }}
                </div>
              </div>
              <div class="flex gap-2">
                <template v-if="isEditing">
                  <NButton
                    n="green"
                    @click="saveAgent"
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
                      v-model="editAgent.description"
                      class="w-full"
                      placeholder="Brief description"
                    />
                  </div>

                  <div>
                    <label class="block text-sm font-medium mb-1">Model</label>
                    <select
                      v-model="editAgent.model"
                      class="w-full p-2 rounded-lg n-bg-base border border-neutral-200 dark:border-neutral-800"
                    >
                      <option
                        v-for="opt in modelOptions"
                        :key="opt.value"
                        :value="opt.value"
                      >
                        {{ opt.label }}
                      </option>
                    </select>
                  </div>

                  <div>
                    <label class="block text-sm font-medium mb-1">Tools</label>
                    <NTextInput
                      v-model="editAgent.tools"
                      class="w-full font-mono"
                      placeholder="e.g. Read, Grep, Glob, Bash"
                    />
                  </div>

                  <div v-if="availableSkills.length > 0">
                    <label class="block text-sm font-medium mb-1">Skills</label>
                    <div class="flex flex-wrap gap-2">
                      <button
                        v-for="skill in availableSkills"
                        :key="skill"
                        :class="editAgent.skills.includes(skill) ? 'bg-orange-500 text-white' : 'n-bg-base'"
                        class="px-2 py-1 rounded text-sm border border-neutral-200 dark:border-neutral-700"
                        type="button"
                        @click="toggleSkill(skill, editAgent)"
                      >
                        {{ skill }}
                      </button>
                    </div>
                  </div>
                </div>

                <label class="block text-sm font-medium mb-1">System Prompt</label>
                <textarea
                  v-model="editAgent.prompt"
                  class="w-full h-full min-h-[300px] p-3 font-mono text-sm n-bg-base rounded-lg border border-neutral-200 dark:border-neutral-800 resize-none"
                />
              </template>
              <template v-else>
                <div class="space-y-4">
                  <div class="flex flex-wrap gap-2">
                    <NBadge
                      v-if="selectedAgent.model"
                      n="purple"
                    >
                      Model: {{ selectedAgent.model }}
                    </NBadge>
                  </div>

                  <div class="text-xs opacity-50">
                    Updated: {{ formatDate(selectedAgent.updatedAt) }}
                  </div>

                  <div
                    v-if="selectedAgent.tools && selectedAgent.tools.length > 0"
                  >
                    <div class="text-sm font-medium opacity-50 mb-1">
                      Tools
                    </div>
                    <div class="flex flex-wrap gap-1">
                      <NBadge
                        v-for="tool in selectedAgent.tools"
                        :key="tool"
                        class="font-mono text-xs"
                        n="blue"
                      >
                        {{ tool }}
                      </NBadge>
                    </div>
                  </div>

                  <div
                    v-if="selectedAgent.skills && selectedAgent.skills.length > 0"
                  >
                    <div class="text-sm font-medium opacity-50 mb-1">
                      Skills
                    </div>
                    <div class="flex flex-wrap gap-1">
                      <NBadge
                        v-for="skill in selectedAgent.skills"
                        :key="skill"
                        class="text-xs"
                        n="orange"
                      >
                        {{ skill }}
                      </NBadge>
                    </div>
                  </div>

                  <div>
                    <div class="text-sm font-medium opacity-50 mb-2">
                      System Prompt
                    </div>
                    <MarkdownContent
                      :content="selectedAgent.prompt"
                      class="max-w-none"
                    />
                  </div>
                </div>
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
                icon="carbon:bot"
              />
              <p>Select an agent or create a new one</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>
