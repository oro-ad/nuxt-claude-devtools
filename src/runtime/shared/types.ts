/**
 * Shared types for Claude DevTools
 * Used by both DevTools client and Overlay
 */

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
  // Image attachments
  attachments?: MessageAttachment[]
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

export interface ShareUser {
  id: string
  nickname: string
  joinedAt: string
  lastSeen: string
}

// Message context types
export interface MessageContextData {
  viewport?: {
    width: number
    height: number
  }
  userAgent?: string
  routing?: {
    path: string
    fullPath?: string
    query?: Record<string, string | string[]>
    params?: Record<string, string>
    name?: string
    pageComponent?: string
  }
  components?: string[]
}

export interface ContextChip {
  id: 'viewport' | 'user-agent' | 'routing'
  label: string
  icon: string
  active: boolean
}

// Image attachment types
export interface ImageAttachment {
  id: string
  filename: string
  mimeType: string
  data: string // base64
  size: number // bytes
}

export interface MessageAttachment {
  type: 'image'
  path: string // relative path in project
  filename: string
  mimeType: string
}
