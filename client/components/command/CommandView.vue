<script setup lang="ts">
interface Command {
  name: string
  description?: string
  content: string
  allowedTools?: string[]
  updatedAt: string
}

defineProps<{
  command: Command
}>()
</script>

<template>
  <div class="flex-1 p-4 overflow-auto">
    <div
      v-if="command.allowedTools && command.allowedTools.length > 0"
      class="mb-4"
    >
      <div class="text-xs font-medium opacity-50 mb-1">
        Allowed Tools
      </div>
      <div class="flex flex-wrap gap-1">
        <NBadge
          v-for="tool in command.allowedTools"
          :key="tool"
          class="font-mono text-xs"
          n="blue"
        >
          {{ tool }}
        </NBadge>
      </div>
    </div>
    <MarkdownContent
      :content="command.content"
      class="max-w-none"
    />
  </div>
</template>
