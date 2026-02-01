<script lang="ts" setup>
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

const props = defineProps<{
  command: SlashCommand | null
  isEditing: boolean
  editForm: CommandFormData
  formError: string
  formatDate: (date: string) => string
}>()

const emit = defineEmits<{
  startEditing: []
  save: []
  cancel: []
}>()
</script>

<template>
  <template v-if="command">
    <CrudEditorHeader
      :title="`/${command.name}`"
      :description="command.description"
      :is-editing="isEditing"
      :readonly="command.source !== 'project'"
      :source="command.source"
      mono-title
      @edit="emit('startEditing')"
      @save="emit('save')"
      @cancel="emit('cancel')"
    >
      <template #subtitle>
        <div class="text-xs opacity-50 mt-1">
          Updated: {{ formatDate(command.updatedAt) }}
        </div>
      </template>
    </CrudEditorHeader>

    <!-- Edit Mode -->
    <CommandForm
      v-if="isEditing"
      :model-value="editForm"
      mode="edit"
      :error="formError"
    />

    <!-- View Mode -->
    <CommandView
      v-else
      :command="command"
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
        icon="carbon:terminal"
      />
      <p>Loading command...</p>
    </div>
  </div>
</template>
