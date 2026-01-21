import { existsSync, mkdirSync, readdirSync, readFileSync, statSync, unlinkSync, writeFileSync } from 'node:fs'
import { basename, join } from 'node:path'
import { createLogger } from '../logger'

const log = createLogger('agents', { timestamp: true })

export interface Agent {
  name: string
  description: string
  prompt: string // markdown body (system prompt)
  rawContent: string // full file content with frontmatter
  // Frontmatter fields
  tools?: string[]
  disallowedTools?: string[]
  model?: string // sonnet, opus, haiku, inherit
  permissionMode?: 'default' | 'acceptEdits' | 'dontAsk' | 'bypassPermissions' | 'plan'
  skills?: string[] // skill names to preload
  updatedAt: string
}

interface AgentFrontmatter {
  'name'?: string
  'description'?: string
  'tools'?: string
  'disallowedTools'?: string
  'model'?: string
  'permissionMode'?: string
  'skills'?: string[]
}

export class AgentsManager {
  private agentsDir: string

  constructor(projectPath: string) {
    // Agents are stored in .claude/agents/<name>.md
    this.agentsDir = join(projectPath, '.claude', 'agents')

    // Ensure agents directory exists
    if (!existsSync(this.agentsDir)) {
      mkdirSync(this.agentsDir, { recursive: true })
      log('Created agents directory', { path: this.agentsDir })
    }
  }

  // Parse YAML frontmatter from markdown content
  private parseFrontmatter(content: string): { frontmatter: AgentFrontmatter, body: string } {
    const frontmatterRegex = /^---\n([\s\S]*?)\n---\n([\s\S]*)$/
    const match = content.match(frontmatterRegex)

    if (!match) {
      return { frontmatter: {}, body: content.trim() }
    }

    const [, yaml, body] = match
    const frontmatter: AgentFrontmatter = {}

    // Track if we're inside a skills array
    let inSkillsArray = false
    const skillsList: string[] = []

    // Simple YAML parsing
    for (const line of yaml.split('\n')) {
      // Check for skills array items
      if (inSkillsArray) {
        const trimmed = line.trim()
        if (trimmed.startsWith('- ')) {
          skillsList.push(trimmed.slice(2).trim())
          continue
        }
        else if (trimmed && !trimmed.startsWith('-')) {
          // End of array
          inSkillsArray = false
        }
        else {
          continue
        }
      }

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
        case 'tools':
          frontmatter.tools = value
          break
        case 'disallowedTools':
          frontmatter.disallowedTools = value
          break
        case 'model':
          frontmatter.model = value
          break
        case 'permissionMode':
          frontmatter.permissionMode = value
          break
        case 'skills':
          // Could be inline array or multiline
          if (value) {
            // Inline: skills: skill1, skill2
            frontmatter.skills = value.split(',').map(s => s.trim()).filter(s => s)
          }
          else {
            // Multiline array
            inSkillsArray = true
          }
          break
      }
    }

    // If we collected skills from multiline format
    if (skillsList.length > 0) {
      frontmatter.skills = skillsList
    }

