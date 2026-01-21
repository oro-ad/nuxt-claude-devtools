import { execSync, spawn } from 'node:child_process'
import type { Socket, Server as SocketServer } from 'socket.io'
import { createLogger } from '../logger'
import { AgentsManager } from './agents-manager'
import { CommandsManager } from './commands-manager'
import { DocsManager } from './docs-manager'
import { HistoryManager } from './history-manager'
import { SkillsManager } from './skills-manager'
import type {
  AssistantEvent,
  ContentBlock,
  Message,
  ResultEvent,
  StreamEvent,
  TextBlock,
  ToolResultEvent,
  ToolUseBlock,
  ToolUseEvent,
} from '../types'

const log = createLogger('session', { timestamp: true })

function getErrorMessage(error: unknown): string {
  if (error instanceof Error) return error.message
  return String(error)
}

function generateId(): string {
  return `msg_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`
}

export const SOCKET_PATH = '/__claude_devtools_socket'

type McpTransport = 'stdio' | 'http' | 'sse'
type McpScope = 'global' | 'local'

interface McpServer {
  name: string
  command?: string
  args?: string[]
  url?: string
  transport: McpTransport
  env?: Record<string, string>
  scope: McpScope
}

interface McpAddRequest {
  name: string
  transport: McpTransport
  command?: string
  args?: string[]
  url?: string
  scope: McpScope
}

interface McpRemoveRequest {
  name: string
  scope?: McpScope
}

export interface ClaudeSessionConfig {
  command: string
  args: string[]
  rootDir: string
  tunnelOrigin?: string | null
}

export class ClaudeSession {
  private config: ClaudeSessionConfig
  private io: SocketServer | null = null
  private isProcessing: boolean = false
  private continueSession: boolean = false
  private historyManager: HistoryManager
  private docsManager: DocsManager
  private commandsManager: CommandsManager
  private agentsManager: AgentsManager
  private skillsManager: SkillsManager

  // Claude CLI session ID (in-memory only, lost on hot-reload)
  private claudeSessionId: string | null = null

  // Stream parsing state
  private parseBuffer: string = ''
  private currentContentBlocks: ContentBlock[] = []
  private currentMessageId: string = ''
  private currentModel: string = ''
  private accumulatedText: string = ''

  constructor(config: ClaudeSessionConfig) {
    this.config = config
    this.historyManager = new HistoryManager(config.rootDir)
    this.docsManager = new DocsManager(config.rootDir)
    this.commandsManager = new CommandsManager(config.rootDir)
    this.agentsManager = new AgentsManager(config.rootDir)
    this.skillsManager = new SkillsManager(config.rootDir)
  }

