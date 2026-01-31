<script lang="ts" setup>
import { computed, onMounted, onUnmounted, ref } from 'vue'
import type { Socket } from 'socket.io-client'
import { io } from 'socket.io-client'
import { useTunnel } from '#imports'
import { SOCKET_PATH } from '../constants'

const tunnel = useTunnel()
const { log } = useLogger('docs')

interface DocFile {
  path: string
  name: string
  content: string
  updatedAt: string
}

interface LlmsSource {
  url: string
  domain: string
  title?: string
  description?: string
  addedAt: string
}

const socket = ref<Socket | null>(null)
const isConnected = ref(false)
const isLoading = ref(false)

// Docs state
const docFiles = ref<DocFile[]>([])
const selectedDoc = ref<DocFile | null>(null)
const isEditing = ref(false)
const editContent = ref('')
const showNewDocForm = ref(false)
const newDocPath = ref('')
const newDocContent = ref('')

// LLMS state
const llmsSources = ref<LlmsSource[]>([])
const showAddLlmsForm = ref(false)
const newLlmsUrl = ref('')
const newLlmsTitle = ref('')
const newLlmsDescription = ref('')

// CLAUDE.md state
const claudeMdContent = ref('')
const claudeMdExists = ref(false)
const claudeMdUpdatedAt = ref<string | null>(null)
const isEditingClaudeMd = ref(false)
const claudeMdEditContent = ref('')

const formError = ref('')

// Active tab
const activeTab = ref<'claudemd' | 'docs' | 'llms'>('claudemd')

// Computed: group docs by directory
const groupedDocs = computed(() => {
  const groups: Record<string, DocFile[]> = { '': [] }

  for (const file of docFiles.value) {
    const parts = file.path.split('/')
    if (parts.length > 1) {
      const dir = parts.slice(0, -1).join('/')
      if (!groups[dir]) groups[dir] = []
      groups[dir].push(file)
    }
    else {
      groups[''].push(file)
    }
  }

  return groups
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
    log('Connected')
    isConnected.value = true
    loadData()
  })

  socket.value.on('disconnect', () => {
    log('Disconnected')
    isConnected.value = false
  })

  // Docs events
  socket.value.on('docs:list', (files: DocFile[]) => {
    log('Docs list received', files.length)
    docFiles.value = files
    isLoading.value = false
  })

  socket.value.on('docs:file', (file: DocFile | null) => {
    if (file) {
      selectedDoc.value = file
      editContent.value = file.content
    }
  })

  socket.value.on('docs:saved', (data: { success: boolean, file?: DocFile, error?: string }) => {
    if (data.success && data.file) {
      selectedDoc.value = data.file
      editContent.value = data.file.content
      isEditing.value = false
      showNewDocForm.value = false
      newDocPath.value = ''
      newDocContent.value = ''
      formError.value = ''
    }
    else {
      formError.value = data.error || 'Failed to save'
    }
  })

  socket.value.on('docs:deleted', (data: { path: string, success: boolean }) => {
    if (data.success && selectedDoc.value?.path === data.path) {
      selectedDoc.value = null
      isEditing.value = false
    }
  })

  // LLMS events
  socket.value.on('llms:list', (sources: LlmsSource[]) => {
    log('LLMS list received', sources.length)
    llmsSources.value = sources
  })

  socket.value.on('llms:added', (data: { success: boolean, source?: LlmsSource, error?: string }) => {
    if (data.success) {
      showAddLlmsForm.value = false
      newLlmsUrl.value = ''
      newLlmsTitle.value = ''
      newLlmsDescription.value = ''
      formError.value = ''
    }
    else {
      formError.value = data.error || 'Failed to add'
    }
  })

  // CLAUDE.md events
  socket.value.on('claudemd:data', (data: { content: string, exists: boolean, updatedAt: string | null }) => {
    log('CLAUDE.md data received', data.exists)
    claudeMdContent.value = data.content
    claudeMdExists.value = data.exists
    claudeMdUpdatedAt.value = data.updatedAt
    claudeMdEditContent.value = data.content
  })

  socket.value.on('claudemd:saved', (data: {
    success: boolean
    content?: string
    updatedAt?: string
    error?: string
  }) => {
    if (data.success) {
      claudeMdContent.value = data.content || ''
      claudeMdExists.value = true
      claudeMdUpdatedAt.value = data.updatedAt || null
      claudeMdEditContent.value = data.content || ''
      isEditingClaudeMd.value = false
      formError.value = ''
    }
    else {
      formError.value = data.error || 'Failed to save'
    }
  })
}

