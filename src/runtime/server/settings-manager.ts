import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { createLogger } from '../logger'
import { DEVTOOLS_DATA_DIR, SETTINGS_FILE } from './constants'

const log = createLogger('settings', { timestamp: true })

export interface DevToolsSettings {
  // Critical files behavior
  criticalFiles: {
    // If true, Claude will auto-confirm critical file changes without asking user
    autoConfirm: boolean
  }
  // Future settings can be added here
}

const DEFAULT_SETTINGS: DevToolsSettings = {
  criticalFiles: {
    autoConfirm: false, // By default, require user confirmation
  },
}

export class SettingsManager {
  private settingsPath: string
  private settings: DevToolsSettings

  constructor(rootDir: string) {
    this.settingsPath = join(rootDir, DEVTOOLS_DATA_DIR, SETTINGS_FILE)
    this.settings = this.loadSettings()
  }

  private loadSettings(): DevToolsSettings {
    try {
      if (existsSync(this.settingsPath)) {
        const data = readFileSync(this.settingsPath, 'utf-8')
        const parsed = JSON.parse(data) as Partial<DevToolsSettings>
        // Merge with defaults to ensure all fields exist
        return this.mergeWithDefaults(parsed)
      }
    }
    catch (error) {
      log('Failed to load settings, using defaults', { error })
    }
    return { ...DEFAULT_SETTINGS }
  }

  private mergeWithDefaults(partial: Partial<DevToolsSettings>): DevToolsSettings {
    return {
      criticalFiles: {
        ...DEFAULT_SETTINGS.criticalFiles,
        ...partial.criticalFiles,
      },
    }
  }

  private saveSettings(): void {
    try {
      const dir = dirname(this.settingsPath)
      if (!existsSync(dir)) {
        mkdirSync(dir, { recursive: true })
      }
      writeFileSync(this.settingsPath, JSON.stringify(this.settings, null, 2))
      log('Settings saved')
    }
    catch (error) {
      log('Failed to save settings', { error })
    }
  }

  getSettings(): DevToolsSettings {
    return { ...this.settings }
  }

  updateSettings(updates: Partial<DevToolsSettings>): DevToolsSettings {
    this.settings = this.mergeWithDefaults({
      ...this.settings,
      ...updates,
    })
    this.saveSettings()
    return this.getSettings()
  }

  // Convenience methods
  isAutoConfirmEnabled(): boolean {
    return this.settings.criticalFiles.autoConfirm
  }

  setAutoConfirm(value: boolean): void {
    this.settings.criticalFiles.autoConfirm = value
    this.saveSettings()
  }
}
