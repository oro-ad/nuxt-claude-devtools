<script lang="ts" setup>
interface PluginManifest {
  name: string
  version?: string
  description?: string
  author?: { name?: string }
  homepage?: string
  repository?: string
  license?: string
  keywords?: string[]
}

interface InstalledPlugin {
  id: string
  name: string
  marketplace: string
  scope: 'user' | 'project' | 'local' | 'managed'
  enabled: boolean
  manifest?: PluginManifest
  cachePath?: string
}

interface PluginDetails {
  plugin: InstalledPlugin
  skills: Array<{ name: string, description: string, fullName: string }>
  commands: Array<{ name: string, description?: string, fullName: string }>
  agents: Array<{ name: string, description: string }>
}

const _props = defineProps<{
  plugin: InstalledPlugin | null
  pluginDetails: PluginDetails | null
  getScopeColor: (scope: string) => string
}>()
</script>

<template>
  <div v-if="plugin">
    <!-- Header -->
    <div class="p-4 border-b border-neutral-200 dark:border-neutral-800">
      <div class="flex items-center gap-3">
        <NIcon
          class="text-2xl text-cyan-500"
          icon="carbon:application"
        />
        <div>
          <h2 class="text-lg font-bold">
            {{ plugin.name }}
          </h2>
          <div class="text-sm opacity-50">
            {{ plugin.marketplace }}
          </div>
        </div>
      </div>
      <p
        v-if="plugin.manifest?.description"
        class="mt-2 text-sm opacity-70"
      >
        {{ plugin.manifest.description }}
      </p>
      <div class="flex flex-wrap gap-2 mt-3">
        <NBadge :n="getScopeColor(plugin.scope)">
          {{ plugin.scope }} scope
        </NBadge>
        <NBadge :n="plugin.enabled ? 'green' : 'red'">
          {{ plugin.enabled ? 'enabled' : 'disabled' }}
        </NBadge>
        <NBadge
          v-if="plugin.manifest?.version"
          n="gray"
        >
          v{{ plugin.manifest.version }}
        </NBadge>
        <NBadge
          v-if="plugin.manifest?.license"
          n="gray"
        >
          {{ plugin.manifest.license }}
        </NBadge>
      </div>
      <div
        v-if="plugin.manifest?.author?.name"
        class="mt-2 text-xs opacity-50"
      >
        Author: {{ plugin.manifest.author.name }}
      </div>
      <div
        v-if="plugin.manifest?.homepage"
        class="mt-1"
      >
        <a
          :href="plugin.manifest.homepage"
          class="text-xs text-cyan-500 hover:underline"
          target="_blank"
        >
          {{ plugin.manifest.homepage }}
        </a>
      </div>
    </div>

    <!-- Content -->
    <div class="flex-1 p-4 overflow-auto">
      <template v-if="pluginDetails">
        <!-- Skills -->
        <div
          v-if="pluginDetails.skills.length > 0"
          class="mb-6"
        >
          <h3 class="text-sm font-medium opacity-50 mb-2 flex items-center gap-2">
            <NIcon icon="carbon:lightning" />
            Skills ({{ pluginDetails.skills.length }})
          </h3>
          <div class="space-y-1">
            <NuxtLink
              v-for="skill in pluginDetails.skills"
              :key="skill.fullName"
              :to="`/skills/${skill.fullName}`"
              class="n-bg-base rounded p-2 block hover:ring-1 hover:ring-orange-500 transition-all"
            >
              <div class="font-mono text-sm text-orange-500">
                /{{ skill.fullName }}
              </div>
              <div
                v-if="skill.description"
                class="text-xs opacity-50 mt-1"
              >
                {{ skill.description }}
              </div>
            </NuxtLink>
          </div>
        </div>

        <!-- Commands -->
        <div
          v-if="pluginDetails.commands.length > 0"
          class="mb-6"
        >
          <h3 class="text-sm font-medium opacity-50 mb-2 flex items-center gap-2">
            <NIcon icon="carbon:terminal" />
            Commands ({{ pluginDetails.commands.length }})
          </h3>
          <div class="space-y-1">
            <NuxtLink
              v-for="cmd in pluginDetails.commands"
              :key="cmd.fullName"
              :to="`/commands/${cmd.fullName}`"
              class="n-bg-base rounded p-2 block hover:ring-1 hover:ring-green-500 transition-all"
            >
              <div class="font-mono text-sm text-green-500">
                /{{ cmd.fullName }}
              </div>
              <div
                v-if="cmd.description"
                class="text-xs opacity-50 mt-1"
              >
                {{ cmd.description }}
              </div>
            </NuxtLink>
          </div>
        </div>

        <!-- Agents -->
        <div
          v-if="pluginDetails.agents.length > 0"
          class="mb-6"
        >
          <h3 class="text-sm font-medium opacity-50 mb-2 flex items-center gap-2">
            <NIcon icon="carbon:bot" />
            Agents ({{ pluginDetails.agents.length }})
          </h3>
          <div class="space-y-1">
            <NuxtLink
              v-for="agent in pluginDetails.agents"
              :key="agent.name"
              :to="`/agents/${agent.name}`"
              class="n-bg-base rounded p-2 block hover:ring-1 hover:ring-purple-500 transition-all"
            >
              <div class="font-medium text-sm text-purple-500">
                {{ agent.name }}
              </div>
              <div
                v-if="agent.description"
                class="text-xs opacity-50 mt-1"
              >
                {{ agent.description }}
              </div>
            </NuxtLink>
          </div>
        </div>

        <!-- Empty state -->
        <div
          v-if="pluginDetails.skills.length === 0 && pluginDetails.commands.length === 0 && pluginDetails.agents.length === 0"
          class="text-center opacity-50 py-8"
        >
          <NIcon
            class="text-4xl mb-2"
            icon="carbon:folder"
          />
          <p>No skills, commands, or agents in this plugin</p>
        </div>
      </template>
      <template v-else-if="plugin.cachePath">
        <div class="flex items-center justify-center h-full opacity-50">
          <NIcon
            class="animate-spin mr-2"
            icon="carbon:circle-dash"
          />
          Loading plugin details...
        </div>
      </template>
      <template v-else>
        <div class="text-center opacity-50 py-8">
          <NIcon
            class="text-4xl mb-2"
            icon="carbon:warning"
          />
          <p>Plugin not found in cache</p>
          <p class="text-xs mt-1">
            The plugin may need to be re-installed
          </p>
        </div>
      </template>
    </div>
  </div>

  <!-- Loading or not found -->
  <div
    v-else
    class="flex-1 flex items-center justify-center opacity-50"
  >
    <div class="text-center">
      <NIcon
        class="text-4xl mb-2 animate-pulse"
        icon="carbon:application"
      />
      <p>Loading plugin...</p>
    </div>
  </div>
</template>
