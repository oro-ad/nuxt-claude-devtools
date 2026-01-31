import { existsSync, mkdirSync, readdirSync, readFileSync, rmSync, statSync, unlinkSync, writeFileSync } from 'node:fs'
import { basename, join } from 'node:path'
import { CLAUDE_DIR, MD_EXTENSION, SKILL_FILE } from './constants'

type Logger = (message: string, data?: unknown) => void

/**
 * Base interface for all markdown-based resources
 */
export interface BaseResource {
  name: string
  rawContent: string
  updatedAt: string
}

/**
 * Configuration for resource storage
 */
export interface ResourceStorageConfig {
  /** Use subdirectories for each resource (like skills: .claude/skills/<name>/SKILL.md) */
  useSubdirectories?: boolean
  /** Filename when using subdirectories (default: SKILL.md) */
  subdirectoryFilename?: string
  /** File extension (default: .md) */
  extension?: string
}

/**
 * Base class for managing markdown resources with YAML frontmatter
 * Handles common file operations, frontmatter parsing, and CRUD operations
 */
export abstract class MarkdownResourceManager<
  TResource extends BaseResource,
  TFrontmatter,
> {
  protected readonly resourceDir: string
  protected readonly log: Logger
  protected readonly config: Required<ResourceStorageConfig>

  constructor(
    projectPath: string,
    subPath: string,
    log: Logger,
    config: ResourceStorageConfig = {},
  ) {
    this.resourceDir = join(projectPath, CLAUDE_DIR, subPath)
    this.log = log
    this.config = {
      useSubdirectories: config.useSubdirectories ?? false,
      subdirectoryFilename: config.subdirectoryFilename ?? SKILL_FILE,
      extension: config.extension ?? MD_EXTENSION,
    }

    // Ensure directory exists
    if (!existsSync(this.resourceDir)) {
      mkdirSync(this.resourceDir, { recursive: true })
      this.log(`Created ${subPath} directory`, { path: this.resourceDir })
    }
  }

  /**
   * Parse YAML frontmatter from markdown content
   */
  protected parseFrontmatter(content: string): { frontmatter: TFrontmatter, body: string } {
    const frontmatterRegex = /^---\n([\s\S]*?)\n---\n([\s\S]*)$/
    const match = content.match(frontmatterRegex)

    if (!match) {
      return { frontmatter: {} as TFrontmatter, body: content.trim() }
    }

    const [, yaml = '', body = ''] = match
    const frontmatter = this.parseYaml(yaml)

    return { frontmatter, body: body.trim() }
  }

  /**
   * Parse simple YAML - override for complex parsing (arrays, nested objects)
   */
  protected parseYaml(yaml: string): TFrontmatter {
    const result: Record<string, unknown> = {}

    for (const line of yaml.split('\n')) {
      const colonIndex = line.indexOf(':')
      if (colonIndex === -1) continue

      const key = line.slice(0, colonIndex).trim()
      const value = line.slice(colonIndex + 1).trim()

      if (value === 'true') {
        result[key] = true
      }
      else if (value === 'false') {
        result[key] = false
      }
      else if (value) {
        result[key] = value
      }
    }

    return result as TFrontmatter
  }

  /**
   * Build YAML frontmatter string from resource data
   */
  protected abstract buildFrontmatter(resource: Partial<TResource>): string

  /**
   * Convert frontmatter + body to resource object
   */
  protected abstract toResource(
    name: string,
    frontmatter: TFrontmatter,
    body: string,
    rawContent: string,
    updatedAt: string,
  ): TResource

  /**
   * Get all resources
   */
  getAll(): TResource[] {
    const resources: TResource[] = []

    if (!existsSync(this.resourceDir)) return resources

    const entries = readdirSync(this.resourceDir)

    for (const entry of entries) {
      const resource = this.config.useSubdirectories
        ? this.readFromSubdirectory(entry)
        : this.readFromFile(entry)

      if (resource) {
        resources.push(resource)
      }
    }

    return resources.sort((a, b) => a.name.localeCompare(b.name))
  }

  /**
   * Get single resource by name
   */
  getOne(name: string): TResource | null {
    if (this.config.useSubdirectories) {
      return this.readFromSubdirectory(name)
    }

    const fileName = name.endsWith(this.config.extension) ? name : `${name}${this.config.extension}`
    return this.readFromFile(fileName)
  }

  /**
   * Save (create or update) a resource
   */
  protected saveResource(name: string, frontmatter: string, body: string): { rawContent: string, updatedAt: string } {
    const safeName = this.sanitizeName(name)
    const rawContent = `${frontmatter}\n\n${body}`

    if (this.config.useSubdirectories) {
      const subDir = join(this.resourceDir, safeName)
      if (!existsSync(subDir)) {
        mkdirSync(subDir, { recursive: true })
      }
      const filePath = join(subDir, this.config.subdirectoryFilename)
      writeFileSync(filePath, rawContent, 'utf-8')
      this.log(`Saved resource`, { name: safeName, path: filePath })
    }
    else {
      const fileName = `${safeName}${this.config.extension}`
      const filePath = join(this.resourceDir, fileName)
      writeFileSync(filePath, rawContent, 'utf-8')
      this.log(`Saved resource`, { name: safeName, path: filePath })
    }

    return {
      rawContent,
      updatedAt: new Date().toISOString(),
    }
  }

  /**
   * Delete a resource
   */
  delete(name: string): boolean {
    if (this.config.useSubdirectories) {
      const subDir = join(this.resourceDir, name)
      if (!existsSync(subDir)) return false

      rmSync(subDir, { recursive: true })
      this.log(`Deleted resource`, { name })
      return true
    }

    const fileName = name.endsWith(this.config.extension) ? name : `${name}${this.config.extension}`
    const filePath = join(this.resourceDir, fileName)

    if (!existsSync(filePath)) return false

    unlinkSync(filePath)
    this.log(`Deleted resource`, { name })
    return true
  }

  /**
   * Sanitize name for filesystem (kebab-case)
   */
  protected sanitizeName(name: string): string {
    return name.replace(/[^\w-]/g, '-').toLowerCase()
  }

  /**
   * Helper to build frontmatter lines
   */
  protected buildFrontmatterLines(fields: Array<{ key: string, value: unknown }>): string {
    const lines: string[] = ['---']

    for (const { key, value } of fields) {
      if (value === undefined || value === null) continue

      if (Array.isArray(value)) {
        if (value.length > 0) {
          lines.push(`${key}: ${value.join(', ')}`)
        }
      }
      else if (typeof value === 'boolean') {
        lines.push(`${key}: ${value}`)
      }
      else if (value) {
        lines.push(`${key}: ${value}`)
      }
    }

    lines.push('---')
    return lines.join('\n')
  }

  /**
   * Helper to build frontmatter with multiline arrays
   */
  protected buildFrontmatterWithArrays(
    fields: Array<{ key: string, value: unknown, multiline?: boolean }>,
  ): string {
    const lines: string[] = ['---']

    for (const { key, value, multiline } of fields) {
      if (value === undefined || value === null) continue

      if (Array.isArray(value) && value.length > 0) {
        if (multiline) {
          lines.push(`${key}:`)
          for (const item of value) {
            lines.push(`  - ${item}`)
          }
        }
        else {
          lines.push(`${key}: ${value.join(', ')}`)
        }
      }
      else if (typeof value === 'boolean') {
        lines.push(`${key}: ${value}`)
      }
      else if (value) {
        lines.push(`${key}: ${value}`)
      }
    }

    lines.push('---')
    return lines.join('\n')
  }

  // Private helpers

  private readFromFile(fileName: string): TResource | null {
    if (!fileName.endsWith(this.config.extension)) return null

    const filePath = join(this.resourceDir, fileName)
    const stat = statSync(filePath)

    if (stat.isDirectory()) return null

    const rawContent = readFileSync(filePath, 'utf-8')
    const { frontmatter, body } = this.parseFrontmatter(rawContent)
    const name = basename(fileName, this.config.extension)

    return this.toResource(name, frontmatter, body, rawContent, stat.mtime.toISOString())
  }

  private readFromSubdirectory(dirName: string): TResource | null {
    const subDir = join(this.resourceDir, dirName)

    try {
      const stat = statSync(subDir)
      if (!stat.isDirectory()) return null
    }
    catch {
      return null
    }

    const filePath = join(subDir, this.config.subdirectoryFilename)
    if (!existsSync(filePath)) return null

    const fileStat = statSync(filePath)
    const rawContent = readFileSync(filePath, 'utf-8')
    const { frontmatter, body } = this.parseFrontmatter(rawContent)

    return this.toResource(dirName, frontmatter, body, rawContent, fileStat.mtime.toISOString())
  }
}