function loadData() {
  if (socket.value) {
    isLoading.value = true
    socket.value.emit('docs:list')
    socket.value.emit('llms:list')
    socket.value.emit('claudemd:get')
  }
}

// CLAUDE.md functions
function startEditingClaudeMd() {
  claudeMdEditContent.value = claudeMdContent.value
  isEditingClaudeMd.value = true
}

function saveClaudeMd() {
  if (socket.value) {
    socket.value.emit('claudemd:save', claudeMdEditContent.value)
  }
}

function cancelEditingClaudeMd() {
  claudeMdEditContent.value = claudeMdContent.value
  isEditingClaudeMd.value = false
}

function selectDoc(file: DocFile) {
  selectedDoc.value = file
  editContent.value = file.content
  isEditing.value = false
}

function startEditing() {
  if (selectedDoc.value) {
    editContent.value = selectedDoc.value.content
    isEditing.value = true
  }
}

function saveDoc() {
  if (socket.value && selectedDoc.value) {
    socket.value.emit('docs:save', {
      path: selectedDoc.value.path,
      content: editContent.value,
    })
  }
}

function cancelEditing() {
  if (selectedDoc.value) {
    editContent.value = selectedDoc.value.content
  }
  isEditing.value = false
}

function createDoc() {
  if (!newDocPath.value.trim()) {
    formError.value = 'Path is required'
    return
  }

  if (socket.value) {
    socket.value.emit('docs:save', {
      path: newDocPath.value.trim(),
      content: newDocContent.value || `# ${newDocPath.value.split('/').pop()?.replace('.md', '') || 'New Doc'}\n\n`,
    })
  }
}

function deleteDoc(path: string) {
  if (!confirm(`Delete "${path}"?`)) return

  if (socket.value) {
    socket.value.emit('docs:delete', path)
  }
}

function addLlmsSource() {
  if (!newLlmsUrl.value.trim()) {
    formError.value = 'URL is required'
    return
  }

  // Validate URL format
  let url = newLlmsUrl.value.trim()
  if (!url.startsWith('http://') && !url.startsWith('https://')) {
    url = 'https://' + url
  }

  if (socket.value) {
    socket.value.emit('llms:add', {
      url,
      title: newLlmsTitle.value.trim() || undefined,
      description: newLlmsDescription.value.trim() || undefined,
    })
  }
}

