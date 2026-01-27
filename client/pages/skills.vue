<script lang="ts" setup>
import { onMounted, onUnmounted, ref } from 'vue'
import type { Socket } from 'socket.io-client'
import { io } from 'socket.io-client'
import { useTunnel } from '#imports'

const tunnel = useTunnel()
const { log } = useLogger('skills')

interface Skill {
  name: string
  description: string
  content: string // markdown body (instructions)
  rawContent: string
  argumentHint?: string
  model?: string
  updatedAt: string
}

const socket = ref<Socket | null>(null)
const isConnected = ref(false)
const isLoading = ref(false)

const skills = ref<Skill[]>([])
const selectedSkill = ref<Skill | null>(null)
const isEditing = ref(false)
const showNewForm = ref(false)

const newSkill = ref({
  name: '',
  description: '',
  content: '',
  argumentHint: '',
  model: '',
})

const editSkill = ref({
  name: '',
  description: '',
  content: '',
  argumentHint: '',
  model: '',
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
  log('Connecting to socket at', url)

  socket.value = io(url, {
    path: '/__claude_devtools_socket',
    transports: ['websocket', 'polling'],
    reconnection: true,
    reconnectionAttempts: 5,
  })

  socket.value.on('connect', () => {
    log('Connected')
    isConnected.value = true
    loadSkills()
  })

  socket.value.on('disconnect', () => {
    log('Disconnected')
    isConnected.value = false
  })

  socket.value.on('skills:list', (data: Skill[]) => {
    log('Skills list received', data)
    skills.value = data
    isLoading.value = false
  })

  socket.value.on('skills:saved', (data: { success: boolean, skill?: Skill, error?: string }) => {
    if (data.success && data.skill) {
      selectedSkill.value = data.skill
      isEditing.value = false
      showNewForm.value = false
      resetNewForm()
      formError.value = ''
    }
    else {
      formError.value = data.error || 'Failed to save skill'
    }
  })

  socket.value.on('skills:deleted', (data: { name: string, success: boolean }) => {
    if (data.success && selectedSkill.value?.name === data.name) {
      selectedSkill.value = null
    }
  })
}

function loadSkills() {
  if (socket.value) {
    isLoading.value = true
    socket.value.emit('skills:list')
  }
}

function resetNewForm() {
  newSkill.value = {
    name: '',
    description: '',
    content: '',
    argumentHint: '',
    model: '',
  }
  formError.value = ''
}

function selectSkill(skill: Skill) {
  selectedSkill.value = skill
  editSkill.value = {
    name: skill.name,
    description: skill.description,
    content: skill.content,
    argumentHint: skill.argumentHint || '',
    model: skill.model || '',
  }
  isEditing.value = false
}

function startEditing() {
  if (selectedSkill.value) {
    editSkill.value = {
      name: selectedSkill.value.name,
      description: selectedSkill.value.description,
      content: selectedSkill.value.content,
      argumentHint: selectedSkill.value.argumentHint || '',
      model: selectedSkill.value.model || '',
    }
    isEditing.value = true
  }
}

function saveSkill() {
  const data = isEditing.value ? editSkill.value : newSkill.value

  if (!data.name) {
    formError.value = 'Name is required'
    return
  }
  if (!data.description) {
    formError.value = 'Description is required'
    return
  }
  if (!data.content) {
    formError.value = 'Content is required'
    return
  }

  if (socket.value) {
    socket.value.emit('skills:save', {
      name: data.name,
      description: data.description,
      content: data.content,
      argumentHint: data.argumentHint || undefined,
      model: data.model || undefined,
    })
  }
}

function cancelEditing() {
  if (selectedSkill.value) {
    editSkill.value = {
      name: selectedSkill.value.name,
      description: selectedSkill.value.description,
      content: selectedSkill.value.content,
      argumentHint: selectedSkill.value.argumentHint || '',
      model: selectedSkill.value.model || '',
    }
  }
  isEditing.value = false
  formError.value = ''
}

function formatDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString()
}