  attachSocketIO(io: SocketServer) {
    this.io = io
    log(`Socket.IO attached, setting up event handlers`)

    this.io.on('connection', (socket) => {
      log('Client connected', { socketId: socket.id })

      socket.emit('session:status', {
        active: true,
        processing: this.isProcessing,
      })

      // Send current conversation on connect
      const conversation = this.historyManager.getActiveConversation()
      socket.emit('history:loaded', conversation)

      socket.on('message:send', (message: string) => {
        log('Message received', { length: message.length, preview: message.substring(0, 100) })
        this.sendMessage(message)
      })

      socket.on('session:reset', () => {
        log('Resetting session (new conversation)')
        this.continueSession = false
        this.claudeSessionId = null // Clear in-memory session
        // Note: resetSession() creates new conversation, so old session ID is preserved in old conversation
        const conversation = this.historyManager.resetSession()
        this.io?.emit('session:status', { active: true, processing: false })
        this.io?.emit('history:loaded', conversation)
      })

      // History management
      socket.on('history:load', () => {
        const conversation = this.historyManager.getActiveConversation()
        socket.emit('history:loaded', conversation)
      })

      socket.on('history:list', () => {
        const conversations = this.historyManager.getConversations()
        socket.emit('history:list', conversations)
      })

      socket.on('history:switch', (id: string) => {
        const conversation = this.historyManager.setActiveConversation(id)
        if (conversation) {
          // Reset in-memory session state, will load from file on next message
          this.continueSession = false
          this.claudeSessionId = conversation.claudeSessionId || null
          log('Switched to conversation', {
            id: conversation.id,
            claudeSessionId: this.claudeSessionId,
            messageCount: conversation.messages.length,
          })
          socket.emit('history:switched', conversation)
        }
      })

      socket.on('history:delete', (id: string) => {
        const success = this.historyManager.deleteConversation(id)
        socket.emit('history:deleted', { id, success })
        // Send updated list
        const conversations = this.historyManager.getConversations()
        socket.emit('history:list', conversations)
      })

      // MCP Management
      socket.on('mcp:list', () => {
        log('MCP list requested')
        const servers = this.getMcpServers()
        socket.emit('mcp:list', servers)
      })

      socket.on('mcp:add', (data: McpAddRequest) => {
        log('MCP add requested', data)
        this.addMcpServer(data, socket)
      })

      socket.on('mcp:remove', (data: McpRemoveRequest) => {
        log('MCP remove requested', data)
        this.removeMcpServer(data, socket)
      })

      // Docs Management
      socket.on('docs:list', () => {
        log('Docs list requested')
        const files = this.docsManager.getDocFiles()
        socket.emit('docs:list', files)
      })

      socket.on('docs:get', (path: string) => {
        log('Docs get requested', { path })
        const file = this.docsManager.getDocFile(path)
        socket.emit('docs:file', file)
      })

      socket.on('docs:save', (data: { path: string, content: string }) => {
        log('Docs save requested', { path: data.path })
        try {
          const file = this.docsManager.saveDocFile(data.path, data.content)
          socket.emit('docs:saved', { success: true, file })
          // Send updated list
          const files = this.docsManager.getDocFiles()
          socket.emit('docs:list', files)
        }
        catch (error) {
          socket.emit('docs:saved', { success: false, error: String(error) })
        }
      })

      socket.on('docs:delete', (path: string) => {
        log('Docs delete requested', { path })
        const success = this.docsManager.deleteDocFile(path)
        socket.emit('docs:deleted', { path, success })
        // Send updated list
        const files = this.docsManager.getDocFiles()
        socket.emit('docs:list', files)
      })

      // CLAUDE.md Management
      socket.on('claudemd:get', () => {
        log('CLAUDE.md get requested')
        const data = this.docsManager.getClaudeMd()
        socket.emit('claudemd:data', data)
      })

      socket.on('claudemd:save', (content: string) => {
        log('CLAUDE.md save requested')
        try {
          const data = this.docsManager.saveClaudeMd(content)
          socket.emit('claudemd:saved', { success: true, ...data })
        }
        catch (error) {
          socket.emit('claudemd:saved', { success: false, error: String(error) })
        }
      })

      // LLMS Sources Management
      socket.on('llms:list', () => {
        log('LLMS list requested')
        const sources = this.docsManager.getLlmsSources()
        socket.emit('llms:list', sources)
      })

      socket.on('llms:add', (data: { url: string, title?: string, description?: string }) => {
        log('LLMS add requested', { url: data.url })
        try {
          const source = this.docsManager.addLlmsSource(data.url, data.title, data.description)
          socket.emit('llms:added', { success: true, source })
          // Send updated list
          const sources = this.docsManager.getLlmsSources()
          socket.emit('llms:list', sources)
        }
        catch (error) {
          socket.emit('llms:added', { success: false, error: String(error) })
        }
      })

      socket.on('llms:remove', (url: string) => {
        log('LLMS remove requested', { url })
        const success = this.docsManager.removeLlmsSource(url)
        socket.emit('llms:removed', { url, success })
        // Send updated list
        const sources = this.docsManager.getLlmsSources()
        socket.emit('llms:list', sources)
      })

      socket.on('llms:update', (data: { url: string, title?: string, description?: string }) => {
        log('LLMS update requested', { url: data.url })
        const source = this.docsManager.updateLlmsSource(data.url, {
          title: data.title,
          description: data.description,
        })
        socket.emit('llms:updated', { success: !!source, source })
      })

      // Commands (Slash Commands / Skills) Management
      socket.on('commands:list', () => {
        log('Commands list requested')
        const commands = this.commandsManager.getCommands()
        socket.emit('commands:list', commands)
      })

      socket.on('commands:get', (name: string) => {
        log('Command get requested', { name })
        const command = this.commandsManager.getCommand(name)
        socket.emit('commands:data', command)
      })

      socket.on('commands:save', (data: {
        name: string
        content: string
        description?: string
        allowedTools?: string[]
        disableModelInvocation?: boolean
      }) => {
        log('Command save requested', { name: data.name })
        try {
          const command = this.commandsManager.saveCommand(data.name, data.content, {
            description: data.description,
            allowedTools: data.allowedTools,
            disableModelInvocation: data.disableModelInvocation,
          })
          socket.emit('commands:saved', { success: true, command })
          // Send updated list
          const commands = this.commandsManager.getCommands()
          socket.emit('commands:list', commands)
        }
        catch (error) {
          socket.emit('commands:saved', { success: false, error: String(error) })
        }
      })

      socket.on('commands:delete', (name: string) => {
        log('Command delete requested', { name })
        const success = this.commandsManager.deleteCommand(name)
        socket.emit('commands:deleted', { name, success })
        // Send updated list
        const commands = this.commandsManager.getCommands()
        socket.emit('commands:list', commands)
      })

      // Agents (Subagents) Management
      socket.on('agents:list', () => {
        log('Agents list requested')
        const agents = this.agentsManager.getAgents()
        socket.emit('agents:list', agents)
      })

      socket.on('agents:get', (name: string) => {
        log('Agent get requested', { name })
        const agent = this.agentsManager.getAgent(name)
        socket.emit('agents:data', agent)
      })

      socket.on('agents:save', (data: {
        name: string
        description: string
        prompt: string
        model?: string
        tools?: string[]
        disallowedTools?: string[]
        permissionMode?: 'default' | 'acceptEdits' | 'dontAsk' | 'bypassPermissions' | 'plan'
        skills?: string[]
      }) => {
        log('Agent save requested', { name: data.name })
        try {
          const agent = this.agentsManager.saveAgent({
            name: data.name,
            description: data.description,
            prompt: data.prompt,
            model: data.model,
            tools: data.tools,
            disallowedTools: data.disallowedTools,
            permissionMode: data.permissionMode,
            skills: data.skills,
          })
          socket.emit('agents:saved', { success: true, agent })
          // Send updated list
          const agents = this.agentsManager.getAgents()
          socket.emit('agents:list', agents)
        }
        catch (error) {
          socket.emit('agents:saved', { success: false, error: String(error) })
        }
      })

      socket.on('agents:delete', (name: string) => {
        log('Agent delete requested', { name })
        const success = this.agentsManager.deleteAgent(name)
        socket.emit('agents:deleted', { name, success })
        // Send updated list
        const agents = this.agentsManager.getAgents()
        socket.emit('agents:list', agents)
      })

      // ===== SKILLS HANDLERS =====
      socket.on('skills:list', () => {
        log('Skills list requested')
        const skills = this.skillsManager.getSkills()
        socket.emit('skills:list', skills)
      })

      socket.on('skills:get', (name: string) => {
        log('Skill get requested', { name })
        const skill = this.skillsManager.getSkill(name)
        socket.emit('skills:get', skill)
      })

      socket.on('skills:save', (data: {
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
      }) => {
        log('Skill save requested', { name: data.name })
        try {
          const skill = this.skillsManager.saveSkill({
            name: data.name,
            description: data.description,
            content: data.content,
            argumentHint: data.argumentHint,
            disableModelInvocation: data.disableModelInvocation,
            userInvocable: data.userInvocable,
            allowedTools: data.allowedTools,
            model: data.model,
            context: data.context,
            agent: data.agent,
          })
          socket.emit('skills:saved', { success: true, skill })
          // Send updated list
          const skills = this.skillsManager.getSkills()
          socket.emit('skills:list', skills)
        }
        catch (error) {
          socket.emit('skills:saved', { success: false, error: getErrorMessage(error) })
        }
      })

      // Get skill names only (for agent skills selector)
      socket.on('skills:names', () => {
        log('Skill names requested')
        const names = this.skillsManager.getSkillNames()
        socket.emit('skills:names', names)
      })

      socket.on('skills:delete', (name: string) => {
        log('Skill delete requested', { name })
        const success = this.skillsManager.deleteSkill(name)
        socket.emit('skills:deleted', { name, success })
        // Send updated list
        const skills = this.skillsManager.getSkills()
        socket.emit('skills:list', skills)
      })

      socket.on('disconnect', () => {
        log('Client disconnected', { socketId: socket.id })
      })
    })
  }

