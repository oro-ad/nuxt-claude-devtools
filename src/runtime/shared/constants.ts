/**
 * Shared constants for Claude DevTools
 * Used by server, client, and overlay
 */

// ============ Routes ============

/**
 * Socket.IO endpoint path for real-time communication
 */
export const SOCKET_PATH = '/__claude_devtools_socket'

/**
 * DevTools UI iframe route
 */
export const DEVTOOLS_UI_ROUTE = '/__claude-devtools'

// ============ LocalStorage Keys ============

/**
 * Unique user identifier for collaborative sessions
 */
export const STORAGE_KEY_USER_ID = 'claude-devtools-user-id'

/**
 * User's display name for collaborative sessions
 */
export const STORAGE_KEY_NICKNAME = 'claude-devtools-nickname'

// ============ URL Parameters ============

/**
 * URL parameter for sharing collaborative session links
 */
export const URL_PARAM_SHARE = 'oro_share'

/**
 * URL parameter for auto-setting nickname from share link
 */
export const URL_PARAM_SHARE_NICKNAME = 'oro_share_nickname'
