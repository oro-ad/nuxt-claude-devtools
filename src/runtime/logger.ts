const PREFIX = '[nuxt-claude-devtools]'

interface LoggerOptions {
  timestamp?: boolean
}

export function createLogger(subsystem: string, options: LoggerOptions = {}) {
  const tag = `${PREFIX} [${subsystem}]`

  return function log(message: string, data?: unknown) {
    const ts = options.timestamp ? ` [${new Date().toISOString()}]` : ''
    if (data !== undefined) {
      console.log(`${tag}${ts} ${message}`, data)
    }
    else {
      console.log(`${tag}${ts} ${message}`)
    }
  }
}