  destroy() {
    this.io?.close()
  }

  private resetStreamState() {
    this.parseBuffer = ''
    this.currentContentBlocks = []
    this.currentMessageId = generateId()
    this.currentModel = ''
    this.accumulatedText = ''
  }

  private buildSystemPrompt(): string | null {
    const sections: string[] = []

    // Add LLMS sources information
    // Note: Claude automatically reads .claude/docs/ so we don't need to include those
    const llmsSources = this.docsManager.getLlmsSources()
    if (llmsSources.length > 0) {
      sections.push('=== EXTERNAL DOCUMENTATION SOURCES ===')
      sections.push('The following llms.txt sources are configured for this project.')
      sections.push('You can fetch these URLs to get documentation context when needed:')
      sections.push('')
      for (const source of llmsSources) {
        const title = source.title || source.domain
        const desc = source.description ? ` - ${source.description}` : ''
        sections.push(`- ${title}${desc}`)
        sections.push(`  URL: ${source.url}`)
      }
      sections.push('')
    }

    // Add conversation history if recovering context
    if (this.historyManager.hasHistoryForRecovery()) {
      const historyPrompt = this.historyManager.formatHistoryForSystemPrompt()
      if (historyPrompt) {
        sections.push(historyPrompt)
      }
    }

    if (sections.length === 0) {
      return null
    }

    return sections.join('\n')
  }

