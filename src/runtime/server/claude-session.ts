import { execSync, spawn } from 'node:child_process'
import type { Socket, Server as SocketServer } from 'socket.io'
import { createLogger } from '../../logger'

const log = createLogger('session', { timestamp: true })

function getErrorMessage(error: unknown): string {
  if (error instanceof Error) return error.message
  return String(error)
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

  constructor(config: ClaudeSessionConfig) {
    this.config = config
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

      socket.on('message:send', (message: string) => {
        log('Message received', { length: message.length, preview: message.substring(0, 100) })
        this.sendMessage(message)
      })

      socket.on('session:reset', () => {
        log('Resetting session (new conversation)')
        this.continueSession = false
        this.io?.emit('session:status', { active: true, processing: false })
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

      socket.on('disconnect', () => {
        log('Client disconnected', { socketId: socket.id })
      })
    })
  }

  destroy() {
    this.io?.close()
  }

  private sendMessage(message: string) {
    if (this.isProcessing) {
      log('Already processing, ignoring message')
      return
    }

    this.isProcessing = true
    this.io?.emit('session:status', { active: true, processing: true })

    const args = [
      ...this.config.args,
      '-p',
      message,
      '--dangerously-skip-permissions',
    ]

    // Add --continue flag to continue previous conversation
    if (this.continueSession) {
      args.push('--continue')
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
      this.io?.emit('output:chunk', chunk)
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

    child.on('close', (code) => {
      log('Process closed', { exitCode: code })
      this.isProcessing = false

      if (code === 0) {
        // Mark that next message should continue this conversation
        this.continueSession = true
        this.io?.emit('output:complete')
      }
      else {
        this.io?.emit('session:error', `Process exited with code ${code}`)
      }

      this.io?.emit('session:status', { active: true, processing: false })
    })

    // Close stdin immediately
    child.stdin?.end()
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
