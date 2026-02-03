// Content block types matching Claude CLI stream-json format

export interface TextBlock {
  type: 'text'
  text: string
}

export interface ToolUseBlock {
  type: 'tool_use'
  id: string
  name: string
  input: Record<string, unknown>
}

export interface ToolResultBlock {
  type: 'tool_result'
  tool_use_id: string
  content: string | unknown[]
  is_error?: boolean
}

export interface ThinkingBlock {
  type: 'thinking'
  thinking: string
}

export type ContentBlock = TextBlock | ToolUseBlock | ToolResultBlock | ThinkingBlock

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

// Enhanced Message interface
export interface Message {
  id: string
  role: 'user' | 'assistant' | 'system'
  content: string // Plain text (backward compatible)
  contentBlocks?: ContentBlock[] // Structured content
  timestamp: Date | string // Allow string for JSON serialization
  streaming?: boolean
  model?: string
  // Collaborative sharing
  senderId?: string
  senderNickname?: string
  // Image attachments
  attachments?: MessageAttachment[]
}

// Conversation/Session type for history storage
export interface Conversation {
  id: string
  title?: string // Auto-generated from first user message
  messages: Message[]
  createdAt: string
  updatedAt: string
  projectPath: string
  claudeSessionId?: string // Claude CLI session ID for --resume
}

// History file structure
export interface HistoryStore {
  version: 1
  conversations: Conversation[]
  activeConversationId: string | null
}

// Claude CLI stream-json event types
export interface StreamEventBase {
  type: string
}

export interface MessageStartEvent extends StreamEventBase {
  type: 'message_start'
  message: {
    id: string
    type: 'message'
    role: 'assistant'
    model: string
    content: unknown[]
  }
}

export interface ContentBlockStartEvent extends StreamEventBase {
  type: 'content_block_start'
  index: number
  content_block: {
    type: 'text' | 'tool_use' | 'thinking'
    id?: string // For tool_use
    name?: string // For tool_use
    input?: Record<string, unknown> // For tool_use
    text?: string // For text
    thinking?: string // For thinking
  }
}

export interface ContentBlockDeltaEvent extends StreamEventBase {
  type: 'content_block_delta'
  index: number
  delta: {
    type: 'text_delta' | 'input_json_delta' | 'thinking_delta'
    text?: string
    partial_json?: string
    thinking?: string
  }
}

export interface ContentBlockStopEvent extends StreamEventBase {
  type: 'content_block_stop'
  index: number
}

export interface MessageDeltaEvent extends StreamEventBase {
  type: 'message_delta'
  delta: {
    stop_reason: 'end_turn' | 'tool_use' | 'max_tokens'
  }
  usage?: {
    output_tokens: number
  }
}

export interface MessageStopEvent extends StreamEventBase {
  type: 'message_stop'
}

export interface PingEvent extends StreamEventBase {
  type: 'ping'
}

export interface ErrorEvent extends StreamEventBase {
  type: 'error'
  error: {
    type: string
    message: string
  }
}

// Result event from Claude Code CLI (different from API)
export interface ResultEvent extends StreamEventBase {
  type: 'result'
  subtype: 'success' | 'error'
  result?: string
  error?: string
  session_id?: string
  cost_usd?: number
  duration_ms?: number
  duration_api_ms?: number
  is_error?: boolean
  num_turns?: number
  total_cost_usd?: number
}

// System event from Claude Code CLI
export interface SystemEvent extends StreamEventBase {
  type: 'system'
  subtype: string
  message?: string
}

// Assistant event from Claude Code CLI (for text content)
export interface AssistantEvent extends StreamEventBase {
  type: 'assistant'
  message: {
    id: string
    type: 'message'
    role: 'assistant'
    content: Array<{
      type: 'text' | 'tool_use'
      text?: string
      id?: string
      name?: string
      input?: Record<string, unknown>
    }>
    model: string
    stop_reason: string
    stop_sequence: null | string
  }
  session_id: string
}

// Tool use and result events from Claude Code CLI
export interface ToolUseEvent extends StreamEventBase {
  type: 'tool_use'
  tool_use_id: string
  name: string
  input: Record<string, unknown>
}

export interface ToolResultEvent extends StreamEventBase {
  type: 'tool_result'
  tool_use_id: string
  name?: string
  content: string | unknown[]
  is_error?: boolean
}

export type StreamEvent
  = MessageStartEvent
    | ContentBlockStartEvent
    | ContentBlockDeltaEvent
    | ContentBlockStopEvent
    | MessageDeltaEvent
    | MessageStopEvent
    | PingEvent
    | ErrorEvent
    | ResultEvent
    | SystemEvent
    | AssistantEvent
    | ToolUseEvent
    | ToolResultEvent
