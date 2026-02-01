<script lang="ts" setup>
import { computed } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useCrudResource } from '~/composables/useCrudResource'

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

const route = useRoute()
const router = useRouter()

const {
  isConnected,
  isLoading,
  items: skills,
  isEditing,
  showNewForm,
  formError,
  newForm: newSkill,
  editForm: editSkill,
  load: loadSkills,
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

// Computed selected skill from route param
const selectedSkill = computed(() => {
  const name = route.params.name as string | undefined
  if (!name) return null
  return skills.value.find(s => s.name === name) || null
})

// Select skill by navigating
function selectSkill(skill: Skill) {
  showNewForm.value = false
  router.push(`/skills/${skill.name}`)
}

function handleDelete(name: string) {
  deleteItem(name, `Delete skill "${name}"?`)
}

function handleShowNew() {
  showNew()
  router.push('/skills')
}

function handleCancelNew() {
  showNewForm.value = false
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
    @new="handleShowNew"
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
          :source="skill.source"
          icon="carbon:lightning"
          color="orange"
          @select="selectSkill(skill)"
          @delete="handleDelete(skill.name)"
        />
      </div>
    </template>

    <!-- Editor via NuxtPage -->
    <template #editor>
      <!-- Create Mode -->
      <SkillForm
        v-if="showNewForm"
        v-model="newSkill"
        mode="create"
        :error="formError"
        @save="saveSkill"
        @cancel="handleCancelNew"
      />

      <!-- View/Edit via child route -->
      <NuxtPage
        v-else
        :skill="selectedSkill"
        :is-editing="isEditing"
        :edit-form="editSkill"
        :form-error="formError"
        :format-date="formatDate"
        @start-editing="startEditing"
        @save="saveSkill"
        @cancel="cancelEditing"
      />
    </template>
  </CrudPageLayout>
</template>
