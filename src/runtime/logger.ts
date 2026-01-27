const PREFIX = '[nuxt-claude-devtools]'

let _debugEnabled: boolean | null = null

function isDebugEnabled(): boolean {
  if (_debugEnabled !== null) {
    return _debugEnabled
  }

  // Try to get from runtimeConfig (available in Nitro runtime)
  try {
    // Dynamic import to avoid issues in module.ts context
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const { useRuntimeConfig } = require('nitropack/runtime')
    const config = useRuntimeConfig()
    _debugEnabled = config.public?.claudeDevtools?.debug === true
    return _debugEnabled
  }
  catch {
    // Fallback to env variable (set in module.ts during setup)
    _debugEnabled = process.env.CLAUDE_DEVTOOLS_DEBUG === 'true'
    return _debugEnabled
  }
}

interface LoggerOptions {
  timestamp?: boolean
}

export function createLogger(subsystem: string, options: LoggerOptions = {}) {
  const tag = `${PREFIX} [${subsystem}]`

  return function log(message: string, data?: unknown) {
    if (!isDebugEnabled()) {
      return
    }

    const ts = options.timestamp ? ` [${new Date().toISOString()}]` : ''
    if (data !== undefined) {
      console.log(`${tag}${ts} ${message}`, data)
    }
    else {
      console.log(`${tag}${ts} ${message}`)
    }
  }
}
