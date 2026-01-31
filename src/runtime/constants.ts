/**
 * Shared constants for nuxt-claude-devtools
 * Used by both server and client code
 */

// ============ Routes ============

/**
 * Socket.IO endpoint path for real-time communication
 * Used by: socket.io plugin, useClaudeChat, all page components
 */
export const SOCKET_PATH = '/__claude_devtools_socket'

/**
 * DevTools UI iframe route
 * Used by: devtools.ts, nuxt.config, useComponentPicker
 */
export const DEVTOOLS_UI_ROUTE = '/__claude-devtools'

// ============ LocalStorage Keys ============

/**
 * Unique user identifier for collaborative sessions
 * Stored in localStorage, generated on first visit
 */
export const STORAGE_KEY_USER_ID = 'claude-devtools-user-id'

/**
 * User's display name for collaborative sessions
 * Stored in localStorage after user sets nickname
 */
export const STORAGE_KEY_NICKNAME = 'claude-devtools-nickname'

// ============ URL Parameters ============

/**
 * URL parameter for sharing collaborative session links
 * Contains the invitee's unique ID
 */
export const URL_PARAM_SHARE = 'oro_share'
