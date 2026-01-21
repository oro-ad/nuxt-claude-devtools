<script lang="ts" setup>
import { computed, ref } from 'vue'
import { useDevtoolsClient } from '@nuxt/devtools-kit/iframe-client'

const client = useDevtoolsClient()

interface ToolUseBlock {
  type: 'tool_use'
  id: string
  name: string
  input: Record<string, unknown>
}

interface ToolResultBlock {
  type: 'tool_result'
  tool_use_id: string
  content: string | unknown[]
  is_error?: boolean
}

const props = defineProps<{
  toolUse: ToolUseBlock
  toolResult?: ToolResultBlock
}>()

const isInputExpanded = ref(false)
const isResultExpanded = ref(false)

const inputJson = computed(() => {
  return JSON.stringify(props.toolUse.input, null, 2)
})

const inputFieldsCount = computed(() => {
  return Object.keys(props.toolUse.input).length
})

const resultContent = computed(() => {
  if (!props.toolResult) return ''
  if (typeof props.toolResult.content === 'string') {
    return props.toolResult.content
  }
  return JSON.stringify(props.toolResult.content, null, 2)
})

const resultPreview = computed(() => {
  const content = resultContent.value
  if (content.length <= 100) return content
  return content.substring(0, 100) + '...'
})

const toolIcon = computed(() => {
  const iconMap: Record<string, string> = {
    Read: 'carbon:document',
    Write: 'carbon:document-add',
    Edit: 'carbon:edit',
    Bash: 'carbon:terminal',
    Glob: 'carbon:search',
    Grep: 'carbon:search-locate',
    WebFetch: 'carbon:cloud',
    WebSearch: 'carbon:search',
    Task: 'carbon:task',
    TodoWrite: 'carbon:list-checked',
    AskUserQuestion: 'carbon:help',
  }
  return iconMap[props.toolUse.name] || 'carbon:tool-box'
})

const shortId = computed(() => {
  return props.toolUse.id.substring(0, 12)
})

// Extract file path from input if present
const filePath = computed(() => {
  const input = props.toolUse.input
  // Common path field names in Claude tools
  const path = input.file_path || input.path || input.filePath || input.filename || input.file || null
  return path ? String(path) : null
})

// Extract URL from input if present (for WebFetch, WebSearch, etc.)
const urlValue = computed(() => {
  const input = props.toolUse.input
  const url = input.url || input.uri || input.href || input.link || null
  return url ? String(url) : null
})

// Display URL - truncate if too long
const displayUrl = computed(() => {
  if (!urlValue.value) return null
  const url = urlValue.value
  const maxLen = 50

  if (url.length <= maxLen) return url

  // Try to show domain + truncated path
  try {
    const parsed = new URL(url)
    const domain = parsed.hostname
    const pathPart = parsed.pathname + parsed.search
    if (pathPart.length > maxLen - domain.length - 3) {
      return domain + pathPart.substring(0, maxLen - domain.length - 6) + '...'
    }
    return url
  }
  catch {
    return url.substring(0, maxLen - 3) + '...'
  }
})

// Extract line number if present
const lineNumber = computed(() => {
  const input = props.toolUse.input
  return input.line || input.lineNumber || input.offset || null
})

// Display path - show end of path (filename + some context)
const displayPath = computed(() => {
  if (!filePath.value) return null
  const path = filePath.value
  const maxLen = 32

  if (path.length <= maxLen) return path

  // Find a good break point (path separator)
  const truncated = path.slice(-maxLen)
  const sepIndex = truncated.indexOf('/')
  if (sepIndex > 0 && sepIndex < 15) {
    return '...' + truncated.slice(sepIndex)
  }
  return '...' + truncated
})

// Open file in IDE using Nuxt DevTools (auto-detects IDE)
async function openInIde() {
  if (!filePath.value) return

  try {
    // Build path with line number if available
    let path = filePath.value
    if (lineNumber.value) {
      path = `${path}:${lineNumber.value}`
    }

    // Use DevTools RPC - automatically uses user's configured editor
    if (client.value?.devtools?.rpc?.openInEditor) {
      const success = await client.value.devtools.rpc.openInEditor(path)
      if (success) return
    }

    // Fallback: try webstorm:// protocol (common for JetBrains IDEs)
    const line = lineNumber.value ? `:${lineNumber.value}` : ''
    const ideUrl = `webstorm://open?file=${encodeURIComponent(filePath.value)}${lineNumber.value ? `&line=${lineNumber.value}` : ''}`
    window.open(ideUrl, '_self')
  }
  catch (e) {
    console.error('Failed to open file in IDE:', e)
  }
}
</script>

