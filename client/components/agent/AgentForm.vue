<script setup lang="ts">
/**
 * Agent form fields - used in both create and edit modes
 */

interface AgentFormData {
  name: string
  description: string
  prompt: string
  model: string
  tools: string
  skills: string[]
}

const props = defineProps<{
  mode: 'create' | 'edit'
  error?: string
  availableSkills?: string[]
}>()

const form = defineModel<AgentFormData>({ required: true })

defineEmits<{
  save: []
  cancel: []
}>()

const modelOptions = [
  { value: '', label: 'Default' },
  { value: 'sonnet', label: 'Sonnet (fast)' },
  { value: 'opus', label: 'Opus (powerful)' },
  { value: 'haiku', label: 'Haiku (fastest)' },
]

const isCreate = computed(() => props.mode === 'create')

function toggleSkill(skillName: string) {
  const idx = form.value.skills.indexOf(skillName)
  if (idx >= 0) {
    form.value.skills.splice(idx, 1)
  }
  else {
    form.value.skills.push(skillName)
  }
}
</script>

<template>
  <div class="flex-1 overflow-auto">
    <div class="p-4 border-b border-neutral-200 dark:border-neutral-800">
      <h3
        v-if="isCreate"
        class="font-bold mb-4"
      >
        Create New Subagent
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
            placeholder="e.g. reviewer, test-runner, docs-writer"
          />
          <div class="text-xs opacity-50 mt-1">
            Use lowercase with hyphens (kebab-case)
          </div>
        </div>

        <div>
          <label class="block text-sm font-medium mb-1">Description</label>
          <NTextInput
            v-model="form.description"
            class="w-full"
            placeholder="Brief description of what this agent does"
          />
        </div>

        <div>
          <label class="block text-sm font-medium mb-1">Model (optional)</label>
          <NSelect
            v-model="form.model"
            :options="modelOptions"
            class="w-full"
          />
        </div>

        <div>
          <label class="block text-sm font-medium mb-1">Tools (optional)</label>
          <NTextInput
            v-model="form.tools"
            class="w-full font-mono"
            placeholder="e.g. Read, Grep, Glob, Bash"
          />
          <div class="text-xs opacity-50 mt-1">
            Comma-separated list. Leave empty for all tools.
          </div>
        </div>

        <div v-if="availableSkills && availableSkills.length > 0">
          <label class="block text-sm font-medium mb-1">Skills</label>
          <div class="flex flex-wrap gap-2">
            <button
              v-for="skill in availableSkills"
              :key="skill"
              :class="form.skills.includes(skill) ? 'bg-orange-500 text-white' : 'n-bg-base'"
              class="px-2 py-1 rounded text-sm border border-neutral-200 dark:border-neutral-700"
              type="button"
              @click="toggleSkill(skill)"
            >
              {{ skill }}
            </button>
          </div>
          <div class="text-xs opacity-50 mt-1">
            Click to add/remove skills. Skills will be preloaded for the agent.
          </div>
        </div>
      </div>
    </div>

    <div class="p-4">
      <label class="block text-sm font-medium mb-1">System Prompt</label>
      <textarea
        v-model="form.prompt"
        class="w-full min-h-[200px] p-3 font-mono text-sm n-bg-base rounded-lg border border-neutral-200 dark:border-neutral-800 resize-y"
        placeholder="Write the system prompt for this agent..."
      />
    </div>
  </div>

  <div
    v-if="isCreate"
    class="p-4 border-t border-neutral-200 dark:border-neutral-800 flex gap-2 flex-shrink-0"
  >
    <NButton
      n="purple"
      @click="$emit('save')"
    >
      Create Agent
    </NButton>
    <NButton
      n="gray"
      @click="$emit('cancel')"
    >
      Cancel
    </NButton>
  </div>
</template>