    return { frontmatter, body: body.trim() }
  }

  // Build frontmatter string
  private buildFrontmatter(agent: Partial<Agent>): string {
    const lines: string[] = ['---']

    if (agent.name) {
      lines.push(`name: ${agent.name}`)
    }
    if (agent.description) {
      lines.push(`description: ${agent.description}`)
    }
    if (agent.tools && agent.tools.length > 0) {
      lines.push(`tools: ${agent.tools.join(', ')}`)
    }
    if (agent.disallowedTools && agent.disallowedTools.length > 0) {
      lines.push(`disallowedTools: ${agent.disallowedTools.join(', ')}`)
    }
    if (agent.model) {
      lines.push(`model: ${agent.model}`)
    }
    if (agent.permissionMode) {
      lines.push(`permissionMode: ${agent.permissionMode}`)
    }
    if (agent.skills && agent.skills.length > 0) {
      lines.push('skills:')
      for (const skill of agent.skills) {
        lines.push(`  - ${skill}`)
      }
    }

    lines.push('---')
    return lines.join('\n')
  }

  // Get all agents
  getAgents(): Agent[] {
    const agents: Agent[] = []

    if (!existsSync(this.agentsDir)) return agents

    const entries = readdirSync(this.agentsDir)
    for (const entry of entries) {
      if (!entry.endsWith('.md')) continue

      const fullPath = join(this.agentsDir, entry)
      const stat = statSync(fullPath)

      if (stat.isDirectory()) continue

      const rawContent = readFileSync(fullPath, 'utf-8')
      const { frontmatter, body } = this.parseFrontmatter(rawContent)

      agents.push({
        name: frontmatter.name || basename(entry, '.md'),
        description: frontmatter.description || '',
        prompt: body,
        rawContent,
        tools: frontmatter.tools
          ? frontmatter.tools.split(',').map(s => s.trim())
          : undefined,
        disallowedTools: frontmatter.disallowedTools
          ? frontmatter.disallowedTools.split(',').map(s => s.trim())
          : undefined,
        model: frontmatter.model,
        permissionMode: frontmatter.permissionMode as Agent['permissionMode'],
        skills: frontmatter.skills,
        updatedAt: stat.mtime.toISOString(),
      })
    }

    return agents.sort((a, b) => a.name.localeCompare(b.name))
  }

  // Get single agent
  getAgent(name: string): Agent | null {
    const fileName = name.endsWith('.md') ? name : `${name}.md`
    const fullPath = join(this.agentsDir, fileName)

    if (!existsSync(fullPath)) return null

    const stat = statSync(fullPath)
    const rawContent = readFileSync(fullPath, 'utf-8')
    const { frontmatter, body } = this.parseFrontmatter(rawContent)

    return {
      name: frontmatter.name || basename(fileName, '.md'),
      description: frontmatter.description || '',
      prompt: body,
      rawContent,
      tools: frontmatter.tools
        ? frontmatter.tools.split(',').map(s => s.trim())
        : undefined,
      disallowedTools: frontmatter.disallowedTools
        ? frontmatter.disallowedTools.split(',').map(s => s.trim())
        : undefined,
      model: frontmatter.model,
      permissionMode: frontmatter.permissionMode as Agent['permissionMode'],
      skills: frontmatter.skills,
      updatedAt: stat.mtime.toISOString(),
    }
  }

  // Create or update agent
  saveAgent(agent: {
    name: string
    description: string
    prompt: string
    tools?: string[]
    disallowedTools?: string[]
    model?: string
    permissionMode?: Agent['permissionMode']
    skills?: string[]
  }): Agent {
    // Sanitize name (kebab-case)
    const safeName = agent.name.replace(/[^\w-]/g, '-').toLowerCase()
    const fileName = `${safeName}.md`
    const fullPath = join(this.agentsDir, fileName)

    // Build file content
    const frontmatter = this.buildFrontmatter({
      name: safeName,
      description: agent.description,
      tools: agent.tools,
      disallowedTools: agent.disallowedTools,
      model: agent.model,
      permissionMode: agent.permissionMode,
      skills: agent.skills,
    })

    const rawContent = `${frontmatter}\n\n${agent.prompt}`
    writeFileSync(fullPath, rawContent, 'utf-8')
    log('Saved agent', { name: safeName, path: fullPath })

    return {
      name: safeName,
      description: agent.description,
      prompt: agent.prompt,
      rawContent,
      tools: agent.tools,
      disallowedTools: agent.disallowedTools,
      model: agent.model,
      permissionMode: agent.permissionMode,
      skills: agent.skills,
      updatedAt: new Date().toISOString(),
    }
  }

  // Delete agent
  deleteAgent(name: string): boolean {
    const fileName = name.endsWith('.md') ? name : `${name}.md`
    const fullPath = join(this.agentsDir, fileName)

    if (!existsSync(fullPath)) return false

    unlinkSync(fullPath)
    log('Deleted agent', { name })
    return true
  }
}
