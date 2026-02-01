import { existsSync, readdirSync, readFileSync, statSync } from 'node:fs'
import { homedir } from 'node:os'
import { join } from 'node:path'
import { createLogger } from '../logger'
import {
  AGENTS_SUBDIR,
  CLAUDE_DIR,
  CLAUDE_SETTINGS_FILE,
  CLAUDE_SETTINGS_LOCAL_FILE,
  COMMANDS_SUBDIR,
  DEFAULT_PLUGINS_CACHE_PATH,
  PLUGIN_MANIFEST_DIR,
  PLUGIN_MANIFEST_FILE,
  SKILL_FILE,
  SKILLS_SUBDIR,
} from './constants'

const log = createLogger('plugins', { timestamp: true })

// ============ Types ============

export type PluginScope = 'user' | 'project' | 'local' | 'managed'

export interface PluginManifest {
  name: string
  version?: string
  description?: string
  author?: {
    name?: string
    email?: string
    url?: string
  }
  homepage?: string
  repository?: string
  license?: string
  keywords?: string[]
}

export interface InstalledPlugin {
  /** Plugin identifier (name@marketplace) */
  id: string
  /** Plugin name */
  name: string
  /** Marketplace name */
  marketplace: string
  /** Installation scope */
  scope: PluginScope
  /** Whether plugin is enabled */
  enabled: boolean
  /** Plugin manifest (if available from cache) */
  manifest?: PluginManifest
  /** Path to plugin in cache (if found) */
  cachePath?: string
}

export interface Marketplace {
  /** Marketplace identifier */
  name: string
  /** Source (GitHub repo, URL, or local path) */
  source: string
  /** Whether auto-update is enabled */
  autoUpdate?: boolean
}

export interface PluginSkill {
  name: string
  description: string
  content: string
  pluginName: string
  /** Full invocation name: plugin-name:skill-name */
  fullName: string
}

export interface PluginCommand {
  name: string
  description?: string
  content: string
  pluginName: string
  /** Full invocation name: plugin-name:command-name */
  fullName: string
}

export interface PluginAgent {
  name: string
  description: string
  prompt: string
  pluginName: string
}

// ============ Settings Types ============

type PluginList = string[] | Record<string, boolean>

interface ClaudeSettings {
  enabledPlugins?: PluginList
  disabledPlugins?: PluginList
  extraKnownMarketplaces?: Array<{
    name: string
    source: string
    autoUpdate?: boolean
  }>
}

// ============ Manager ============

export class PluginsManager {
  private projectPath: string
  private pluginsCachePath: string
  private userClaudeDir: string

  constructor(projectPath: string, customCachePath?: string | null) {
    this.projectPath = projectPath
    this.userClaudeDir = join(homedir(), CLAUDE_DIR)

    // Determine plugins cache path
    if (customCachePath) {
      this.pluginsCachePath = customCachePath
    }
    else {
      this.pluginsCachePath = join(homedir(), DEFAULT_PLUGINS_CACHE_PATH)
    }

    log('PluginsManager initialized', {
      projectPath,
      pluginsCachePath: this.pluginsCachePath,
      userClaudeDir: this.userClaudeDir,
    })
  }

  // ============ Settings Reading ============

  private readSettingsFile(path: string): ClaudeSettings | null {
    try {
      if (!existsSync(path)) {
        return null
      }
      const content = readFileSync(path, 'utf-8')
      return JSON.parse(content)
    }
    catch (error) {
      log('Failed to read settings file', { path, error })
      return null
    }
  }

  private getUserSettings(): ClaudeSettings | null {
    const path = join(this.userClaudeDir, CLAUDE_SETTINGS_FILE)
    return this.readSettingsFile(path)
  }

  private getProjectSettings(): ClaudeSettings | null {
    const path = join(this.projectPath, CLAUDE_DIR, CLAUDE_SETTINGS_FILE)
    return this.readSettingsFile(path)
  }

  private getLocalSettings(): ClaudeSettings | null {
    const path = join(this.projectPath, CLAUDE_DIR, CLAUDE_SETTINGS_LOCAL_FILE)
    return this.readSettingsFile(path)
  }

  // ============ Plugin Discovery ============

  private parsePluginId(pluginId: string): { name: string, marketplace: string } | null {
    const atIndex = pluginId.lastIndexOf('@')
    if (atIndex === -1 || atIndex === 0) {
      return null
    }
    return {
      name: pluginId.slice(0, atIndex),
      marketplace: pluginId.slice(atIndex + 1),
    }
  }

