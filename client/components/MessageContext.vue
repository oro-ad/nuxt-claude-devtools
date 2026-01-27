<script lang="ts" setup>
import { computed } from 'vue'

export interface MessageContextData {
  viewport?: {
    width: number
    height: number
  }
  userAgent?: string
  routing?: {
    path: string
    fullPath?: string
    query?: Record<string, string | string[]>
    params?: Record<string, string>
    name?: string
    pageComponent?: string
  }
  components?: string[]
}

const props = defineProps<{
  context: MessageContextData
}>()

const hasViewport = computed(() => !!props.context.viewport)
const hasUserAgent = computed(() => !!props.context.userAgent)
const hasRouting = computed(() => !!props.context.routing)
const hasComponents = computed(() => props.context.components && props.context.components.length > 0)

const hasAnyContext = computed(() =>
  hasViewport.value || hasUserAgent.value || hasRouting.value || hasComponents.value,
)

// User agent is already simplified as "Browser on OS"
const userAgentDisplay = computed(() => {
  if (!props.context.userAgent) return null
  return props.context.userAgent
})

// Format query params for display
function formatQueryParams(query: Record<string, string | string[]>): string {
  return Object.entries(query)
    .map(([k, v]) => `${k}=${Array.isArray(v) ? v.join(',') : v}`)
    .join('&')
}
</script>

<template>
  <div
    v-if="hasAnyContext"
    class="flex flex-wrap gap-1.5 mb-2 pb-2 border-b border-neutral-200/50 dark:border-neutral-700/50"
  >
    <!-- Viewport -->
    <div
      v-if="hasViewport"
      class="flex items-center gap-1 px-2 py-0.5 bg-blue-500/10 text-blue-600 dark:text-blue-400 rounded text-xs"
      title="Viewport size"
    >
      <NIcon
        class="text-blue-500"
        icon="carbon:fit-to-screen"
      />
      <span>{{ context.viewport!.width }}×{{ context.viewport!.height }}</span>
    </div>

    <!-- User Agent -->
    <div
      v-if="hasUserAgent && userAgentDisplay"
      :title="context.userAgent"
      class="flex items-center gap-1 px-2 py-0.5 bg-orange-500/10 text-orange-600 dark:text-orange-400 rounded text-xs"
    >
      <NIcon
        class="text-orange-500"
        icon="carbon:application-web"
      />
      <span>{{ userAgentDisplay }}</span>
    </div>

    <!-- Routing -->
    <template v-if="hasRouting">
      <div
        :title="`Full path: ${context.routing!.fullPath || context.routing!.path}`"
        class="flex items-center gap-1 px-2 py-0.5 bg-green-500/10 text-green-600 dark:text-green-400 rounded text-xs"
      >
        <NIcon
          class="text-green-500"
          icon="carbon:location"
        />
        <span class="font-mono">{{ context.routing!.path }}</span>
      </div>

      <!-- Query params if present -->
      <div
        v-if="context.routing!.query && Object.keys(context.routing!.query).length > 0"
        :title="formatQueryParams(context.routing!.query)"
        class="flex items-center gap-1 px-2 py-0.5 bg-green-500/10 text-green-600 dark:text-green-400 rounded text-xs"
      >
        <NIcon
          class="text-green-500"
          icon="carbon:query"
        />
        <span class="font-mono truncate max-w-[150px]">?{{ formatQueryParams(context.routing!.query) }}</span>
      </div>

      <!-- Page component if available -->
      <div
        v-if="context.routing!.pageComponent"
        :title="context.routing!.pageComponent"
        class="flex items-center gap-1 px-2 py-0.5 bg-teal-500/10 text-teal-600 dark:text-teal-400 rounded text-xs"
      >
        <NIcon
          class="text-teal-500"
          icon="carbon:document"
        />
        <span class="font-mono">{{ context.routing!.pageComponent.split('/').pop() }}</span>
      </div>
    </template>

    <!-- Components -->
    <div
      v-for="comp in context.components"
      :key="comp"
      :title="comp"
      class="flex items-center gap-1 px-2 py-0.5 bg-purple-500/10 text-purple-600 dark:text-purple-400 rounded text-xs"
    >
      <NIcon
        class="text-purple-500"
        icon="carbon:application"
      />
      <span class="font-mono">{{ comp.split('/').pop()?.replace('.vue', '') }}</span>
    </div>
  </div>
</template>