  private parseStreamChunk(data: string): StreamEvent[] {
    this.parseBuffer += data
    const events: StreamEvent[] = []

    // Split by newlines, keeping incomplete lines in buffer
    const lines = this.parseBuffer.split('\n')
    this.parseBuffer = lines.pop() || '' // Keep last incomplete line

    for (const line of lines) {
      if (line.trim()) {
        try {
          const event = JSON.parse(line) as StreamEvent
          events.push(event)
        }
        catch (e) {
          log('Failed to parse stream event', { line: line.substring(0, 100), error: e })
        }
      }
    }

    return events
  }

  private processStreamEvent(event: StreamEvent): void {
    switch (event.type) {
      case 'system':
        // System messages from Claude Code CLI
        log('System event', { subtype: (event as { subtype?: string }).subtype })
        break

      case 'assistant': {
        // Assistant message with content blocks
        const assistantEvent = event as AssistantEvent
        this.currentMessageId = assistantEvent.message.id
        this.currentModel = assistantEvent.message.model

        // Process content blocks from assistant message
        for (const block of assistantEvent.message.content) {
          if (block.type === 'text' && block.text) {
            const textBlock: TextBlock = {
              type: 'text',
              text: block.text,
            }
            this.currentContentBlocks.push(textBlock)
            this.accumulatedText += block.text

            // Emit for real-time UI update
            this.io?.emit('output:chunk', block.text)
            this.io?.emit('stream:text_delta', {
              index: this.currentContentBlocks.length - 1,
              text: block.text,
            })
          }
          else if (block.type === 'tool_use' && block.id && block.name) {
            const toolBlock: ToolUseBlock = {
              type: 'tool_use',
              id: block.id,
              name: block.name,
              input: block.input || {},
            }
            this.currentContentBlocks.push(toolBlock)

            this.io?.emit('stream:tool_use', {
              id: block.id,
              name: block.name,
              input: block.input || {},
            })
          }
        }
        break
      }

      case 'tool_use': {
        // Standalone tool use event
        const toolEvent = event as ToolUseEvent
        const toolBlock: ToolUseBlock = {
          type: 'tool_use',
          id: toolEvent.tool_use_id,
          name: toolEvent.name,
          input: toolEvent.input,
        }
        this.currentContentBlocks.push(toolBlock)

        this.io?.emit('stream:tool_use', {
          id: toolEvent.tool_use_id,
          name: toolEvent.name,
          input: toolEvent.input,
        })
        break
      }

      case 'tool_result': {
        // Tool result event
        const resultEvent = event as ToolResultEvent
        this.currentContentBlocks.push({
          type: 'tool_result',
          tool_use_id: resultEvent.tool_use_id,
          content: resultEvent.content,
          is_error: resultEvent.is_error,
        })

        this.io?.emit('stream:tool_result', {
          tool_use_id: resultEvent.tool_use_id,
          name: resultEvent.name,
          content: resultEvent.content,
          is_error: resultEvent.is_error,
        })
        break
      }

      case 'result': {
        // Final result from Claude Code CLI
        const resultEvent = event as ResultEvent
        log('Result event', {
          subtype: resultEvent.subtype,
          cost: resultEvent.cost_usd,
          duration: resultEvent.duration_ms,
          session_id: resultEvent.session_id,
        })

        // Save session_id for --resume (both in-memory and to file)
        if (resultEvent.session_id) {
          this.claudeSessionId = resultEvent.session_id
          this.historyManager.setClaudeSessionId(resultEvent.session_id)
          log('Saved Claude session ID', { sessionId: resultEvent.session_id })
        }

        // Emit result metadata
        this.io?.emit('stream:result', {
          subtype: resultEvent.subtype,
          result: resultEvent.result,
          error: resultEvent.error,
          session_id: resultEvent.session_id,
          cost_usd: resultEvent.cost_usd,
          duration_ms: resultEvent.duration_ms,
          is_error: resultEvent.is_error,
        })
        break
      }

      default:
        log('Unknown event type', { type: event.type })
    }
  }

