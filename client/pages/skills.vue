<script lang="ts" setup>
import { useCrudResource } from '~/composables/useCrudResource'

interface Skill {
  name: string
  description: string
  content: string
  rawContent: string
  argumentHint?: string
  model?: string
  updatedAt: string
}

interface SkillFormData {
  name: string
  description: string
  content: string
  argumentHint: string
  model: string
}

const {
  isConnected,
  isLoading,
  items: skills,
  selectedItem: selectedSkill,
  isEditing,
  showNewForm,
  formError,
  newForm: newSkill,
  editForm: editSkill,
  load: loadSkills,
  select: selectSkill,
  startEditing,
  save: saveSkill,
  cancelEditing,
  deleteItem,
  showNew,
  formatDate,
} = useCrudResource<Skill, SkillFormData>({
  resourceName: 'skills',
  loggerName: 'skills',

  createDefaultForm: () => ({
    name: '',
    description: '',
    content: '',
    argumentHint: '',
    model: '',
  }),

  resourceToForm: skill => ({
    name: skill.name,
    description: skill.description,
    content: skill.content,
    argumentHint: skill.argumentHint || '',
    model: skill.model || '',
  }),

  validateForm: (form) => {
    if (!form.name) return 'Name is required'
    if (!form.description) return 'Description is required'
    if (!form.content) return 'Content is required'
    return null
  },

  transformFormForSave: form => ({
    name: form.name,
    description: form.description,
    content: form.content,
    argumentHint: form.argumentHint || undefined,
    model: form.model || undefined,
  }),
})

function handleDelete(name: string) {
  deleteItem(name, `Delete skill "${name}"?`)
}
</script>

<template>
  <CrudPageLayout
    title="Skills"
    icon="carbon:lightning"
    color="orange"
    :is-connected="isConnected"
    :is-loading="isLoading"
    info-tip="Skills extend Claude's capabilities with custom knowledge."
    storage-path=".claude/skills/<name>/SKILL.md"
    empty-message="No skills configured yet. Create one to get started."
    empty-editor-message="Select a skill or create a new one"
    new-button-label="New Skill"
    @new="showNew"
    @refresh="loadSkills"
  >
    <!-- List -->
    <template #list>
      <div
        v-if="skills.length === 0 && !isLoading"
        class="n-bg-active rounded-lg p-4 opacity-50 text-sm"
      >
        No skills configured yet.
        <br>
        Create one to get started.
      </div>

      <div class="space-y-1">
        <CrudListItem
          v-for="skill in skills"
          :key="skill.name"
          :selected="selectedSkill?.name === skill.name"
          :name="skill.name"
          :description="skill.description"
          icon="carbon:lightning"
          color="orange"
          @select="selectSkill(skill)"
          @delete="handleDelete(skill.name)"
        />
      </div>
    </template>

    <!-- Editor -->
    <template #editor>
      <!-- Create Mode -->
      <SkillForm
        v-if="showNewForm"
        v-model="newSkill"
        mode="create"
        :error="formError"
        @save="saveSkill"
        @cancel="showNewForm = false"
      />

      <!-- View/Edit Mode -->
      <template v-else-if="selectedSkill">
        <CrudEditorHeader
          :title="selectedSkill.name"
          :description="selectedSkill.description"
          :is-editing="isEditing"
          icon="carbon:lightning"
          icon-color="text-orange-500"
          show-icon
          @edit="startEditing"
          @save="saveSkill"
          @cancel="cancelEditing"
        />

        <!-- Edit Mode -->
        <SkillForm
          v-if="isEditing"
          v-model="editSkill"
          mode="edit"
          :error="formError"
        />

        <!-- View Mode -->
        <SkillView
          v-else
          :skill="selectedSkill"
          :formatted-date="formatDate(selectedSkill.updatedAt)"
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
            icon="carbon:lightning"
          />
          <p>Select a skill or create a new one</p>
        </div>
      </div>
    </template>
  </CrudPageLayout>
</template>
