/**
 * useClaudeChat composable for Overlay
 * Thin wrapper around useClaudeChatCore with overlay-specific defaults
 */
import type { ComputedRef, Ref } from 'vue'
import type { Socket } from 'socket.io-client'
import type { ContentBlock, Conversation, DocFile, Message, SlashCommand } from '../types'
import { useClaudeChatCore } from './useClaudeChatCore'

export interface UseChatOptions {
  onDocsReceived?: (docs: DocFile[]) => void
  onCommandsReceived?: (commands: SlashCommand[]) => void
  log?: (...args: unknown[]) => void
  /** Custom socket URL (for tunnel support) */
  socketUrl?: string
  /** Current user ID for collaborative mode */
  getCurrentUserId?: () => string | null
}

/** Return type for useClaudeChat composable */
export interface UseChatReturn {
  // State
  socket: Ref<Socket | null>
  messages: Ref<Message[]>
  conversations: Ref<Conversation[]>
  activeConversationId: Ref<string | null>
  isConnected: Ref<boolean>
  isSessionActive: Ref<boolean>
  isProcessing: Ref<boolean>
  isHistoryOpen: Ref<boolean>
  statusText: ComputedRef<string>
  statusColor: ComputedRef<string>

  // Methods
  connectSocket: () => void
  disconnect: () => void
  newChat: () => void
  sendMessage: (content: string, senderId?: string, senderNickname?: string) => boolean
  stopGeneration: () => boolean
  addMessage: (role: Message['role'], content: string, streaming?: boolean) => Message
  toggleHistory: () => void
  selectConversation: (id: string) => void
  findToolResult: (blocks: ContentBlock[] | undefined, toolUseId: string) => ContentBlock | undefined
}

export function useClaudeChat(options: UseChatOptions = {}): UseChatReturn {
  const { log = () => {}, onDocsReceived, onCommandsReceived, socketUrl, getCurrentUserId } = options

  function getSocketUrl(): string {
    if (socketUrl) return socketUrl
    if (typeof window !== 'undefined') {
      return window.location.origin
    }
    return ''
  }

  const core = useClaudeChatCore({
    getSocketUrl,
    log,
    onDocsReceived,
    onCommandsReceived,
    getCurrentUserId,
  })

  // Return subset for overlay (without deleteConversation)
  return {
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
    connectSocket: core.connectSocket,
    disconnect: core.disconnect,
    newChat: core.newChat,
    sendMessage: core.sendMessage,
    stopGeneration: core.stopGeneration,
    addMessage: core.addMessage,
    toggleHistory: core.toggleHistory,
    selectConversation: core.selectConversation,
    findToolResult: core.findToolResult,
  }
}
