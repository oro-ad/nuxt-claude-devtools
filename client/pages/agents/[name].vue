<script lang="ts" setup>
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

const props = defineProps<{
  agent: Agent | null
  isEditing: boolean
  editForm: AgentFormData
  formError: string
  formatDate: (date: string) => string
  availableSkills: string[]
}>()

const emit = defineEmits<{
  startEditing: []
  save: []
  cancel: []
}>()
</script>

<template>
  <template v-if="agent">
    <CrudEditorHeader
      :description="agent.description"
      :is-editing="isEditing"
      :readonly="agent.source !== 'project'"
      :source="agent.source"
      :title="agent.name"
      icon="carbon:bot"
      icon-color="text-purple-500"
      show-icon
      @cancel="emit('cancel')"
      @edit="emit('startEditing')"
      @save="emit('save')"
    />

    <!-- Edit Mode -->
    <AgentForm
      v-if="isEditing"
      :model-value="editForm"
      :available-skills="availableSkills"
      :error="formError"
      mode="edit"
    />

    <!-- View Mode -->
    <AgentView
      v-else
      :agent="agent"
      :formatted-date="formatDate(agent.updatedAt)"
    />
  </template>

  <!-- Loading or not found -->
  <div
    v-else
    class="flex-1 flex items-center justify-center opacity-50"
  >
    <div class="text-center">
      <NIcon
        class="text-4xl mb-2 animate-pulse"
        icon="carbon:bot"
      />
      <p>Loading agent...</p>
    </div>
  </div>
</template>
