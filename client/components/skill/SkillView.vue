<script setup lang="ts">
interface Skill {
  name: string
  description: string
  content: string
  argumentHint?: string
  model?: string
  updatedAt: string
}

defineProps<{
  skill: Skill
  formattedDate: string
}>()
</script>

<template>
  <div class="flex-1 p-4 overflow-auto">
    <div class="flex flex-wrap gap-2 mb-4">
      <NBadge
        v-if="skill.model"
        n="blue"
      >
        Model: {{ skill.model }}
      </NBadge>
      <NBadge
        v-if="skill.argumentHint"
        n="gray"
      >
        Arg: {{ skill.argumentHint }}
      </NBadge>
    </div>
    <div class="text-xs opacity-50 mb-4">
      Updated: {{ formattedDate }}
    </div>
    <MarkdownContent
      :content="skill.content"
      class="max-w-none"
    />
  </div>
</template>
