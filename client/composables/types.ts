// Shared types for Claude DevTools client

export interface ContentBlock {
  type: 'text' | 'tool_use' | 'tool_result' | 'thinking'
  text?: string
  thinking?: string
  id?: string
  name?: string
  input?: Record<string, unknown>
  tool_use_id?: string
  content?: string | unknown[]
  is_error?: boolean
}

export interface Message {
  id: string
  role: 'user' | 'assistant' | 'system'
  content: string
  contentBlocks?: ContentBlock[]
  timestamp: Date | string
  streaming?: boolean
  model?: string
  // Collaborative sharing
  senderId?: string
  senderNickname?: string
}

export interface ShareUser {
  id: string
  nickname: string
  joinedAt: string
  lastSeen: string
}

export interface Conversation {
  id: string
  title?: string
  messages: Message[]
  createdAt: string
  updatedAt: string
  projectPath: string
}

export interface DocFile {
  path: string
  name: string
}

export interface SlashCommand {
  name: string
  description?: string
}
