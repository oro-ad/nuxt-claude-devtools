import { existsSync, mkdirSync, readdirSync, readFileSync, statSync, unlinkSync, writeFileSync } from 'node:fs'
import { basename, join } from 'node:path'
import { createLogger } from '../logger'

const log = createLogger('commands', { timestamp: true })

export interface SlashCommand {
  name: string // filename without .md
  path: string // relative path
  description?: string
  allowedTools?: string[]
  disableModelInvocation?: boolean
  content: string // markdown content (without frontmatter)
  rawContent: string // full file content
  updatedAt: string
}

interface CommandFrontmatter {
  'description'?: string
  'allowed-tools'?: string
  'disable-model-invocation'?: boolean
}

export class CommandsManager {
  private commandsDir: string

  constructor(projectPath: string) {
    this.commandsDir = join(projectPath, '.claude', 'commands')

    // Ensure commands directory exists
    if (!existsSync(this.commandsDir)) {
      mkdirSync(this.commandsDir, { recursive: true })
      log('Created commands directory', { path: this.commandsDir })
    }
  }

  // Parse frontmatter from markdown content
  private parseFrontmatter(content: string): { frontmatter: CommandFrontmatter, body: string } {
    // Match frontmatter block: starts with ---, ends with ---, captures content between
    const frontmatterRegex = /^---\n((?:[^\n]*\n)*?)---\n([\s\S]*)$/
    const match = content.match(frontmatterRegex)

    if (!match) {
      return { frontmatter: {}, body: content }
    }

    const [, yaml, body] = match
    const frontmatter: CommandFrontmatter = {}

    // Simple YAML parsing for our known fields
    for (const line of yaml.split('\n')) {
      const colonIndex = line.indexOf(':')
      if (colonIndex === -1) continue

      const key = line.slice(0, colonIndex).trim()
      const value = line.slice(colonIndex + 1).trim()

      if (key === 'description') {
        frontmatter.description = value
      }
      else if (key === 'allowed-tools') {
        frontmatter['allowed-tools'] = value
      }
      else if (key === 'disable-model-invocation') {
        frontmatter['disable-model-invocation'] = value === 'true'
      }
    }

    return { frontmatter, body: body.trim() }
  }

  // Build frontmatter string
  private buildFrontmatter(command: Partial<SlashCommand>): string {
    const lines: string[] = ['---']

    if (command.description) {
      lines.push(`description: ${command.description}`)
    }
    if (command.allowedTools && command.allowedTools.length > 0) {
      lines.push(`allowed-tools: ${command.allowedTools.join(', ')}`)
    }
    if (command.disableModelInvocation !== undefined) {
      lines.push(`disable-model-invocation: ${command.disableModelInvocation}`)
    }

    lines.push('---')
    return lines.join('\n')
  }

  // Get all slash commands
  getCommands(): SlashCommand[] {
    const commands: SlashCommand[] = []

    if (!existsSync(this.commandsDir)) return commands

    const entries = readdirSync(this.commandsDir)
    for (const entry of entries) {
      if (!entry.endsWith('.md')) continue

      const fullPath = join(this.commandsDir, entry)
      const stat = statSync(fullPath)

      if (stat.isDirectory()) continue

      const rawContent = readFileSync(fullPath, 'utf-8')
      const { frontmatter, body } = this.parseFrontmatter(rawContent)

      commands.push({
        name: basename(entry, '.md'),
        path: entry,
        description: frontmatter.description,
        allowedTools: frontmatter['allowed-tools']
          ? frontmatter['allowed-tools'].split(',').map(s => s.trim())
          : undefined,
        disableModelInvocation: frontmatter['disable-model-invocation'],
        content: body,
        rawContent,
        updatedAt: stat.mtime.toISOString(),
      })
    }

    return commands.sort((a, b) => a.name.localeCompare(b.name))
  }

  // Get single command
  getCommand(name: string): SlashCommand | null {
    const fileName = name.endsWith('.md') ? name : `${name}.md`
    const fullPath = join(this.commandsDir, fileName)

    if (!existsSync(fullPath)) return null

    const stat = statSync(fullPath)
    const rawContent = readFileSync(fullPath, 'utf-8')
    const { frontmatter, body } = this.parseFrontmatter(rawContent)

    return {
      name: basename(fileName, '.md'),
      path: fileName,
      description: frontmatter.description,
      allowedTools: frontmatter['allowed-tools']
        ? frontmatter['allowed-tools'].split(',').map(s => s.trim())
        : undefined,
      disableModelInvocation: frontmatter['disable-model-invocation'],
      content: body,
      rawContent,
      updatedAt: stat.mtime.toISOString(),
    }
  }

  // Create or update command
  saveCommand(
    name: string,
    content: string,
    options?: {
      description?: string
      allowedTools?: string[]
      disableModelInvocation?: boolean
    },
  ): SlashCommand {
    // Ensure name is valid (no slashes, spaces etc)
    const safeName = name.replace(/[^\w-]/g, '-').toLowerCase()
    const fileName = `${safeName}.md`
    const fullPath = join(this.commandsDir, fileName)

    // Build file content
    const frontmatter = this.buildFrontmatter({
      description: options?.description,
      allowedTools: options?.allowedTools,
      disableModelInvocation: options?.disableModelInvocation,
    })

    const rawContent = `${frontmatter}\n\n${content}`

    writeFileSync(fullPath, rawContent, 'utf-8')
    log('Saved command', { name: safeName })

    return {
      name: safeName,
      path: fileName,
      description: options?.description,
      allowedTools: options?.allowedTools,
      disableModelInvocation: options?.disableModelInvocation,
      content,
      rawContent,
      updatedAt: new Date().toISOString(),
    }
  }

  // Delete command
  deleteCommand(name: string): boolean {
    const fileName = name.endsWith('.md') ? name : `${name}.md`
    const fullPath = join(this.commandsDir, fileName)

    if (!existsSync(fullPath)) return false

    unlinkSync(fullPath)
    log('Deleted command', { name })
    return true
  }
}
