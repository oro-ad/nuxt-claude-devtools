const PREFIX = '[claude-devtools]'

export function useLogger(subsystem?: string) {
  const debug = import.meta.client && window.location.hash.includes('debug=true')

  const tag = subsystem ? `${PREFIX} [${subsystem}]` : PREFIX

  function log(message: string, ...args: unknown[]) {
    if (!debug) {
      return
    }

    if (args.length > 0) {
      console.log(`${tag} ${message}`, ...args)
    }
    else {
      console.log(`${tag} ${message}`)
    }
  }

  return { log }
}
