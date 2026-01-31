import { onMounted, onUnmounted, ref } from 'vue'
import type { Socket } from 'socket.io-client'
import { io } from 'socket.io-client'
import { useTunnel } from '#imports'
import { SOCKET_PATH } from '../constants'

export interface UseSocketOptions {
  /** Logger name for debugging */
  loggerName?: string
  /** Called when socket connects */
  onConnect?: () => void
  /** Called when socket disconnects */
  onDisconnect?: () => void
  /** Auto-connect on mount (default: true) */
  autoConnect?: boolean
}

type EventHandler = (data: unknown) => void

/**
 * Composable for managing Socket.IO connection
 * Handles connection lifecycle, tunnel URL detection, and cleanup
 */
export function useSocket(options: UseSocketOptions = {}) {
  const { loggerName = 'socket', onConnect, onDisconnect, autoConnect = true } = options

  const tunnel = useTunnel()
  const { log } = useLogger(loggerName)

  const socket = ref<Socket | null>(null)
  const isConnected = ref(false)

  // Queue listeners registered before socket connects
  const pendingListeners: Array<{ event: string, handler: EventHandler }> = []

  function getSocketUrl(): string {
    if (tunnel.isActive.value && tunnel.origin.value) {
      return tunnel.origin.value
    }
    return window.location.origin
  }

  function connect() {
    if (socket.value?.connected) return

    const url = getSocketUrl()
    log('Connecting to socket at', url)

    socket.value = io(url, {
      path: SOCKET_PATH,
      transports: ['websocket', 'polling'],
      reconnection: true,
      reconnectionAttempts: 5,
    })

    // Apply pending listeners
    for (const { event, handler } of pendingListeners) {
      socket.value.on(event, handler)
    }

    socket.value.on('connect', () => {
      log('Connected')
      isConnected.value = true
      onConnect?.()
    })

    socket.value.on('disconnect', () => {
      log('Disconnected')
      isConnected.value = false
      onDisconnect?.()
    })
  }

  function disconnect() {
    if (socket.value) {
      socket.value.disconnect()
      socket.value = null
      isConnected.value = false
    }
  }

  /**
   * Emit an event to the socket
   */
  function emit<T = unknown>(event: string, data?: T) {
    if (socket.value) {
      socket.value.emit(event, data)
    }
  }

  /**
   * Listen to a socket event
   * If socket is not yet connected, queues the listener for later registration
   */
  function on<T = unknown>(event: string, handler: (data: T) => void) {
    const wrappedHandler = handler as EventHandler
    if (socket.value) {
      socket.value.on(event, wrappedHandler)
    }
    else {
      // Queue for when socket connects
      pendingListeners.push({ event, handler: wrappedHandler })
    }
  }

  /**
   * Remove a socket event listener
   */
  function off(event: string, handler?: (...args: unknown[]) => void) {
    if (socket.value) {
      socket.value.off(event, handler)
    }
  }

  if (autoConnect) {
    onMounted(() => connect())
    onUnmounted(() => disconnect())
  }

  return {
    socket,
    isConnected,
    connect,
    disconnect,
    emit,
    on,
    off,
    log,
  }
}
