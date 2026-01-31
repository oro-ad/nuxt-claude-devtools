<script setup lang="ts">
interface Agent {
  name: string
  description: string
  prompt: string
  model?: string
  tools?: string[]
  skills?: string[]
  updatedAt: string
}

defineProps<{
  agent: Agent
  formattedDate: string
}>()
</script>

<template>
  <div class="flex-1 p-4 overflow-auto">
    <div class="space-y-4">
      <div class="flex flex-wrap gap-2">
        <NBadge
          v-if="agent.model"
          n="purple"
        >
          Model: {{ agent.model }}
        </NBadge>
      </div>

      <div class="text-xs opacity-50">
        Updated: {{ formattedDate }}
      </div>

      <div v-if="agent.tools && agent.tools.length > 0">
        <div class="text-sm font-medium opacity-50 mb-1">
          Tools
        </div>
        <div class="flex flex-wrap gap-1">
          <NBadge
            v-for="tool in agent.tools"
            :key="tool"
            class="font-mono text-xs"
            n="blue"
          >
            {{ tool }}
          </NBadge>
        </div>
      </div>

      <div v-if="agent.skills && agent.skills.length > 0">
        <div class="text-sm font-medium opacity-50 mb-1">
          Skills
        </div>
        <div class="flex flex-wrap gap-1">
          <NBadge
            v-for="skill in agent.skills"
            :key="skill"
            class="text-xs"
            n="orange"
          >
            {{ skill }}
          </NBadge>
        </div>
      </div>

      <div>
        <div class="text-sm font-medium opacity-50 mb-2">
          System Prompt
        </div>
        <MarkdownContent
          :content="agent.prompt"
          class="max-w-none"
        />
      </div>
    </div>
  </div>
</template>