function deleteSkill(name: string) {
  if (!confirm(`Delete skill "${name}"?`)) return

  if (socket.value) {
    socket.value.emit('skills:delete', name)
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
            class="text-orange"
            icon="carbon:lightning"
          />
          Skills
        </h1>
      </div>
      <div class="flex items-center gap-2">
        <NButton
          :disabled="!isConnected"
          n="orange"
          @click="showNewForm = true; selectedSkill = null"
        >
          <NIcon
            class="mr-1"
            icon="carbon:add"
          />
          New Skill
        </NButton>
        <NButton
          :disabled="!isConnected || isLoading"
          n="gray"
          @click="loadSkills"
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
        <!-- Skills List -->
        <div class="w-64 flex-shrink-0 space-y-4">
          <NTip
            class="text-xs"
            icon="carbon:information"
            n="orange"
          >
            Skills extend Claude's capabilities with custom knowledge.
            <br>
            Stored as <code class="font-mono">.claude/skills/&lt;name&gt;/SKILL.md</code>
          </NTip>

          <div
            v-if="skills.length === 0 && !isLoading"
            class="n-bg-active rounded-lg p-4 opacity-50 text-sm"
          >
            No skills configured yet.
            <br>
            Create one to get started.
          </div>

          <div class="space-y-1">
            <div
              v-for="skill of skills"
              :key="skill.name"
              :class="selectedSkill?.name === skill.name ? 'n-bg-active ring-1 ring-orange-500' : 'hover:n-bg-active'"
              class="rounded-lg p-2 cursor-pointer group"
              @click="selectSkill(skill)"
            >
              <div class="flex items-center justify-between">
                <div class="flex items-center gap-2 truncate">
                  <NIcon
                    class="opacity-50 text-orange-500"
                    icon="carbon:lightning"
                  />
                  <span class="font-medium">{{ skill.name }}</span>
                </div>
                <NButton
                  class="opacity-0 group-hover:opacity-100"
                  n="red xs"
                  @click.stop="deleteSkill(skill.name)"
                >
                  <NIcon icon="carbon:trash-can" />
                </NButton>
              </div>
              <div
                v-if="skill.description"
                class="text-xs opacity-50 pl-6 truncate"
              >
                {{ skill.description }}
              </div>
            </div>
          </div>
        </div>

        <!-- Editor -->
        <div class="flex-1 flex flex-col n-bg-active rounded-lg overflow-hidden">
          <!-- New Skill Form -->
          <template v-if="showNewForm">
            <div class="flex-1 overflow-auto">
              <div class="p-4 border-b border-neutral-200 dark:border-neutral-800">
                <h3 class="font-bold mb-4">
                  Create New Skill
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
                      v-model="newSkill.name"
                      class="w-full font-mono"
                      placeholder="e.g. vue-expert, code-reviewer"
                    />
                  </div>

                  <div>
                    <label class="block text-sm font-medium mb-1">Description</label>
                    <NTextInput
                      v-model="newSkill.description"
                      class="w-full"
                      placeholder="Brief description of what this skill does"
                    />
                  </div>

                  <div>
                    <label class="block text-sm font-medium mb-1">Argument Hint (optional)</label>
                    <NTextInput
                      v-model="newSkill.argumentHint"
                      class="w-full"
                      placeholder="e.g. <query>"
                    />
                    <div class="text-xs opacity-50 mt-1">
                      Hint for argument when using /skillname
                    </div>
                  </div>

                  <div>
                    <label class="block text-sm font-medium mb-1">Model (optional)</label>
                    <select
                      v-model="newSkill.model"
                      class="w-full p-2 n-bg-base rounded-lg border border-neutral-200 dark:border-neutral-800"
                    >
                      <option value="">
                        Inherit (default)
                      </option>
                      <option value="sonnet">
                        Sonnet
                      </option>
                      <option value="opus">
                        Opus
                      </option>
                      <option value="haiku">
                        Haiku
                      </option>
                    </select>
                  </div>
                </div>
              </div>

              <div class="p-4">
                <label class="block text-sm font-medium mb-1">Content (Markdown)</label>
                <textarea
                  v-model="newSkill.content"
                  class="w-full min-h-[200px] p-3 font-mono text-sm n-bg-base rounded-lg border border-neutral-200 dark:border-neutral-800 resize-y"
                  placeholder="Write the skill instructions in markdown...&#10;&#10;Example:&#10;You are an expert in Vue 3 Composition API.&#10;&#10;## Guidelines&#10;- Always use <script setup>&#10;- Follow TypeScript best practices"
                />
              </div>
            </div>

            <div class="p-4 border-t border-neutral-200 dark:border-neutral-800 flex gap-2 flex-shrink-0">
              <NButton
                n="orange"
                @click="saveSkill"
              >
                Create Skill
              </NButton>
              <NButton
                n="gray"
                @click="showNewForm = false; resetNewForm()"
              >
                Cancel
              </NButton>
            </div>
          </template>

          <!-- View/Edit Skill -->
          <template v-else-if="selectedSkill">
            <div class="p-4 border-b border-neutral-200 dark:border-neutral-800 flex items-center justify-between">
              <div>
                <h3 class="font-bold flex items-center gap-2">
                  <NIcon
                    class="text-orange-500"
                    icon="carbon:lightning"
                  />
                  {{ selectedSkill.name }}
                </h3>
                <div
                  v-if="selectedSkill.description"
                  class="text-sm opacity-70"
                >
                  {{ selectedSkill.description }}
                </div>
              </div>
              <div class="flex gap-2">
                <template v-if="isEditing">
                  <NButton
                    n="green"
                    @click="saveSkill"
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
                      v-model="editSkill.description"
                      class="w-full"
                      placeholder="Brief description"
                    />
                  </div>
                  <div>
                    <label class="block text-sm font-medium mb-1">Argument Hint</label>
                    <NTextInput
                      v-model="editSkill.argumentHint"
                      class="w-full"
                      placeholder="e.g. <query>"
                    />
                  </div>
                  <div>
                    <label class="block text-sm font-medium mb-1">Model</label>
                    <select
                      v-model="editSkill.model"
                      class="w-full p-2 n-bg-base rounded-lg border border-neutral-200 dark:border-neutral-800"
                    >
                      <option value="">
                        Inherit (default)
                      </option>
                      <option value="sonnet">
                        Sonnet
                      </option>
                      <option value="opus">
                        Opus
                      </option>
                      <option value="haiku">
                        Haiku
                      </option>
                    </select>
                  </div>
                </div>
                <label class="block text-sm font-medium mb-1">Content (Markdown)</label>
                <textarea
                  v-model="editSkill.content"
                  class="w-full h-full min-h-[300px] p-3 font-mono text-sm n-bg-base rounded-lg border border-neutral-200 dark:border-neutral-800 resize-none"
                />
              </template>
              <template v-else>
                <div class="flex flex-wrap gap-2 mb-4">
                  <NBadge
                    v-if="selectedSkill.model"
                    n="blue"
                  >
                    Model: {{ selectedSkill.model }}
                  </NBadge>
                  <NBadge
                    v-if="selectedSkill.argumentHint"
                    n="gray"
                  >
                    Arg: {{ selectedSkill.argumentHint }}
                  </NBadge>
                </div>
                <div class="text-xs opacity-50 mb-4">
                  Updated: {{ formatDate(selectedSkill.updatedAt) }}
                </div>
                <MarkdownContent
                  :content="selectedSkill.content"
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
                icon="carbon:lightning"
              />
              <p>Select a skill or create a new one</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>
