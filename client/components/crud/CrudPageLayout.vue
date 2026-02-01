<script lang="ts" setup>
/**
 * CRUD page layout extending PageLayout with sidebar list and editor panel
 */

defineProps<{
  /** Page title */
  title: string
  /** Icon for the page (carbon icon name) */
  icon: string
  /** Color theme (for buttons, highlights) */
  color: 'purple' | 'orange' | 'green' | 'blue'
  /** Whether socket is connected */
  isConnected: boolean
  /** Whether data is loading */
  isLoading: boolean
  /** Info tip text for the sidebar */
  infoTip?: string
  /** Storage path hint for the tip */
  storagePath?: string
  /** Empty list message */
  emptyMessage?: string
  /** Empty editor message */
  emptyEditorMessage?: string
  /** New button label */
  newButtonLabel?: string
}>()

defineEmits<{
  /** Emitted when "New" button is clicked */
  new: []
  /** Emitted when "Refresh" button is clicked */
  refresh: []
}>()
</script>

<template>
  <PageLayout
    :color="color"
    :icon="icon"
    :title="title"
  >
    <template #actions>
      <slot name="header-actions">
        <NButton
          :disabled="!isConnected"
          :n="color"
          @click="$emit('new')"
        >
          <NIcon
            class="mr-1"
            icon="carbon:add"
          />
          {{ newButtonLabel || 'New' }}
        </NButton>
        <NButton
          :disabled="!isConnected || isLoading"
          n="gray"
          @click="$emit('refresh')"
        >
          <NIcon
            :class="{ 'animate-spin': isLoading }"
            class="mr-1"
            icon="carbon:restart"
          />
          Refresh
        </NButton>
      </slot>
    </template>

    <!-- CRUD Content: Sidebar + Editor -->
    <div class="flex gap-4 h-full">
      <!-- Sidebar List -->
      <div class="w-68 max-w-68 flex-shrink-0 space-y-4 overflow-hidden px-1 overflow-y-auto">
        <!-- Info Tip -->
        <NTip
          v-if="infoTip"
          :n="color"
          class="text-xs"
          icon="carbon:information"
        >
          {{ infoTip }}
          <br v-if="storagePath">
          <code
            v-if="storagePath"
            class="font-mono"
          >{{ storagePath }}</code>
        </NTip>

        <!-- List content -->
        <slot name="list">
          <div
            v-if="emptyMessage"
            class="n-bg-active rounded-lg p-4 opacity-50 text-sm"
          >
            {{ emptyMessage }}
          </div>
        </slot>
      </div>

      <!-- Editor Panel -->
      <div class="flex-1 flex flex-col n-bg-active rounded-lg overflow-hidden">
        <slot name="editor">
          <!-- Empty State -->
          <div class="flex-1 flex items-center justify-center opacity-50">
            <div class="text-center">
              <NIcon
                :icon="icon"
                class="text-4xl mb-2"
              />
              <p>{{ emptyEditorMessage || 'Select an item or create a new one' }}</p>
            </div>
          </div>
        </slot>
      </div>
    </div>
  </PageLayout>
</template>
