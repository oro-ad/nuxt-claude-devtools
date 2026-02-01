<script lang="ts" setup>
interface Skill {
  name: string
  description: string
  content: string
  rawContent: string
  argumentHint?: string
  model?: string
  updatedAt: string
  source?: string
}

interface SkillFormData {
  name: string
  description: string
  content: string
  argumentHint: string
  model: string
}

const props = defineProps<{
  skill: Skill | null
  isEditing: boolean
  editForm: SkillFormData
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
  <template v-if="skill">
    <CrudEditorHeader
      :title="skill.name"
      :description="skill.description"
      :is-editing="isEditing"
      :readonly="skill.source !== 'project'"
      :source="skill.source"
      icon="carbon:lightning"
      icon-color="text-orange-500"
      show-icon
      @edit="emit('startEditing')"
      @save="emit('save')"
      @cancel="emit('cancel')"
    />

    <!-- Edit Mode -->
    <SkillForm
      v-if="isEditing"
      :model-value="editForm"
      mode="edit"
      :error="formError"
    />

    <!-- View Mode -->
    <SkillView
      v-else
      :skill="skill"
      :formatted-date="formatDate(skill.updatedAt)"
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
        icon="carbon:lightning"
      />
      <p>Loading skill...</p>
    </div>
  </div>
</template>
