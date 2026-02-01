<script lang="ts" setup>
import { computed } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useCrudResource } from '~/composables/useCrudResource'

interface SlashCommand {
  name: string
  path: string
  description?: string
  allowedTools?: string[]
  disableModelInvocation?: boolean
  content: string
  rawContent: string
  updatedAt: string
  source?: string
}

interface CommandFormData {
  name: string
  description: string
  content: string
  allowedTools: string
}

const route = useRoute()
const router = useRouter()

const {
  isConnected,
  isLoading,
  items: commands,
  isEditing,
  showNewForm,
  formError,
  newForm: newCommand,
  editForm: editCommand,
  load: loadCommands,
  select,
  startEditing,
  save: saveCommand,
  cancelEditing,
  deleteItem,
  showNew,
  formatDate,
} = useCrudResource<SlashCommand, CommandFormData>({
  resourceName: 'commands',
  loggerName: 'commands',

  createDefaultForm: () => ({
    name: '',
    description: '',
    content: '',
    allowedTools: '',
  }),

  resourceToForm: cmd => ({
    name: cmd.name,
    description: cmd.description || '',
    content: cmd.content,
    allowedTools: cmd.allowedTools?.join(', ') || '',
  }),

  validateForm: (form) => {
    if (!form.name) return 'Name is required'
    if (!form.content) return 'Content is required'
    return null
  },

  transformFormForSave: (form) => {
    const allowedTools = form.allowedTools
      .split(',')
      .map(s => s.trim())
      .filter(s => s.length > 0)

    return {
      name: form.name,
      content: form.content,
      description: form.description || undefined,
      allowedTools: allowedTools.length > 0 ? allowedTools : undefined,
    }
  },
})

// Computed selected command from route param
const selectedCommand = computed(() => {
  const name = route.params.name as string | undefined
  if (!name) return null
  return commands.value.find(c => c.name === name) || null
})

function selectCommand(command: SlashCommand) {
  select(command)
  router.push(`/commands/${command.name}`)
}

function handleDelete(name: string) {
  deleteItem(name, `Delete command "/${name}"?`)
}

function handleShowNew() {
  showNew()
  router.push('/commands')
}

function handleCancelNew() {
  showNewForm.value = false
}
</script>

<template>
  <CrudPageLayout
    title="Slash Commands"
    icon="carbon:terminal"
    color="green"
    :is-connected="isConnected"
    :is-loading="isLoading"
    info-tip="Slash commands are markdown files with YAML frontmatter."
    storage-path=".claude/commands/<name>.md"
    empty-message="No slash commands yet. Create one to get started."
    empty-editor-message="Select a command or create a new one"
    new-button-label="New Command"
    @new="handleShowNew"
    @refresh="loadCommands"
  >
    <!-- List -->
    <template #list>
      <div
        v-if="commands.length === 0 && !isLoading"
        class="n-bg-active rounded-lg p-4 opacity-50 text-sm"
      >
        No slash commands yet.
        <br>
        Create one to get started.
      </div>

      <div class="space-y-1">
        <CrudListItem
          v-for="cmd in commands"
          :key="cmd.name"
          :selected="selectedCommand?.name === cmd.name"
          :name="cmd.name"
          :description="cmd.description"
          :source="cmd.source"
          icon="carbon:terminal"
          color="green"
          mono-name
          name-prefix="/"
          @select="selectCommand(cmd)"
          @delete="handleDelete(cmd.name)"
        />
      </div>
    </template>

    <!-- Editor via NuxtPage -->
    <template #editor>
      <!-- Create Mode -->
      <CommandForm
        v-if="showNewForm"
        v-model="newCommand"
        mode="create"
        :error="formError"
        @save="saveCommand"
        @cancel="handleCancelNew"
      />

      <!-- View/Edit via child route -->
      <NuxtPage
        v-else
        :command="selectedCommand"
        :is-editing="isEditing"
        :edit-form="editCommand"
        :form-error="formError"
        :format-date="formatDate"
        @start-editing="startEditing"
        @save="saveCommand"
        @cancel="cancelEditing"
      />
    </template>
  </CrudPageLayout>
</template>
