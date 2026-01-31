import { createLogger } from '../logger'
import { MarkdownResourceManager } from './base-resource-manager'
import { AGENTS_SUBDIR } from './constants'

const log = createLogger('agents', { timestamp: true })

export interface Agent {
  name: string
  description: string
  prompt: string
  rawContent: string
  tools?: string[]
  disallowedTools?: string[]
  model?: string
  permissionMode?: 'default' | 'acceptEdits' | 'dontAsk' | 'bypassPermissions' | 'plan'
  skills?: string[]
  updatedAt: string
}

interface AgentFrontmatter {
  name?: string
  description?: string
  tools?: string
  disallowedTools?: string
  model?: string
  permissionMode?: string
  skills?: string[]
}

export class AgentsManager extends MarkdownResourceManager<Agent, AgentFrontmatter> {
  constructor(projectPath: string) {
    super(projectPath, AGENTS_SUBDIR, log)
  }

  protected override parseYaml(yaml: string): AgentFrontmatter {
    const result: AgentFrontmatter = {}

    // Track if we're inside a skills array
    let inSkillsArray = false
    const skillsList: string[] = []

    for (const line of yaml.split('\n')) {
      // Check for skills array items
      if (inSkillsArray) {
        const trimmed = line.trim()
        if (trimmed.startsWith('- ')) {
          skillsList.push(trimmed.slice(2).trim())
          continue
        }
        else if (trimmed && !trimmed.startsWith('-')) {
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
          result.name = value
          break
        case 'description':
          result.description = value
          break
        case 'tools':
          result.tools = value
          break
        case 'disallowedTools':
          result.disallowedTools = value
          break
        case 'model':
          result.model = value
          break
        case 'permissionMode':
          result.permissionMode = value
          break
        case 'skills':
          if (value) {
            result.skills = value.split(',').map(s => s.trim()).filter(s => s)
          }
          else {
            inSkillsArray = true
          }
          break
      }
    }

    if (skillsList.length > 0) {
      result.skills = skillsList
    }

    return result
  }

  protected buildFrontmatter(agent: Partial<Agent>): string {
    return this.buildFrontmatterWithArrays([
      { key: 'name', value: agent.name },
      { key: 'description', value: agent.description },
      { key: 'tools', value: agent.tools },
      { key: 'disallowedTools', value: agent.disallowedTools },
      { key: 'model', value: agent.model },
      { key: 'permissionMode', value: agent.permissionMode },
      { key: 'skills', value: agent.skills, multiline: true },
    ])
  }

  protected toResource(
    name: string,
    frontmatter: AgentFrontmatter,
    body: string,
    rawContent: string,
    updatedAt: string,
  ): Agent {
    return {
      name: frontmatter.name || name,
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
      updatedAt,
    }
  }

  // Public API methods

  getAgents(): Agent[] {
    return this.getAll()
  }

  getAgent(name: string): Agent | null {
    return this.getOne(name)
  }

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
    const safeName = this.sanitizeName(agent.name)
    const frontmatter = this.buildFrontmatter({
      name: safeName,
      description: agent.description,
      tools: agent.tools,
      disallowedTools: agent.disallowedTools,
      model: agent.model,
      permissionMode: agent.permissionMode,
      skills: agent.skills,
    })

    const { rawContent, updatedAt } = this.saveResource(safeName, frontmatter, agent.prompt)

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
      updatedAt,
    }
  }

  deleteAgent(name: string): boolean {
    return this.delete(name)
  }
}