  private findPluginInCache(pluginName: string, marketplace: string): string | null {
    // Plugins are stored in cache with marketplace-prefixed names or direct names
    // Structure: cache/[marketplace]/[plugin-name]/[version]/.claude-plugin/plugin.json
    const possibleBasePaths = [
      join(this.pluginsCachePath, marketplace, pluginName),
      join(this.pluginsCachePath, `${pluginName}@${marketplace}`),
      join(this.pluginsCachePath, pluginName),
    ]

    for (const basePath of possibleBasePaths) {
      if (!existsSync(basePath) || !statSync(basePath).isDirectory()) {
        continue
      }

      // Check if manifest exists directly (old structure)
      const directManifest = join(basePath, PLUGIN_MANIFEST_DIR, PLUGIN_MANIFEST_FILE)
      if (existsSync(directManifest)) {
        return basePath
      }

      // Check for version subdirectories (new structure)
      try {
        const entries = readdirSync(basePath, { withFileTypes: true })
        for (const entry of entries) {
          if (entry.isDirectory() && !entry.name.startsWith('.')) {
            const versionPath = join(basePath, entry.name)
            const versionManifest = join(versionPath, PLUGIN_MANIFEST_DIR, PLUGIN_MANIFEST_FILE)
            if (existsSync(versionManifest)) {
              return versionPath
            }
          }
        }
      }
      catch {
        // Ignore read errors
      }
    }

    return null
  }

  private readPluginManifest(pluginPath: string): PluginManifest | null {
    const manifestPath = join(pluginPath, PLUGIN_MANIFEST_DIR, PLUGIN_MANIFEST_FILE)
    try {
      if (!existsSync(manifestPath)) {
        return null
      }
      const content = readFileSync(manifestPath, 'utf-8')
      return JSON.parse(content)
    }
    catch (error) {
      log('Failed to read plugin manifest', { manifestPath, error })
      return null
    }
  }

  // ============ Public API: Plugins ============

  private normalizePluginList(list: PluginList | undefined, filterEnabled?: boolean): string[] {
    if (!list) return []
    if (Array.isArray(list)) return list
    return Object.entries(list)
      .filter(([_, enabled]) => filterEnabled === undefined || enabled === filterEnabled)
      .map(([id]) => id)
  }

  getInstalledPlugins(): InstalledPlugin[] {
    const plugins: InstalledPlugin[] = []
    const seenIds = new Set<string>()

    const addPlugins = (
      enabledList: PluginList | undefined,
      disabledList: PluginList | undefined,
      scope: PluginScope,
    ) => {
      // Add enabled plugins
      for (const pluginId of this.normalizePluginList(enabledList, true)) {
        if (seenIds.has(pluginId)) continue
        seenIds.add(pluginId)

        const parsed = this.parsePluginId(pluginId)
        if (!parsed) {
          log('Invalid plugin ID format', { pluginId })
          continue
        }

        const cachePath = this.findPluginInCache(parsed.name, parsed.marketplace)
        const manifest = cachePath ? this.readPluginManifest(cachePath) : undefined

        plugins.push({
          id: pluginId,
          name: parsed.name,
          marketplace: parsed.marketplace,
          scope,
          enabled: true,
          manifest: manifest || undefined,
          cachePath: cachePath || undefined,
        })
      }

      // Add disabled plugins (they're still installed, just disabled)
      for (const pluginId of this.normalizePluginList(disabledList)) {
        if (seenIds.has(pluginId)) continue
        seenIds.add(pluginId)

        const parsed = this.parsePluginId(pluginId)
        if (!parsed) continue

        const cachePath = this.findPluginInCache(parsed.name, parsed.marketplace)
        const manifest = cachePath ? this.readPluginManifest(cachePath) : undefined

        plugins.push({
          id: pluginId,
          name: parsed.name,
          marketplace: parsed.marketplace,
          scope,
          enabled: false,
          manifest: manifest || undefined,
          cachePath: cachePath || undefined,
        })
      }
    }

    // Read from all scopes (order matters for override logic)
    const userSettings = this.getUserSettings()
    const projectSettings = this.getProjectSettings()
    const localSettings = this.getLocalSettings()

    addPlugins(userSettings?.enabledPlugins, userSettings?.disabledPlugins, 'user')
    addPlugins(projectSettings?.enabledPlugins, projectSettings?.disabledPlugins, 'project')
    addPlugins(localSettings?.enabledPlugins, localSettings?.disabledPlugins, 'local')

    return plugins
  }

  // ============ Public API: Marketplaces ============

  getMarketplaces(): Marketplace[] {
    const marketplaces: Marketplace[] = []
    const seenNames = new Set<string>()

    // Official marketplace is always available
    marketplaces.push({
      name: 'claude-plugins-official',
      source: 'anthropic/claude-plugins',
      autoUpdate: true,
    })
    seenNames.add('claude-plugins-official')

    const addMarketplaces = (settings: ClaudeSettings | null) => {
      for (const mp of settings?.extraKnownMarketplaces || []) {
        if (seenNames.has(mp.name)) continue
        seenNames.add(mp.name)

        marketplaces.push({
          name: mp.name,
          source: mp.source,
          autoUpdate: mp.autoUpdate,
        })
      }
    }

    addMarketplaces(this.getUserSettings())
    addMarketplaces(this.getProjectSettings())
    addMarketplaces(this.getLocalSettings())

    return marketplaces
  }

  // ============ Public API: Plugin Resources ============

