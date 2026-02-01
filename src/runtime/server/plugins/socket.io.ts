import type { NitroApp } from 'nitropack'
import { defineNitroPlugin, useRuntimeConfig } from 'nitropack/runtime'
import { Server as Engine } from 'engine.io'
import { Server } from 'socket.io'
import { defineEventHandler } from 'h3'
import { SOCKET_PATH } from '../../constants'
import { createLogger } from '../../logger'
import { getClaudeSessionInstance, initClaudeSession } from '../claude-session'

const log = createLogger('plugin')

export default defineNitroPlugin((nitroApp: NitroApp) => {
  const config = useRuntimeConfig()
  const claudeConfig = config.claudeDevtools as {
    claude: { command: string, args: string[] }
    rootDir: string
    tunnelOrigin?: string | null
    pluginsCachePath?: string | null
  } | undefined

  if (!claudeConfig) {
    log('No config found, skipping Socket.IO setup')
    return
  }

  log('Initializing Socket.IO server')

  // Initialize the session
  initClaudeSession({
    command: claudeConfig.claude.command,
    args: claudeConfig.claude.args,
    rootDir: claudeConfig.rootDir,
    tunnelOrigin: claudeConfig.tunnelOrigin || null,
    pluginsCachePath: claudeConfig.pluginsCachePath || null,
  })

  const engine = new Engine()
  const io = new Server()
  io.bind(engine)

  // Get session and attach Socket.IO
  const session = getClaudeSessionInstance()
  if (session) {
    session.attachSocketIO(io)
  }

  nitroApp.router.use(`${SOCKET_PATH}/`, defineEventHandler({
    handler(event) {
      engine.handleRequest(event.node.req, event.node.res)
      event._handled = true
    },
    websocket: {
      open(peer) {
        // @ts-expect-error - private method and property
        engine.prepare(peer._internal.nodeReq)
        // @ts-expect-error - private method and property
        engine.onWebSocket(
          // @ts-expect-error - accessing internal
          peer._internal.nodeReq,
          // @ts-expect-error - accessing internal
          peer._internal.nodeReq.socket,
          peer.websocket,
        )
      },
    },
  }))

  log(`Socket.IO server ready on ${SOCKET_PATH}/`)
})