  private sendMessage(message: string) {
    if (this.isProcessing) {
      log('Already processing, ignoring message')
      return
    }

    this.isProcessing = true
    this.resetStreamState()
    this.io?.emit('session:status', { active: true, processing: true })

    // Save user message to history
    const userMessage: Message = {
      id: generateId(),
      role: 'user',
      content: message,
      timestamp: new Date().toISOString(),
    }
    this.historyManager.addMessage(userMessage)

    // Emit that we're starting a new message
    this.io?.emit('stream:message_start', {
      id: this.currentMessageId,
    })

    const args = [
      ...this.config.args,
      '-p',
      message,
      '--output-format', 'stream-json',
      '--verbose',
      '--dangerously-skip-permissions',
    ]

    // Session continuation strategy:
    // 1. Use --resume with session_id if available (preserves full context)
    // 2. Otherwise, build system prompt with specs/llms info and history if available
    // 3. Otherwise use --continue for current session continuation
    const storedSessionId = this.claudeSessionId || this.historyManager.getClaudeSessionId()
    if (storedSessionId) {
      args.push('--resume', storedSessionId)
      log('Resuming Claude session', { sessionId: storedSessionId })
    }
    else {
      // Build system prompt with project context
      const systemPrompt = this.buildSystemPrompt()
      if (systemPrompt) {
        args.push('--system-prompt', systemPrompt)
        log('Using system prompt with project context', {
          promptLength: systemPrompt.length,
        })
      }
      else if (this.continueSession) {
        args.push('--continue')
      }
    }

    log('Spawning Claude process', { command: this.config.command, args, cwd: this.config.rootDir })

    const child = spawn(this.config.command, args, {
      cwd: this.config.rootDir,
      env: {
        ...process.env,
        FORCE_COLOR: '0',
        NO_COLOR: '1',
      },
      stdio: ['pipe', 'pipe', 'pipe'],
    })

    log('Claude process spawned', { pid: child.pid })

    child.stdout?.on('data', (data) => {
      const chunk = data.toString()
      log('stdout chunk', { length: chunk.length })

      const events = this.parseStreamChunk(chunk)
      for (const event of events) {
        this.processStreamEvent(event)
      }
    })

    child.stderr?.on('data', (data) => {
      const chunk = data.toString()
      log('stderr chunk', { length: chunk.length, preview: chunk.substring(0, 200) })
      // Don't emit stderr as error, it might contain progress info
    })

    child.on('error', (error) => {
      log('Process error', { error: error.message })
      this.io?.emit('session:error', error.message)
      this.isProcessing = false
      this.io?.emit('session:status', { active: true, processing: false })
    })

    // Handle stdin errors (EPIPE when process exits early)
    child.stdin?.on('error', (error) => {
      log('stdin error (process may have exited)', { error: error.message })
    })

    child.on('close', (code) => {
      log('Process closed', { exitCode: code })
      this.isProcessing = false

      if (code === 0) {
        // Mark that next message should continue this conversation
        this.continueSession = true

        // Save assistant message to history
        const assistantMessage: Message = {
          id: this.currentMessageId,
          role: 'assistant',
          content: this.accumulatedText,
          contentBlocks: this.currentContentBlocks.length > 0 ? [...this.currentContentBlocks] : undefined,
          timestamp: new Date().toISOString(),
          model: this.currentModel,
        }
        this.historyManager.addMessage(assistantMessage)

        // Emit completion with full message data
        this.io?.emit('stream:message_complete', {
          id: this.currentMessageId,
          model: this.currentModel,
          content: this.accumulatedText,
          contentBlocks: this.currentContentBlocks,
        })

        // Legacy event for backward compatibility
        this.io?.emit('output:complete')
      }
      else {
        // If --resume failed, clear the session ID (both in-memory and file) and notify
        const sessionIdWasUsed = this.claudeSessionId || this.historyManager.getClaudeSessionId()
        if (sessionIdWasUsed) {
          log('Clearing expired Claude session ID', { sessionId: sessionIdWasUsed })
          this.claudeSessionId = null
          this.historyManager.setClaudeSessionId('')
        }
        this.io?.emit('session:error', `Process exited with code ${code}. Session may have expired - try sending the message again.`)
      }

      this.io?.emit('session:status', { active: true, processing: false })
    })

    // Close stdin immediately (with error handling)
    try {
      child.stdin?.end()
    }
    catch (e) {
      log('Error closing stdin', { error: e })
    }
  }

