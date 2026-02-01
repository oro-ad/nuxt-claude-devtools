import { createLogger } from '../logger'
import { MarkdownResourceManager } from './base-resource-manager'
import { COMMANDS_SUBDIR } from './constants'

const log = createLogger('commands', { timestamp: true })

export interface SlashCommand {
  name: string
  path: string
  description?: string
  allowedTools?: string[]
  disableModelInvocation?: boolean
  content: string
  rawContent: string
  updatedAt: string
  /** Source of the command: 'project' for local .claude/, or plugin name */
  source?: string
}

interface CommandFrontmatter {
  'description'?: string
  'allowed-tools'?: string
  'disable-model-invocation'?: boolean
}

export class CommandsManager extends MarkdownResourceManager<SlashCommand, CommandFrontmatter> {
  constructor(projectPath: string) {
    super(projectPath, COMMANDS_SUBDIR, log)
  }

  protected buildFrontmatter(command: Partial<SlashCommand>): string {
    return this.buildFrontmatterLines([
      { key: 'description', value: command.description },
      { key: 'allowed-tools', value: command.allowedTools },
      { key: 'disable-model-invocation', value: command.disableModelInvocation },
    ])
  }

  protected toResource(
    name: string,
    frontmatter: CommandFrontmatter,
    body: string,
    rawContent: string,
    updatedAt: string,
  ): SlashCommand {
    return {
      name,
      path: `${name}.md`,
      description: frontmatter.description,
      allowedTools: frontmatter['allowed-tools']
        ? frontmatter['allowed-tools'].split(',').map(s => s.trim())
        : undefined,
      disableModelInvocation: frontmatter['disable-model-invocation'],
      content: body,
      rawContent,
      updatedAt,
    }
  }

  // Public API methods

  getCommands(): SlashCommand[] {
    return this.getAll()
  }

  getCommand(name: string): SlashCommand | null {
    return this.getOne(name)
  }

  saveCommand(
    name: string,
    content: string,
    options?: {
      description?: string
      allowedTools?: string[]
      disableModelInvocation?: boolean
    },
  ): SlashCommand {
    const safeName = this.sanitizeName(name)
    const frontmatter = this.buildFrontmatter({
      description: options?.description,
      allowedTools: options?.allowedTools,
      disableModelInvocation: options?.disableModelInvocation,
    })

    const { rawContent, updatedAt } = this.saveResource(safeName, frontmatter, content)

    return {
      name: safeName,
      path: `${safeName}.md`,
      description: options?.description,
      allowedTools: options?.allowedTools,
      disableModelInvocation: options?.disableModelInvocation,
      content,
      rawContent,
      updatedAt,
    }
  }

  deleteCommand(name: string): boolean {
    return this.delete(name)
  }
}
