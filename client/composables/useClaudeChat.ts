/**
 * useClaudeChat composable for DevTools Client
 * Uses shared core with DevTools-specific features
 */
import type { ContentBlock, Conversation, DocFile, Message, SlashCommand } from './types'
import { useClaudeChatCore } from '@shared/composables/useClaudeChatCore'

interface UseChatOptions {
  onDocsReceived?: (docs: DocFile[]) => void
  onCommandsReceived?: (commands: SlashCommand[]) => void
  log?: (...args: unknown[]) => void
  /** Current user ID for collaborative mode */
  getCurrentUserId?: () => string | null
}

export function useClaudeChat(
  getTunnelUrl: () => { isActive: boolean, origin: string | null },
  options: UseChatOptions = {},
) {
  const { log = console.log, onDocsReceived, onCommandsReceived, getCurrentUserId } = options

  function getSocketUrl(): string {
    const tunnel = getTunnelUrl()
    if (tunnel.isActive && tunnel.origin) {
      log('Using tunnel URL:', tunnel.origin)
      return tunnel.origin
    }
    return window.location.origin
  }

  const core = useClaudeChatCore({
    getSocketUrl,
    log,
    onDocsReceived,
    onCommandsReceived,
    getCurrentUserId,
    onDisconnected: () => {
      core.addMessage('system', 'Disconnected from server')
    },
  })

  return {
    // State
    socket: core.socket,
    messages: core.messages,
    conversations: core.conversations,
    activeConversationId: core.activeConversationId,
    isConnected: core.isConnected,
    isSessionActive: core.isSessionActive,
    isProcessing: core.isProcessing,
    isHistoryOpen: core.isHistoryOpen,
    statusText: core.statusText,
    statusColor: core.statusColor,

    // Methods
    connectSocket: core.connectSocket,
    disconnect: core.disconnect,
    newChat: core.newChat,
    sendMessage: core.sendMessage,
    stopGeneration: core.stopGeneration,
    addMessage: core.addMessage,
    toggleHistory: core.toggleHistory,
    selectConversation: core.selectConversation,
    deleteConversation: core.deleteConversation,
    findToolResult: core.findToolResult,
  }
}