  private getMcpServers(): McpServer[] {
    const servers: McpServer[] = []

    try {
      // Use claude mcp list command to get all servers
      const output = execSync(`${this.config.command} mcp list`, {
        cwd: this.config.rootDir,
        encoding: 'utf-8',
        stdio: ['pipe', 'pipe', 'pipe'],
      })

      log('MCP list output', { output })

      // Parse the output - format is like:
      // nuxt-ui-remote: https://ui.nuxt.com/mcp (HTTP) - ✓ Connected
      const lines = output.split('\n').filter(line => line.trim() && !line.includes('Checking'))

      for (const line of lines) {
        // Match pattern: name: url/command (TYPE) - status
        // Using non-whitespace capture to avoid backtracking issues
        const match = line.match(/^(\S+):\s(\S+(?:\s\S+)*)\s\((\w+)\)/)
        if (match) {
          const [, name, urlOrCommand, type] = match
          const transport = type.toLowerCase() as McpTransport

          servers.push({
            name,
            url: transport !== 'stdio' ? urlOrCommand : undefined,
            command: transport === 'stdio' ? urlOrCommand.split(' ')[0] : undefined,
            args: transport === 'stdio' ? urlOrCommand.split(' ').slice(1) : [],
            transport,
            scope: 'local', // We'll determine scope separately if needed
          })
        }
      }
    }
    catch (error: unknown) {
      log('Error getting MCP servers', { error: getErrorMessage(error) })
    }

    log('MCP servers found', { count: servers.length })
    return servers
  }

