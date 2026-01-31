<script lang="ts" setup>
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
}

interface CommandFormData {
  name: string
  description: string
  content: string
  allowedTools: string
}

const {
  isConnected,
  isLoading,
  items: commands,
  selectedItem: selectedCommand,
  isEditing,
  showNewForm,
  formError,
  newForm: newCommand,
  editForm: editCommand,
  load: loadCommands,
  select: selectCommand,
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

function handleDelete(name: string) {
  deleteItem(name, `Delete command "/${name}"?`)
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
    @new="showNew"
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
          icon="carbon:terminal"
          color="green"
          mono-name
          name-prefix="/"
          @select="selectCommand(cmd)"
          @delete="handleDelete(cmd.name)"
        />
      </div>
    </template>

    <!-- Editor -->
    <template #editor>
      <!-- Create Mode -->
      <CommandForm
        v-if="showNewForm"
        v-model="newCommand"
        mode="create"
        :error="formError"
        @save="saveCommand"
        @cancel="showNewForm = false"
      />

      <!-- View/Edit Mode -->
      <template v-else-if="selectedCommand">
        <CrudEditorHeader
          :title="`/${selectedCommand.name}`"
          :description="selectedCommand.description"
          :is-editing="isEditing"
          mono-title
          @edit="startEditing"
          @save="saveCommand"
          @cancel="cancelEditing"
        >
          <template #subtitle>
            <div class="text-xs opacity-50 mt-1">
              Updated: {{ formatDate(selectedCommand.updatedAt) }}
            </div>
          </template>
        </CrudEditorHeader>

        <!-- Edit Mode -->
        <CommandForm
          v-if="isEditing"
          v-model="editCommand"
          mode="edit"
          :error="formError"
        />

        <!-- View Mode -->
        <CommandView
          v-else
          :command="selectedCommand"
        />
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
    </template>
  </CrudPageLayout>
</template>
