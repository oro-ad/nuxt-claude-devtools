import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'
import { createLogger } from '../logger'
import type { Conversation, HistoryStore, Message } from '../types'

const log = createLogger('history', { timestamp: true })

export class HistoryManager {
  private storePath: string
  private store: HistoryStore
  private projectPath: string

  constructor(projectPath: string) {
    this.projectPath = projectPath
    // Store in project's .claude-devtools directory
    const historyDir = join(projectPath, '.claude-devtools')
    this.storePath = join(historyDir, 'history.json')

    // Ensure directory exists
    if (!existsSync(historyDir)) {
      mkdirSync(historyDir, { recursive: true })
      log('Created history directory', { path: historyDir })
    }

    this.store = this.loadStore()
  }

  private loadStore(): HistoryStore {
    try {
      if (existsSync(this.storePath)) {
        const data = readFileSync(this.storePath, 'utf-8')
        const parsed = JSON.parse(data) as HistoryStore
        log('Loaded history store', { conversations: parsed.conversations.length })
        return parsed
      }
    }
    catch (error) {
      log('Failed to load history store', { error })
    }

    return {
      version: 1,
      conversations: [],
      activeConversationId: null,
    }
  }

  private saveStore(): void {
    try {
      writeFileSync(this.storePath, JSON.stringify(this.store, null, 2))
      log('Saved history store')
    }
    catch (error) {
      log('Failed to save history store', { error })
    }
  }

  private generateId(): string {
    return `conv_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`
  }

  // Create new conversation
  createConversation(): Conversation {
    const conversation: Conversation = {
      id: this.generateId(),
      messages: [],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      projectPath: this.projectPath,
    }

    this.store.conversations.unshift(conversation) // Add to beginning
    this.store.activeConversationId = conversation.id
    this.saveStore()

    log('Created conversation', { id: conversation.id })
    return conversation
  }

  // Get active conversation or create new one
  getActiveConversation(): Conversation {
    if (this.store.activeConversationId) {
      const conv = this.store.conversations.find(
        c => c.id === this.store.activeConversationId,
      )
      if (conv) return conv
    }
    return this.createConversation()
  }

  // Add message to active conversation
  addMessage(message: Message): void {
    const conversation = this.getActiveConversation()
    conversation.messages.push(message)
    conversation.updatedAt = new Date().toISOString()

    // Auto-generate title from first user message
    if (!conversation.title && message.role === 'user') {
      conversation.title = message.content.substring(0, 50)
        + (message.content.length > 50 ? '...' : '')
    }

    this.saveStore()
  }

  // Update last assistant message (for streaming completion)
  updateLastAssistantMessage(updates: Partial<Message>): void {
    const conversation = this.getActiveConversation()
    const lastAssistant = [...conversation.messages]
      .reverse()
      .find(m => m.role === 'assistant')

    if (lastAssistant) {
      Object.assign(lastAssistant, updates)
      conversation.updatedAt = new Date().toISOString()
      this.saveStore()
    }
  }

  // Get all conversations (for history list)
  getConversations(): Conversation[] {
    return this.store.conversations
  }

  // Get specific conversation by ID
  getConversation(id: string): Conversation | undefined {
    return this.store.conversations.find(c => c.id === id)
  }

  // Set active conversation
  setActiveConversation(id: string): Conversation | undefined {
    const conversation = this.getConversation(id)
    if (conversation) {
      this.store.activeConversationId = id
      this.saveStore()
    }
    return conversation
  }

  // Delete conversation
  deleteConversation(id: string): boolean {
    const index = this.store.conversations.findIndex(c => c.id === id)
    if (index !== -1) {
      this.store.conversations.splice(index, 1)
      if (this.store.activeConversationId === id) {
        this.store.activeConversationId
          = this.store.conversations[0]?.id || null
      }
      this.saveStore()
      return true
    }
    return false
  }

  // Reset (new conversation)
  resetSession(): Conversation {
    this.store.activeConversationId = null
    return this.createConversation()
  }

  // Get active conversation ID
  getActiveConversationId(): string | null {
    return this.store.activeConversationId
  }

  // Set Claude session ID for active conversation (empty string clears it)
  setClaudeSessionId(sessionId: string): void {
    const conversation = this.getActiveConversation()
    if (sessionId) {
      conversation.claudeSessionId = sessionId
    }
    else {
      delete conversation.claudeSessionId
    }
    this.saveStore()
    log('Set Claude session ID', { conversationId: conversation.id, sessionId: sessionId || '(cleared)' })
  }

  // Get Claude session ID for active conversation
  getClaudeSessionId(): string | null {
    const conversation = this.store.activeConversationId
      ? this.store.conversations.find(c => c.id === this.store.activeConversationId)
      : null
    return conversation?.claudeSessionId || null
  }

  // Format conversation history for system prompt (fallback when --resume fails)
  formatHistoryForSystemPrompt(): string | null {
    const conversation = this.store.activeConversationId
      ? this.store.conversations.find(c => c.id === this.store.activeConversationId)
      : null

    if (!conversation || conversation.messages.length === 0) {
      return null
    }

    const lines: string[] = [
      '=== CONVERSATION HISTORY (context recovery) ===',
      'The following is the history of our previous conversation. Please continue from where we left off.',
      '',
    ]

    for (const msg of conversation.messages) {
      const role = msg.role === 'user' ? 'User' : 'Assistant'
      const timestamp = typeof msg.timestamp === 'string'
        ? msg.timestamp
        : msg.timestamp.toISOString()

      lines.push(`[${role}] (${timestamp})`)

      // For assistant messages, include text content only (skip tool calls for brevity)
      if (msg.role === 'assistant') {
        // Use plain text content
        if (msg.content) {
          lines.push(msg.content)
        }
      }
      else {
        lines.push(msg.content)
      }

      lines.push('')
    }

    lines.push('=== END OF HISTORY ===')
    lines.push('')

    log('Formatted history for system prompt', {
      conversationId: conversation.id,
      messageCount: conversation.messages.length,
    })

    return lines.join('\n')
  }

  // Check if conversation has history that can be used for context recovery
  hasHistoryForRecovery(): boolean {
    const conversation = this.store.activeConversationId
      ? this.store.conversations.find(c => c.id === this.store.activeConversationId)
      : null

    return !!conversation && conversation.messages.length > 0
  }
}
