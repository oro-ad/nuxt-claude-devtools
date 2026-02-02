import { computed, ref } from 'vue'
import type { Socket } from 'socket.io-client'
import type { ShareUser } from './types'
import {
  STORAGE_KEY_NICKNAME,
  STORAGE_KEY_USER_ID,
  URL_PARAM_SHARE,
  URL_PARAM_SHARE_NICKNAME,
} from '../constants'

interface ShareOptions {
  getTunnelUrl?: () => { isActive: boolean, origin: string | null }
  getHostRoute?: () => { query?: Record<string, string | string[] | undefined> } | undefined
}

export function useShare(options: ShareOptions = {}) {
  const userId = ref<string | null>(null) // Unique user identifier
  const nickname = ref<string | null>(null)
  const users = ref<ShareUser[]>([])
  const showNicknameModal = ref(false)
  const nicknameError = ref<string | null>(null)
  const isShareMode = computed(() => users.value.length > 1)
  const wasInvited = ref(false) // Track if user came via share link
  const sharingActiveOnServer = ref(false) // Track if sharing is active on server
  const nicknameFromUrl = ref(false) // Track if nickname came from URL

  // Generate random ID
  function generateId(): string {
    return Math.random().toString(36).substring(2, 10)
  }

  // Get user ID from URL (for invited users)
  // Check current window, parent window, and host app route (via DevTools client)
  function getUserIdFromUrl(): string | null {
    if (typeof window === 'undefined') return null

    // First check current window
    let params = new URLSearchParams(window.location.search)
    let oroShare = params.get(URL_PARAM_SHARE)
    if (oroShare) return oroShare

    // Check host app route via DevTools client (most reliable for iframe context)
    const hostRoute = options.getHostRoute?.()
    if (hostRoute?.query?.[URL_PARAM_SHARE]) {
      oroShare = Array.isArray(hostRoute.query[URL_PARAM_SHARE])
        ? hostRoute.query[URL_PARAM_SHARE][0]
        : hostRoute.query[URL_PARAM_SHARE]
      if (oroShare) return oroShare
    }

    // Fallback: try parent window URL
    if (window.parent !== window) {
      try {
        params = new URLSearchParams(window.parent.location.search)
        oroShare = params.get(URL_PARAM_SHARE)
        if (oroShare) return oroShare
      }
      catch {
        // Cross-origin, can't access parent
      }
    }

    return null
  }

  // Get nickname from URL (for invited users with pre-set nickname)
  function getNicknameFromUrl(): string | null {
    if (typeof window === 'undefined') return null

    // First check current window
    let params = new URLSearchParams(window.location.search)
    let shareNickname = params.get(URL_PARAM_SHARE_NICKNAME)
    if (shareNickname) return shareNickname

    // Check host app route via DevTools client
    const hostRoute = options.getHostRoute?.()
    if (hostRoute?.query?.[URL_PARAM_SHARE_NICKNAME]) {
      shareNickname = Array.isArray(hostRoute.query[URL_PARAM_SHARE_NICKNAME])
        ? hostRoute.query[URL_PARAM_SHARE_NICKNAME][0]
        : hostRoute.query[URL_PARAM_SHARE_NICKNAME]
      if (shareNickname) return shareNickname
    }

    // Fallback: try parent window URL
    if (window.parent !== window) {
      try {
        params = new URLSearchParams(window.parent.location.search)
        shareNickname = params.get(URL_PARAM_SHARE_NICKNAME)
        if (shareNickname) return shareNickname
      }
      catch {
        // Cross-origin, can't access parent
      }
    }

    return null
  }

  // Clean share params from URL
  function cleanShareParamsFromUrl() {
    if (typeof window === 'undefined') return

    if (window.location.search.includes(URL_PARAM_SHARE) || window.location.search.includes(URL_PARAM_SHARE_NICKNAME)) {
      const url = new URL(window.location.href)
      url.searchParams.delete(URL_PARAM_SHARE)
      url.searchParams.delete(URL_PARAM_SHARE_NICKNAME)
      window.history.replaceState({}, '', url.toString())
    }
  }

  // Initialize - get or create user ID
  function initShare() {
    if (typeof window === 'undefined') return

    // Check URL first - if share param exists, this is an invited user
    const urlUserId = getUserIdFromUrl()
    const urlNickname = getNicknameFromUrl()

    if (urlUserId) {
      // This user was invited - use the ID from URL
      userId.value = urlUserId
      wasInvited.value = true
      localStorage.setItem(STORAGE_KEY_USER_ID, urlUserId)
    }
    else {
      // Check localStorage for existing ID
      const storedUserId = localStorage.getItem(STORAGE_KEY_USER_ID)
      if (storedUserId) {
        userId.value = storedUserId
      }
      else {
        // Generate new ID for this user
        const newId = generateId()
        userId.value = newId
        localStorage.setItem(STORAGE_KEY_USER_ID, newId)
      }
    }

    // Handle nickname from URL (auto-save without modal)
    if (urlNickname) {
      nickname.value = urlNickname
      localStorage.setItem(STORAGE_KEY_NICKNAME, urlNickname)
      nicknameFromUrl.value = true
    }
    else {
      // Load nickname from localStorage (check for non-empty string)
      const storedNickname = localStorage.getItem(STORAGE_KEY_NICKNAME)
      if (storedNickname && storedNickname.trim()) {
        nickname.value = storedNickname
      }
    }

    // Clean URL params
    cleanShareParamsFromUrl()
  }

  // Create share link with NEW ID for the invited person
  function createShareLink(includeNickname = false): string {
    if (typeof window === 'undefined') return ''

    // Generate a NEW unique ID for the person who will open this link
    const inviteeId = generateId()

    // Get the base URL - prefer tunnel URL, then parent window, then current
    let baseUrl: string

    // Try tunnel URL first
    const tunnel = options.getTunnelUrl?.()
    if (tunnel?.isActive && tunnel.origin) {
      baseUrl = tunnel.origin
    }
    // Try parent window (if we're in an iframe like DevTools)
    else if (window.parent !== window) {
      try {
        baseUrl = window.parent.location.origin
      }
      catch {
        // Cross-origin, fall back to current
        baseUrl = window.location.origin
      }
    }
    else {
      baseUrl = window.location.origin
    }

    const url = new URL(baseUrl)
    url.searchParams.set(URL_PARAM_SHARE, inviteeId)

    // Optionally include nickname in link
    if (includeNickname && nickname.value) {
      url.searchParams.set(URL_PARAM_SHARE_NICKNAME, nickname.value)
    }

    return url.toString()
  }

  // Set nickname
  function setNickname(name: string) {
    nickname.value = name
    nicknameError.value = null
    if (typeof window !== 'undefined') {
      localStorage.setItem(STORAGE_KEY_NICKNAME, name)
    }
  }

  // Check if user needs nickname immediately (invited via URL, no nickname from URL)
  function needsNicknameImmediate(): boolean {
    return wasInvited.value && !nickname.value && !nicknameFromUrl.value
  }

  // Check if user needs nickname for sending message (sharing active on server)
  function needsNicknameForMessage(): boolean {
    return sharingActiveOnServer.value && !nickname.value
  }

  // Check if user needs nickname for sharing
  function needsNicknameForShare(): boolean {
    return !nickname.value
  }

  // Check sharing status from server
  function checkSharingStatus(socket: Socket | null) {
    if (!socket) return
    socket.emit('share:is_active')
  }

  // Sync existing credentials with server (for cross-project tunnel scenarios)
  // This auto-registers the user if they have localStorage credentials
  // but don't exist in the current project's share.json
  function syncCredentials(socket: Socket | null) {
    if (!socket || !userId.value || !nickname.value) return

    socket.emit('share:sync', {
      userId: userId.value,
      nickname: nickname.value,
    })
  }

  // Register user on server
  function registerUser(socket: Socket | null) {
    if (!socket || !userId.value || !nickname.value) return

    socket.emit('share:register', {
      userId: userId.value,
      nickname: nickname.value,
    })
  }

  // Setup socket listeners
  function setupSocketListeners(socket: Socket) {
    socket.on('share:users', (data: ShareUser[]) => {
      users.value = data
      // Update sharing status based on users count
      sharingActiveOnServer.value = data.length > 0
    })

    socket.on('share:is_active', (data: { active: boolean }) => {
      sharingActiveOnServer.value = data.active
    })

    socket.on('share:user_joined', (user: ShareUser) => {
      const existingIndex = users.value.findIndex(u => u.id === user.id)
      if (existingIndex >= 0) {
        users.value[existingIndex] = user
      }
      else {
        users.value.push(user)
      }
    })

    socket.on('share:registered', (user: ShareUser) => {
      // Successfully registered
      nickname.value = user.nickname
      nicknameError.value = null
      showNicknameModal.value = false
      if (typeof window !== 'undefined') {
        localStorage.setItem(STORAGE_KEY_NICKNAME, user.nickname)
      }
    })

    socket.on('share:nickname_taken', () => {
      // Nickname is taken, show modal again
      nicknameError.value = 'This nickname is already taken'
      showNicknameModal.value = true
    })

    socket.on('share:synced', (data: { user: ShareUser | null, status: 'exists' | 'registered' | 'nickname_conflict' }) => {
      if (data.status === 'nickname_conflict') {
        // Nickname from localStorage conflicts with existing user in this project
        // Clear local nickname and show modal to choose new one
        nickname.value = null
        if (typeof window !== 'undefined') {
          localStorage.removeItem(STORAGE_KEY_NICKNAME)
        }
        nicknameError.value = 'Your nickname is already used by another user in this project'
        showNicknameModal.value = true
      }
      else if (data.user) {
        // Successfully synced or already exists
        nickname.value = data.user.nickname
        if (typeof window !== 'undefined') {
          localStorage.setItem(STORAGE_KEY_NICKNAME, data.user.nickname)
        }
      }
    })
  }

  // Get nickname by ID
  function getNicknameById(id: string): string | null {
    const user = users.value.find(u => u.id === id)
    return user?.nickname || null
  }

  // Check if message is from current user
  function isOwnMessage(senderId?: string): boolean {
    if (!senderId || !userId.value) return true // Default to own message if no ID
    return senderId === userId.value
  }

  // Copy share link to clipboard
  async function copyShareLink(includeNickname = false): Promise<boolean> {
    const link = createShareLink(includeNickname)
    try {
      await navigator.clipboard.writeText(link)
      return true
    }
    catch {
      return false
    }
  }

  return {
    userId,
    nickname,
    users,
    showNicknameModal,
    nicknameError,
    isShareMode,
    wasInvited,
    sharingActiveOnServer,
    nicknameFromUrl,
    initShare,
    createShareLink,
    setNickname,
    needsNicknameImmediate,
    needsNicknameForMessage,
    needsNicknameForShare,
    checkSharingStatus,
    syncCredentials,
    registerUser,
    setupSocketListeners,
    getNicknameById,
    isOwnMessage,
    copyShareLink,
  }
}
