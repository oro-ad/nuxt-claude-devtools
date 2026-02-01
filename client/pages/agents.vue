<script lang="ts" setup>
import { computed, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useCrudResource } from '~/composables/useCrudResource'

interface Agent {
  name: string
  description: string
  prompt: string
  rawContent: string
  model?: string
  tools?: string[]
  skills?: string[]
  updatedAt: string
  source?: string
}

interface AgentFormData {
  name: string
  description: string
  prompt: string
  model: string
  tools: string
  skills: string[]
}

const route = useRoute()
const router = useRouter()
const availableSkills = ref<string[]>([])

const {
  isConnected,
  isLoading,
  items: agents,
  isEditing,
  showNewForm,
  formError,
  newForm: newAgent,
  editForm: editAgent,
  load: loadAgents,
  select,
  startEditing,
  save: saveAgent,
  cancelEditing,
  deleteItem,
  showNew,
  formatDate,
  emit,
  log,
} = useCrudResource<Agent, AgentFormData>({
  resourceName: 'agents',
  loggerName: 'agents',

  createDefaultForm: () => ({
    name: '',
    description: '',
    prompt: '',
    model: '',
    tools: '',
    skills: [],
  }),

  resourceToForm: agent => ({
    name: agent.name,
    description: agent.description,
    prompt: agent.prompt,
    model: agent.model || '',
    tools: agent.tools?.join(', ') || '',
    skills: agent.skills || [],
  }),

  validateForm: (form) => {
    if (!form.name) return 'Name is required'
    if (!form.description) return 'Description is required'
    if (!form.prompt) return 'Prompt is required'
    return null
  },

  transformFormForSave: (form) => {
    const tools = form.tools
      .split(',')
      .map(s => s.trim())
      .filter(s => s.length > 0)

    return {
      name: form.name,
      description: form.description,
      prompt: form.prompt,
      model: form.model || undefined,
      tools: tools.length > 0 ? tools : undefined,
      skills: form.skills.length > 0 ? form.skills : undefined,
    }
  },

  onConnect: ({ emit }) => {
    emit('skills:names')
  },

  setupListeners: ({ on }) => {
    on('skills:names', (names: string[]) => {
      log('Skill names received', names)
      availableSkills.value = names
    })
  },
})

// Computed selected agent from route param
const selectedAgent = computed(() => {
  const name = route.params.name as string | undefined
  if (!name) return null
  return agents.value.find(a => a.name === name) || null
})

function selectAgent(agent: Agent) {
  select(agent)
  router.push(`/agents/${agent.name}`)
}

function handleDelete(name: string) {
  deleteItem(name, `Delete agent "${name}"?`)
}

function handleShowNew() {
  showNew()
  router.push('/agents')
}

function handleCancelNew() {
  showNewForm.value = false
}

function loadSkillNames() {
  emit('skills:names')
}
</script>

<template>
  <CrudPageLayout
    :is-connected="isConnected"
    :is-loading="isLoading"
    color="purple"
    empty-editor-message="Select an agent or create a new one"
    empty-message="No subagents configured. Create one to get started."
    icon="carbon:bot"
    info-tip="Subagents are specialized AI agents that Claude can delegate tasks to."
    new-button-label="New Agent"
    storage-path=".claude/agents/<name>.md"
    title="Subagents"
    @new="handleShowNew"
    @refresh="loadAgents(); loadSkillNames()"
  >
    <!-- List -->
    <template #list>
      <div
        v-if="agents.length === 0 && !isLoading"
        class="n-bg-active rounded-lg p-4 opacity-50 text-sm"
      >
        No subagents configured.
        <br>
        Create one to get started.
      </div>

      <div class="space-y-2">
        <CrudListItem
          v-for="agent in agents"
          :key="agent.name"
          :description="agent.description"
          :name="agent.name"
          :selected="selectedAgent?.name === agent.name"
          :source="agent.source"
          color="purple"
          icon="carbon:bot"
          @delete="handleDelete(agent.name)"
          @select="selectAgent(agent)"
        >
          <template #extra>
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
          </template>
        </CrudListItem>
      </div>
    </template>

    <!-- Editor via NuxtPage -->
    <template #editor>
      <!-- Create Mode -->
      <AgentForm
        v-if="showNewForm"
        v-model="newAgent"
        :available-skills="availableSkills"
        :error="formError"
        mode="create"
        @cancel="handleCancelNew"
        @save="saveAgent"
      />

      <!-- View/Edit via child route -->
      <NuxtPage
        v-else
        :agent="selectedAgent"
        :is-editing="isEditing"
        :edit-form="editAgent"
        :form-error="formError"
        :format-date="formatDate"
        :available-skills="availableSkills"
        @start-editing="startEditing"
        @save="saveAgent"
        @cancel="cancelEditing"
      />
    </template>
  </CrudPageLayout>
</template>