function removeLlmsSource(url: string) {
  if (!confirm(`Remove "${url}"?`)) return

  if (socket.value) {
    socket.value.emit('llms:remove', url)
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
            class="text-purple"
            icon="carbon:document"
          />
          Docs & LLMS
        </h1>
      </div>
      <div class="flex items-center gap-2">
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
      </div>
    </div>

    <!-- Tabs -->
    <div class="px-4 flex gap-2 border-b border-neutral-200 dark:border-neutral-800">
      <button
        :class="activeTab === 'claudemd' ? 'border-b-2 border-green-500 text-green-500' : 'opacity-60'"
        class="px-4 py-2 font-medium"
        @click="activeTab = 'claudemd'"
      >
        <NIcon
          class="mr-1"
          icon="carbon:document-tasks"
        />
        CLAUDE.md
      </button>
      <button
        :class="activeTab === 'docs' ? 'border-b-2 border-purple-500 text-purple-500' : 'opacity-60'"
        class="px-4 py-2 font-medium"
        @click="activeTab = 'docs'"
      >
        <NIcon
          class="mr-1"
          icon="carbon:folder"
        />
        .claude/docs
      </button>
      <button
        :class="activeTab === 'llms' ? 'border-b-2 border-blue-500 text-blue-500' : 'opacity-60'"
        class="px-4 py-2 font-medium"
        @click="activeTab = 'llms'"
      >
        <NIcon
          class="mr-1"
          icon="carbon:link"
        />
        LLMS Sources
      </button>
    </div>

    <!-- Content -->
    <div class="flex-1 overflow-auto p-4">
      <Transition
        appear
        mode="out-in"
        name="page"
      >
        <!-- CLAUDE.md Tab -->
        <div
          v-if="activeTab === 'claudemd'"
          class="h-full flex flex-col"
        >
          <div class="flex items-center justify-between mb-4">
            <div>
              <h2 class="text-lg font-semibold flex items-center gap-2">
                <NIcon icon="carbon:document-tasks" />
                CLAUDE.md
              </h2>
              <p class="text-sm opacity-50">
                Project-level instructions for Claude. Located at project root.
              </p>
              <p
                v-if="claudeMdUpdatedAt"
                class="text-xs opacity-40 mt-1"
              >
                Updated: {{ formatDate(claudeMdUpdatedAt) }}
              </p>
            </div>
            <div class="flex gap-2">
              <template v-if="isEditingClaudeMd">
                <NButton
                  n="green"
                  @click="saveClaudeMd"
                >
                  <NIcon
                    class="mr-1"
                    icon="carbon:save"
                  />
                  Save
                </NButton>
                <NButton
                  n="gray"
                  @click="cancelEditingClaudeMd"
                >
                  Cancel
                </NButton>
              </template>
              <template v-else>
                <NButton
                  :disabled="!isConnected"
                  n="blue"
                  @click="startEditingClaudeMd"
                >
                  <NIcon
                    class="mr-1"
                    icon="carbon:edit"
                  />
                  {{ claudeMdExists ? 'Edit' : 'Create' }}
                </NButton>
              </template>
            </div>
          </div>

          <div
            v-if="formError && activeTab === 'claudemd'"
            class="mb-4"
          >
            <NTip
              icon="carbon:warning"
              n="red"
            >
              {{ formError }}
            </NTip>
          </div>

          <div class="flex-1 n-bg-active rounded-lg overflow-hidden">
            <textarea
              v-if="isEditingClaudeMd"
              v-model="claudeMdEditContent"
              class="w-full h-full p-4 font-mono text-sm n-bg-base resize-none focus:outline-none"
              placeholder="# CLAUDE.md&#10;&#10;Write project-level instructions for Claude here...&#10;&#10;Example:&#10;- This is a Vue 3 + Nuxt project&#10;- Use TypeScript&#10;- Follow existing code style"
            />
            <div
              v-else-if="claudeMdExists"
              class="h-full p-4 overflow-auto"
            >
              <MarkdownContent
                :content="claudeMdContent"
                class="max-w-none"
              />
            </div>
            <div
              v-else
              class="h-full flex items-center justify-center opacity-50"
            >
              <div class="text-center">
                <NIcon
                  class="text-4xl mb-2"
                  icon="carbon:document-add"
                />
                <p>No CLAUDE.md file yet</p>
                <p class="text-sm">
                  Click "Create" to add project instructions
                </p>
              </div>
            </div>
          </div>

          <NTip
            class="mt-4"
            icon="carbon:information"
            n="gray"
          >
            CLAUDE.md contains project-level instructions that Claude reads automatically.
            Use it to define coding standards, project structure, and preferences.
          </NTip>
        </div>

        <!-- Docs Tab -->
        <div
          v-else-if="activeTab === 'docs'"
          class="flex gap-4 h-full"
        >
          <!-- File List -->
          <div class="w-64 flex-shrink-0 space-y-4">
            <NButton
              :disabled="!isConnected"
              class="w-full"
              n="purple"
              @click="showNewDocForm = true; selectedDoc = null"
            >
              <NIcon
                class="mr-1"
                icon="carbon:add"
              />
              New Doc
            </NButton>

            <NTip
              class="text-xs"
              icon="carbon:information"
              n="gray"
            >
              Files are stored in <code class="font-mono">.claude/docs/</code>
              <br>
              Use <code class="font-mono text-blue-500">@docs/filename</code> in chat to attach.
            </NTip>

            <div
              v-if="docFiles.length === 0"
              class="n-bg-active rounded-lg p-4 opacity-50 text-sm"
            >
              No doc files yet.
              <br>
              Create one to get started.
            </div>

            <div
              v-for="(files, dir) in groupedDocs"
              :key="dir"
              class="space-y-1"
            >
              <div
                v-if="dir"
                class="text-xs opacity-50 font-medium px-2 pt-2"
              >
                {{ dir }}/
              </div>
              <div
                v-for="file in files"
                :key="file.path"
                :class="selectedDoc?.path === file.path ? 'n-bg-active ring-1 ring-purple-500' : 'hover:n-bg-active'"
                class="rounded-lg p-2 cursor-pointer group"
                @click="selectDoc(file)"
              >
                <div class="flex items-center justify-between">
                  <div class="flex items-center gap-2 truncate">
                    <NIcon
                      class="opacity-50"
                      icon="carbon:document"
                    />
                    <span class="truncate">{{ file.name }}</span>
                  </div>
                  <NButton
                    class="opacity-0 group-hover:opacity-100"
                    n="red xs"
                    @click.stop="deleteDoc(file.path)"
                  >
                    <NIcon icon="carbon:trash-can" />
                  </NButton>
                </div>
                <div class="text-xs opacity-40 pl-6">
                  {{ formatDate(file.updatedAt) }}
                </div>
              </div>
            </div>
          </div>

          <!-- Editor -->
          <div class="flex-1 flex flex-col n-bg-active rounded-lg overflow-hidden">
            <!-- New Doc Form -->
            <template v-if="showNewDocForm">
              <div class="p-4 border-b border-neutral-200 dark:border-neutral-800">
                <h3 class="font-bold mb-4">
                  Create New Doc
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
                    <label class="block text-sm font-medium mb-1">Path</label>
                    <NTextInput
                      v-model="newDocPath"
                      class="w-full font-mono"
                      placeholder="e.g. api/endpoints.md or readme.md"
                    />
                    <div class="text-xs opacity-50 mt-1">
                      Use / for subdirectories. .md extension added automatically.
                    </div>
                  </div>
                </div>
              </div>

              <div class="flex-1 p-4">
                <label class="block text-sm font-medium mb-1">Content (optional)</label>
                <textarea
                  v-model="newDocContent"
                  class="w-full h-full min-h-[200px] p-3 font-mono text-sm n-bg-base rounded-lg border border-neutral-200 dark:border-neutral-800 resize-none"
                  placeholder="# Your doc title&#10;&#10;Write your documentation here..."
                />
              </div>

              <div class="p-4 border-t border-neutral-200 dark:border-neutral-800 flex gap-2">
                <NButton
                  n="purple"
                  @click="createDoc"
                >
                  Create
                </NButton>
                <NButton
                  n="gray"
                  @click="showNewDocForm = false; formError = ''"
                >
                  Cancel
                </NButton>
              </div>
            </template>

            <!-- View/Edit Doc -->
            <template v-else-if="selectedDoc">
              <div class="p-4 border-b border-neutral-200 dark:border-neutral-800 flex items-center justify-between">
                <div>
                  <h3 class="font-bold">
                    {{ selectedDoc.path }}
                  </h3>
                  <div class="text-xs opacity-50">
                    Updated: {{ formatDate(selectedDoc.updatedAt) }}
                  </div>
                </div>
                <div class="flex gap-2">
                  <template v-if="isEditing">
                    <NButton
                      n="green"
                      @click="saveDoc"
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

              <div class="flex-1 p-4 overflow-auto">
                <textarea
                  v-if="isEditing"
                  v-model="editContent"
                  class="w-full h-full min-h-[300px] p-3 font-mono text-sm n-bg-base rounded-lg border border-neutral-200 dark:border-neutral-800 resize-none"
                />
                <MarkdownContent
                  v-else
                  :content="selectedDoc.content"
                  class="max-w-none"
                />
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
                  icon="carbon:document"
                />
                <p>Select a doc file or create a new one</p>
              </div>
            </div>
          </div>
        </div>

        <!-- LLMS Tab -->
        <div
          v-else-if="activeTab === 'llms'"
          class="space-y-4"
        >
          <NButton
            :disabled="!isConnected"
            n="blue"
            @click="showAddLlmsForm = true"
          >
            <NIcon
              class="mr-1"
              icon="carbon:add"
            />
            Add LLMS Source
          </NButton>

          <!-- Add Form -->
          <div
            v-if="showAddLlmsForm"
            class="n-bg-active rounded-lg p-4"
          >
            <h3 class="font-bold mb-4">
              Add LLMS Source
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
                <label class="block text-sm font-medium mb-1">URL</label>
                <NTextInput
                  v-model="newLlmsUrl"
                  class="w-full font-mono"
                  placeholder="e.g. https://example.com/llms.txt"
                />
                <div class="text-xs opacity-50 mt-1">
                  URL to the llms.txt file
                </div>
              </div>

              <div>
                <label class="block text-sm font-medium mb-1">Title (optional)</label>
                <NTextInput
                  v-model="newLlmsTitle"
                  class="w-full"
                  placeholder="e.g. Example Documentation"
                />
              </div>

              <div>
                <label class="block text-sm font-medium mb-1">Description (optional)</label>
                <NTextInput
                  v-model="newLlmsDescription"
                  class="w-full"
                  placeholder="e.g. API documentation and guides"
                />
              </div>

              <div class="flex gap-2">
                <NButton
                  n="blue"
                  @click="addLlmsSource"
                >
                  Add
                </NButton>
                <NButton
                  n="gray"
                  @click="showAddLlmsForm = false; formError = ''"
                >
                  Cancel
                </NButton>
              </div>
            </div>
          </div>

          <!-- Sources List -->
          <div
            v-if="llmsSources.length === 0 && !showAddLlmsForm"
            class="n-bg-active rounded-lg p-4 opacity-50"
          >
            No LLMS sources configured.
            <br>
            Add external llms.txt URLs to provide context to Claude.
          </div>

          <div
            v-else
            class="space-y-2"
          >
            <div
              v-for="source in llmsSources"
              :key="source.url"
              class="n-bg-active rounded-lg p-4"
            >
              <div class="flex items-start justify-between">
                <div class="flex-1">
                  <div class="font-bold flex items-center gap-2">
                    <NIcon
                      class="text-blue"
                      icon="carbon:link"
                    />
                    {{ source.title || source.domain }}
                  </div>
                  <div class="text-sm opacity-70 font-mono mt-1">
                    {{ source.url }}
                  </div>
                  <div
                    v-if="source.description"
                    class="text-sm opacity-50 mt-1"
                  >
                    {{ source.description }}
                  </div>
                  <div class="text-xs opacity-40 mt-2">
                    Added: {{ formatDate(source.addedAt) }}
                  </div>
                </div>
                <NButton
                  n="red"
                  @click="removeLlmsSource(source.url)"
                >
                  <NIcon icon="carbon:trash-can" />
                </NButton>
              </div>
            </div>
          </div>

          <!-- Info -->
          <NTip
            icon="carbon:information"
            n="blue"
          >
            LLMS sources are external llms.txt files that provide documentation context.
            Claude can use these to better understand APIs and libraries you're working with.
          </NTip>
        </div>
      </Transition>
    </div>
  </div>
</template>
