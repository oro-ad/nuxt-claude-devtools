import { createLogger } from '../logger'
import { MarkdownResourceManager } from './base-resource-manager'
import { SKILL_FILE, SKILLS_SUBDIR } from './constants'

const log = createLogger('skills', { timestamp: true })

export interface Skill {
  name: string
  description: string
  content: string
  rawContent: string
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

export class SkillsManager extends MarkdownResourceManager<Skill, SkillFrontmatter> {
  constructor(projectPath: string) {
    super(projectPath, SKILLS_SUBDIR, log, {
      useSubdirectories: true,
      subdirectoryFilename: SKILL_FILE,
    })
  }

  protected buildFrontmatter(skill: Partial<Skill>): string {
    return this.buildFrontmatterLines([
      { key: 'name', value: skill.name },
      { key: 'description', value: skill.description },
      { key: 'argument-hint', value: skill.argumentHint },
      { key: 'disable-model-invocation', value: skill.disableModelInvocation },
      { key: 'user-invocable', value: skill.userInvocable },
      { key: 'allowed-tools', value: skill.allowedTools },
      { key: 'model', value: skill.model },
      { key: 'context', value: skill.context },
      { key: 'agent', value: skill.agent },
    ])
  }

  protected toResource(
    name: string,
    frontmatter: SkillFrontmatter,
    body: string,
    rawContent: string,
    updatedAt: string,
  ): Skill {
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
      updatedAt,
    }
  }

  // Public API methods

  getSkills(): Skill[] {
    return this.getAll()
  }

  getSkill(name: string): Skill | null {
    return this.getOne(name)
  }

  getSkillNames(): string[] {
    return this.getAll().map(s => s.name).sort()
  }

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
    const safeName = this.sanitizeName(skill.name)
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

    const { rawContent, updatedAt } = this.saveResource(safeName, frontmatter, skill.content)

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
      updatedAt,
    }
  }

  deleteSkill(name: string): boolean {
    return this.delete(name)
  }
}