<template>
  <div class="tool-call-block rounded-lg border border-gray-200 dark:border-gray-700 my-2 overflow-hidden text-sm">
    <!-- Tool Header -->
    <div class="flex items-center gap-2 px-3 py-2 bg-blue-500/10">
      <NIcon
        :icon="toolIcon"
        class="text-blue-500 flex-shrink-0"
      />
      <span class="font-medium">{{ toolUse.name }}</span>
      <button
        v-if="displayPath"
        :title="`${filePath} (click to open in IDE)`"
        class="text-xs text-blue-600 dark:text-blue-400 font-mono hover:underline cursor-pointer truncate max-w-[300px] text-right"
        @click.stop="openInIde"
      >
        {{ displayPath }}
      </button>
      <a
        v-else-if="displayUrl"
        :href="urlValue!"
        :title="urlValue!"
        class="text-xs text-blue-600 dark:text-blue-400 font-mono hover:underline truncate max-w-[300px] text-right"
        rel="noopener noreferrer"
        target="_blank"
        @click.stop
      >
        {{ displayUrl }}
      </a>
      <span
        v-else
        class="text-xs opacity-50 font-mono"
      >{{ shortId }}</span>
      <div
        v-if="toolResult"
        class="ml-auto flex-shrink-0"
      >
        <NBadge
          v-if="toolResult.is_error"
          n="red"
        >
          Error
        </NBadge>
        <NBadge
          v-else
          n="green"
        >
          Done
        </NBadge>
      </div>
      <div
        v-else
        class="ml-auto flex-shrink-0"
      >
        <NBadge n="yellow">
          Running
        </NBadge>
      </div>
    </div>

    <!-- Input Section (Collapsible) -->
    <div
      v-if="inputFieldsCount > 0"
      class="border-t border-gray-200 dark:border-gray-700"
    >
      <button
        class="w-full px-3 py-2 text-left flex items-center gap-2 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
        @click="isInputExpanded = !isInputExpanded"
      >
        <NIcon
          :icon="isInputExpanded ? 'carbon:chevron-down' : 'carbon:chevron-right'"
          class="text-xs opacity-70"
        />
        <span class="font-medium opacity-70">Parameters</span>
        <span class="text-xs opacity-50">
          {{ inputFieldsCount }} {{ inputFieldsCount === 1 ? 'field' : 'fields' }}
        </span>
      </button>
      <div
        v-if="isInputExpanded"
        class="px-3 pb-2"
      >
        <pre class="text-xs n-bg-base p-2 rounded overflow-x-auto max-h-64 whitespace-pre-wrap">{{ inputJson }}</pre>
      </div>
    </div>

    <!-- Result Section (Collapsible) -->
    <div
      v-if="toolResult"
      :class="{ 'bg-red-500/5': toolResult.is_error }"
      class="border-t border-gray-200 dark:border-gray-700"
    >
      <button
        class="w-full px-3 py-2 text-left flex items-center gap-2 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
        @click="isResultExpanded = !isResultExpanded"
      >
        <NIcon
          :icon="isResultExpanded ? 'carbon:chevron-down' : 'carbon:chevron-right'"
          class="text-xs opacity-70"
        />
        <span class="font-medium opacity-70">
          {{ toolResult.is_error ? 'Error' : 'Result' }}
        </span>
        <NIcon
          v-if="toolResult.is_error"
          class="text-red-500"
          icon="carbon:warning"
        />
      </button>
      <div
        v-if="isResultExpanded"
        class="px-3 pb-2"
      >
        <pre class="text-xs n-bg-base p-2 rounded overflow-x-auto max-h-96 whitespace-pre-wrap">{{
            resultContent
        }}</pre>
      </div>
      <div
        v-else-if="resultContent"
        class="px-3 pb-2"
      >
        <div class="text-xs opacity-50 truncate font-mono">
          {{ resultPreview }}
        </div>
      </div>
    </div>
  </div>
</template>