  private parseFrontmatter(content: string): { frontmatter: Record<string, string>, body: string } {
    const frontmatter: Record<string, string> = {}
    let body = content

    if (content.startsWith('---')) {
      const endIndex = content.indexOf('---', 3)
      if (endIndex !== -1) {
        const yamlContent = content.slice(3, endIndex).trim()
        body = content.slice(endIndex + 3).trim()

        for (const line of yamlContent.split('\n')) {
          const colonIndex = line.indexOf(':')
          if (colonIndex !== -1) {
            const key = line.slice(0, colonIndex).trim()
            const value = line.slice(colonIndex + 1).trim()
            frontmatter[key] = value
          }
        }
      }
    }

    return { frontmatter, body }
  }

  getPluginSkills(pluginPath: string, pluginName: string): PluginSkill[] {
    const skills: PluginSkill[] = []
    const skillsDir = join(pluginPath, SKILLS_SUBDIR)

    if (!existsSync(skillsDir)) {
      return skills
    }

    try {
      const entries = readdirSync(skillsDir, { withFileTypes: true })
      for (const entry of entries) {
        if (!entry.isDirectory()) continue

        const skillFile = join(skillsDir, entry.name, SKILL_FILE)
        if (!existsSync(skillFile)) continue

        try {
          const content = readFileSync(skillFile, 'utf-8')
          const { frontmatter, body } = this.parseFrontmatter(content)

          skills.push({
            name: frontmatter.name || entry.name,
            description: frontmatter.description || '',
            content: body,
            pluginName,
            fullName: `${pluginName}:${frontmatter.name || entry.name}`,
          })
        }
        catch (error) {
          log('Failed to read plugin skill', { skillFile, error })
        }
      }
    }
    catch (error) {
      log('Failed to read plugin skills directory', { skillsDir, error })
    }

    return skills
  }

  getPluginCommands(pluginPath: string, pluginName: string): PluginCommand[] {
    const commands: PluginCommand[] = []
    const commandsDir = join(pluginPath, COMMANDS_SUBDIR)

    if (!existsSync(commandsDir)) {
      return commands
    }

    try {
      const entries = readdirSync(commandsDir, { withFileTypes: true })
      for (const entry of entries) {
        if (!entry.isFile() || !entry.name.endsWith('.md')) continue

        const commandFile = join(commandsDir, entry.name)
        const commandName = entry.name.replace(/\.md$/, '')

        try {
          const content = readFileSync(commandFile, 'utf-8')
          const { frontmatter, body } = this.parseFrontmatter(content)

          commands.push({
            name: commandName,
            description: frontmatter.description,
            content: body,
            pluginName,
            fullName: `${pluginName}:${commandName}`,
          })
        }
        catch (error) {
          log('Failed to read plugin command', { commandFile, error })
        }
      }
    }
    catch (error) {
      log('Failed to read plugin commands directory', { commandsDir, error })
    }

    return commands
  }

  getPluginAgents(pluginPath: string, pluginName: string): PluginAgent[] {
    const agents: PluginAgent[] = []
    const agentsDir = join(pluginPath, AGENTS_SUBDIR)

    if (!existsSync(agentsDir)) {
      return agents
    }

    try {
      const entries = readdirSync(agentsDir, { withFileTypes: true })
      for (const entry of entries) {
        if (!entry.isFile() || !entry.name.endsWith('.md')) continue

        const agentFile = join(agentsDir, entry.name)
        const agentName = entry.name.replace(/\.md$/, '')

        try {
          const content = readFileSync(agentFile, 'utf-8')
          const { frontmatter, body } = this.parseFrontmatter(content)

          agents.push({
            name: frontmatter.name || agentName,
            description: frontmatter.description || '',
            prompt: body,
            pluginName,
          })
        }
        catch (error) {
          log('Failed to read plugin agent', { agentFile, error })
        }
      }
    }
    catch (error) {
      log('Failed to read plugin agents directory', { agentsDir, error })
    }

    return agents
  }

  // ============ Aggregate Methods ============

  getAllPluginSkills(): PluginSkill[] {
    const skills: PluginSkill[] = []
    const plugins = this.getInstalledPlugins()

    for (const plugin of plugins) {
      if (!plugin.enabled || !plugin.cachePath) continue
      skills.push(...this.getPluginSkills(plugin.cachePath, plugin.name))
    }

    return skills
  }

  getAllPluginCommands(): PluginCommand[] {
    const commands: PluginCommand[] = []
    const plugins = this.getInstalledPlugins()

    for (const plugin of plugins) {
      if (!plugin.enabled || !plugin.cachePath) continue
      commands.push(...this.getPluginCommands(plugin.cachePath, plugin.name))
    }

    return commands
  }

  getAllPluginAgents(): PluginAgent[] {
    const agents: PluginAgent[] = []
    const plugins = this.getInstalledPlugins()

    for (const plugin of plugins) {
      if (!plugin.enabled || !plugin.cachePath) continue
      agents.push(...this.getPluginAgents(plugin.cachePath, plugin.name))
    }

    return agents
  }
}
