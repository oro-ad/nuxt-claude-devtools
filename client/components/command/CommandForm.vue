<script setup lang="ts">
/**
 * Command form fields - used in both create and edit modes
 */

interface CommandFormData {
  name: string
  description: string
  content: string
  allowedTools: string
}

const props = defineProps<{
  mode: 'create' | 'edit'
  error?: string
}>()

const form = defineModel<CommandFormData>({ required: true })

defineEmits<{
  save: []
  cancel: []
}>()

const isCreate = computed(() => props.mode === 'create')
</script>

<template>
  <div class="flex-1 overflow-auto">
    <div class="p-4 border-b border-neutral-200 dark:border-neutral-800">
      <h3
        v-if="isCreate"
        class="font-bold mb-4"
      >
        Create New Slash Command
      </h3>

      <FormError
        :error="error || ''"
        class="mb-4"
      />

      <div class="space-y-4">
        <!-- Name (create only) -->
        <div v-if="isCreate">
          <label class="block text-sm font-medium mb-1">Command Name</label>
          <NTextInput
            v-model="form.name"
            class="w-full font-mono"
            placeholder="e.g. review, deploy, test"
          />
          <div class="text-xs opacity-50 mt-1">
            Will be invoked as /{{ form.name || 'command-name' }}
          </div>
        </div>

        <div>
          <label class="block text-sm font-medium mb-1">Description (optional)</label>
          <NTextInput
            v-model="form.description"
            class="w-full"
            placeholder="Brief description of what this command does"
          />
        </div>

        <div>
          <label class="block text-sm font-medium mb-1">Allowed Tools (optional)</label>
          <NTextInput
            v-model="form.allowedTools"
            class="w-full font-mono"
            placeholder="e.g. Bash(git:*), Read, Edit"
          />
          <div class="text-xs opacity-50 mt-1">
            Comma-separated list of allowed tools
          </div>
        </div>
      </div>
    </div>

    <div class="p-4">
      <label class="block text-sm font-medium mb-1">Command Prompt</label>
      <textarea
        v-model="form.content"
        class="w-full min-h-[200px] p-3 font-mono text-sm n-bg-base rounded-lg border border-neutral-200 dark:border-neutral-800 resize-y"
        placeholder="Write the prompt for this command..."
      />
    </div>
  </div>

  <div
    v-if="isCreate"
    class="p-4 border-t border-neutral-200 dark:border-neutral-800 flex gap-2 flex-shrink-0"
  >
    <NButton
      n="green"
      @click="$emit('save')"
    >
      Create Command
    </NButton>
    <NButton
      n="gray"
      @click="$emit('cancel')"
    >
      Cancel
    </NButton>
  </div>
</template>
