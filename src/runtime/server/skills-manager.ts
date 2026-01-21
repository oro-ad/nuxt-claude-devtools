import { existsSync, mkdirSync, readdirSync, readFileSync, rmSync, statSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'
import { createLogger } from '../logger'

const log = createLogger('skills', { timestamp: true })

export interface Skill {
  name: string
  description: string
  content: string // markdown body (instructions)
  rawContent: string // full file content with frontmatter
  // Optional frontmatter fields
  argumentHint?: string
  disableModelInvocation?: boolean
  userInvocable?: boolean
  allowedTools?: string[]
  model?: string
  context?: 'fork'
  agent?: string
  updatedAt: string
}

interface SkillFrontmatter {
  'name'?: string
  'description'?: string
  'argument-hint'?: string
  'disable-model-invocation'?: boolean
  'user-invocable'?: boolean
  'allowed-tools'?: string
  'model'?: string
  'context'?: string
  'agent'?: string
}

export class SkillsManager {
  private skillsDir: string

  constructor(projectPath: string) {
    // Skills are stored in .claude/skills/<name>/SKILL.md
    this.skillsDir = join(projectPath, '.claude', 'skills')

    // Ensure skills directory exists
    if (!existsSync(this.skillsDir)) {
      mkdirSync(this.skillsDir, { recursive: true })
      log('Created skills directory', { path: this.skillsDir })
    }
  }

  // Parse YAML frontmatter from markdown content
  private parseFrontmatter(content: string): { frontmatter: SkillFrontmatter, body: string } {
    const frontmatterRegex = /^---\n([\s\S]*?)\n---\n([\s\S]*)$/
    const match = content.match(frontmatterRegex)

    if (!match) {
      return { frontmatter: {}, body: content.trim() }
    }

    const [, yaml, body] = match
    const frontmatter: SkillFrontmatter = {}

    // Simple YAML parsing
    for (const line of yaml.split('\n')) {
      const colonIndex = line.indexOf(':')
      if (colonIndex === -1) continue

      const key = line.slice(0, colonIndex).trim()
      const value = line.slice(colonIndex + 1).trim()

      switch (key) {
        case 'name':
          frontmatter.name = value
          break
        case 'description':
          frontmatter.description = value
          break
        case 'argument-hint':
          frontmatter['argument-hint'] = value
          break
        case 'disable-model-invocation':
          frontmatter['disable-model-invocation'] = value === 'true'
          break
        case 'user-invocable':
          frontmatter['user-invocable'] = value === 'true'
          break
        case 'allowed-tools':
          frontmatter['allowed-tools'] = value
          break
        case 'model':
          frontmatter.model = value
          break
        case 'context':
          frontmatter.context = value
          break
        case 'agent':
          frontmatter.agent = value
          break
      }
    }

    return { frontmatter, body: body.trim() }
  }

  // Build frontmatter string
  private buildFrontmatter(skill: Partial<Skill>): string {
    const lines: string[] = ['---']

    if (skill.name) {
      lines.push(`name: ${skill.name}`)
    }
    if (skill.description) {
      lines.push(`description: ${skill.description}`)
    }
    if (skill.argumentHint) {
      lines.push(`argument-hint: ${skill.argumentHint}`)
    }
    if (skill.disableModelInvocation !== undefined) {
      lines.push(`disable-model-invocation: ${skill.disableModelInvocation}`)
    }
    if (skill.userInvocable !== undefined) {
      lines.push(`user-invocable: ${skill.userInvocable}`)
    }
    if (skill.allowedTools && skill.allowedTools.length > 0) {
      lines.push(`allowed-tools: ${skill.allowedTools.join(', ')}`)
    }
    if (skill.model) {
      lines.push(`model: ${skill.model}`)
    }
    if (skill.context) {
      lines.push(`context: ${skill.context}`)
    }
    if (skill.agent) {
      lines.push(`agent: ${skill.agent}`)
    }

    lines.push('---')
    return lines.join('\n')
  }

  // Get all skills
  getSkills(): Skill[] {
    const skills: Skill[] = []

    if (!existsSync(this.skillsDir)) return skills

    const entries = readdirSync(this.skillsDir)
    for (const entry of entries) {
      const skillDir = join(this.skillsDir, entry)
      const stat = statSync(skillDir)

      if (!stat.isDirectory()) continue

      const skillFile = join(skillDir, 'SKILL.md')
      if (!existsSync(skillFile)) continue

      const fileStat = statSync(skillFile)
      const rawContent = readFileSync(skillFile, 'utf-8')
      const { frontmatter, body } = this.parseFrontmatter(rawContent)

      skills.push({
        name: frontmatter.name || entry,
        description: frontmatter.description || '',
        content: body,
        rawContent,
        argumentHint: frontmatter['argument-hint'],
        disableModelInvocation: frontmatter['disable-model-invocation'],
        userInvocable: frontmatter['user-invocable'],
        allowedTools: frontmatter['allowed-tools']
          ? frontmatter['allowed-tools'].split(',').map(s => s.trim())
          : undefined,
        model: frontmatter.model,
        context: frontmatter.context === 'fork' ? 'fork' : undefined,
        agent: frontmatter.agent,
        updatedAt: fileStat.mtime.toISOString(),
      })
    }

    return skills.sort((a, b) => a.name.localeCompare(b.name))
  }

  // Get single skill
  getSkill(name: string): Skill | null {
    const skillDir = join(this.skillsDir, name)
    const skillFile = join(skillDir, 'SKILL.md')

    if (!existsSync(skillFile)) return null

    const stat = statSync(skillFile)
    const rawContent = readFileSync(skillFile, 'utf-8')
    const { frontmatter, body } = this.parseFrontmatter(rawContent)

    return {
      name: frontmatter.name || name,
      description: frontmatter.description || '',
      content: body,
      rawContent,
      argumentHint: frontmatter['argument-hint'],
      disableModelInvocation: frontmatter['disable-model-invocation'],
      userInvocable: frontmatter['user-invocable'],
      allowedTools: frontmatter['allowed-tools']
        ? frontmatter['allowed-tools'].split(',').map(s => s.trim())
        : undefined,
      model: frontmatter.model,
      context: frontmatter.context === 'fork' ? 'fork' : undefined,
      agent: frontmatter.agent,
      updatedAt: stat.mtime.toISOString(),
    }
  }

  // Get skill names only (for agent skills selector)
  getSkillNames(): string[] {
    if (!existsSync(this.skillsDir)) return []

    const names: string[] = []
    const entries = readdirSync(this.skillsDir)

    for (const entry of entries) {
      const skillDir = join(this.skillsDir, entry)
      const stat = statSync(skillDir)

      if (!stat.isDirectory()) continue

      const skillFile = join(skillDir, 'SKILL.md')
      if (existsSync(skillFile)) {
        names.push(entry)
      }
    }

    return names.sort()
  }

  // Create or update skill
  saveSkill(skill: {
    name: string
    description: string
    content: string
    argumentHint?: string
    disableModelInvocation?: boolean
    userInvocable?: boolean
    allowedTools?: string[]
    model?: string
    context?: 'fork'
    agent?: string
  }): Skill {
    // Sanitize name (kebab-case)
    const safeName = skill.name.replace(/[^\w-]/g, '-').toLowerCase()
    const skillDir = join(this.skillsDir, safeName)
    const skillFile = join(skillDir, 'SKILL.md')

    // Ensure skill directory exists
    if (!existsSync(skillDir)) {
      mkdirSync(skillDir, { recursive: true })
    }

    // Build file content
    const frontmatter = this.buildFrontmatter({
      name: safeName,
      description: skill.description,
      argumentHint: skill.argumentHint,
      disableModelInvocation: skill.disableModelInvocation,
      userInvocable: skill.userInvocable,
      allowedTools: skill.allowedTools,
      model: skill.model,
      context: skill.context,
      agent: skill.agent,
    })

    const rawContent = `${frontmatter}\n\n${skill.content}`
    writeFileSync(skillFile, rawContent, 'utf-8')
    log('Saved skill', { name: safeName, path: skillFile })

    return {
      name: safeName,
      description: skill.description,
      content: skill.content,
      rawContent,
      argumentHint: skill.argumentHint,
      disableModelInvocation: skill.disableModelInvocation,
      userInvocable: skill.userInvocable,
      allowedTools: skill.allowedTools,
      model: skill.model,
      context: skill.context,
      agent: skill.agent,
      updatedAt: new Date().toISOString(),
    }
  }

  // Delete skill
  deleteSkill(name: string): boolean {
    const skillDir = join(this.skillsDir, name)

    if (!existsSync(skillDir)) return false

    rmSync(skillDir, { recursive: true })
    log('Deleted skill', { name })
    return true
  }
}
