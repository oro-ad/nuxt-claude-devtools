<script setup lang="ts">
/**
 * Skill form fields - used in both create and edit modes
 */

interface SkillFormData {
  name: string
  description: string
  content: string
  argumentHint: string
  model: string
}

const props = defineProps<{
  /** Form mode */
  mode: 'create' | 'edit'
  /** Form error message */
  error?: string
}>()

const form = defineModel<SkillFormData>({ required: true })

defineEmits<{
  save: []
  cancel: []
}>()

const modelOptions = [
  { value: '', label: 'Inherit (default)' },
  { value: 'sonnet', label: 'Sonnet' },
  { value: 'opus', label: 'Opus' },
  { value: 'haiku', label: 'Haiku' },
]

const isCreate = computed(() => props.mode === 'create')
</script>

<template>
  <div class="flex-1 overflow-auto">
    <div class="p-4 border-b border-neutral-200 dark:border-neutral-800">
      <h3
        v-if="isCreate"
        class="font-bold mb-4"
      >
        Create New Skill
      </h3>

      <FormError
        :error="error || ''"
        class="mb-4"
      />

      <div class="space-y-4">
        <!-- Name (create only) -->
        <div v-if="isCreate">
          <label class="block text-sm font-medium mb-1">Name</label>
          <NTextInput
            v-model="form.name"
            class="w-full font-mono"
            placeholder="e.g. vue-expert, code-reviewer"
          />
        </div>

        <div>
          <label class="block text-sm font-medium mb-1">Description</label>
          <NTextInput
            v-model="form.description"
            class="w-full"
            placeholder="Brief description of what this skill does"
          />
        </div>

        <div>
          <label class="block text-sm font-medium mb-1">Argument Hint (optional)</label>
          <NTextInput
            v-model="form.argumentHint"
            class="w-full"
            placeholder="e.g. <query>"
          />
          <div class="text-xs opacity-50 mt-1">
            Hint for argument when using /skillname
          </div>
        </div>

        <div>
          <label class="block text-sm font-medium mb-1">Model (optional)</label>
          <NSelect
            v-model="form.model"
            :options="modelOptions"
            class="w-full"
          />
        </div>
      </div>
    </div>

    <div class="p-4">
      <label class="block text-sm font-medium mb-1">Content (Markdown)</label>
      <textarea
        v-model="form.content"
        class="w-full min-h-[200px] p-3 font-mono text-sm n-bg-base rounded-lg border border-neutral-200 dark:border-neutral-800 resize-y"
        placeholder="Write the skill instructions in markdown..."
      />
    </div>
  </div>

  <!-- Footer buttons (create mode only - edit uses CrudEditorHeader) -->
  <div
    v-if="isCreate"
    class="p-4 border-t border-neutral-200 dark:border-neutral-800 flex gap-2 flex-shrink-0"
  >
    <NButton
      n="orange"
      @click="$emit('save')"
    >
      Create Skill
    </NButton>
    <NButton
      n="gray"
      @click="$emit('cancel')"
    >
      Cancel
    </NButton>
  </div>
</template>