  private addMcpServer(data: McpAddRequest, socket: Socket) {
    // Scopes:
    // - local (default): private to user in this project, no approval needed
    // - user: global for user across all projects
    // - project: writes to .mcp.json, requires interactive approval (don't use)
    const scopeArg = data.scope === 'global' ? '--scope user' : '--scope local'
    let cmd: string

    if (data.transport === 'stdio') {
      // stdio transport: claude mcp add [options] <name> -- <command> <args>
      const argsStr = (data.args || []).join(' ')
      cmd = `${this.config.command} mcp add ${scopeArg} ${data.name} -- ${data.command} ${argsStr}`
    }
    else {
      // http/sse transport: claude mcp add [options] <name> <url>
      cmd = `${this.config.command} mcp add --transport ${data.transport} ${scopeArg} ${data.name} ${data.url}`
    }

    log('Running MCP add command', { cmd })

    try {
      execSync(cmd, {
        cwd: this.config.rootDir,
        encoding: 'utf-8',
        stdio: ['pipe', 'pipe', 'pipe'],
      })

      socket.emit('mcp:added', { success: true, name: data.name })
      // Send updated list
      const servers = this.getMcpServers()
      socket.emit('mcp:list', servers)
    }
    catch (error: unknown) {
      const errorMessage = getErrorMessage(error)
      log('Error adding MCP server', { error: errorMessage })
      socket.emit('mcp:added', { success: false, error: errorMessage })
    }
  }

  private removeMcpServer(data: McpRemoveRequest, socket: Socket) {
    // Without scope, removes from whichever scope the server exists in
    const cmd = `${this.config.command} mcp remove ${data.name}`

    log('Running MCP remove command', { cmd })

    try {
      execSync(cmd, {
        cwd: this.config.rootDir,
        encoding: 'utf-8',
        stdio: ['pipe', 'pipe', 'pipe'],
      })

      socket.emit('mcp:removed', { success: true, name: data.name })
      // Send updated list
      const servers = this.getMcpServers()
      socket.emit('mcp:list', servers)
    }
    catch (error: unknown) {
      const errorMessage = getErrorMessage(error)
      log('Error removing MCP server', { error: errorMessage })
      socket.emit('mcp:removed', { success: false, error: errorMessage })
    }
  }
}

let sessionInstance: ClaudeSession | null = null

export function initClaudeSession(config: ClaudeSessionConfig): ClaudeSession {
  if (!sessionInstance) {
    sessionInstance = new ClaudeSession(config)
    log('Session initialized')
  }
  return sessionInstance
}

export function getClaudeSessionInstance(): ClaudeSession | null {
  return sessionInstance
}

export function destroyClaudeSession() {
  if (sessionInstance) {
    sessionInstance.destroy()
    sessionInstance = null
    log('Session destroyed')
  }
}
