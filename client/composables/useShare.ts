import { computed, ref } from 'vue'
import type { Socket } from 'socket.io-client'
import type { ShareUser } from './types'
import { STORAGE_KEY_NICKNAME, STORAGE_KEY_USER_ID, URL_PARAM_SHARE } from '../constants'

interface ShareOptions {
  getTunnelUrl?: () => { isActive: boolean, origin: string | null }
  getHostRoute?: () => { query?: Record<string, string | string[] | undefined> } | undefined
}

export function useShare(options: ShareOptions = {}) {
  const userId = ref<string | null>(null) // Unique user identifier
  const nickname = ref<string | null>(null)
  const users = ref<ShareUser[]>([])
  const showNicknameModal = ref(false)
  const isShareMode = computed(() => users.value.length > 1)
  const wasInvited = ref(false) // Track if user came via share link
  const sharingActiveOnServer = ref(false) // Track if sharing is active on server

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

  // Initialize - get or create user ID
  function initShare() {
    if (typeof window === 'undefined') return

    // Check URL first - if share param exists, this is an invited user
    const urlUserId = getUserIdFromUrl()
    if (urlUserId) {
      // This user was invited - use the ID from URL
      userId.value = urlUserId
      wasInvited.value = true
      localStorage.setItem(STORAGE_KEY_USER_ID, urlUserId)

      // Clean current window URL if it has the param
      if (window.location.search.includes(URL_PARAM_SHARE)) {
        const url = new URL(window.location.href)
        url.searchParams.delete(URL_PARAM_SHARE)
        window.history.replaceState({}, '', url.toString())
      }
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

    // Load nickname (check for non-empty string)
    const storedNickname = localStorage.getItem(STORAGE_KEY_NICKNAME)
    if (storedNickname && storedNickname.trim()) {
      nickname.value = storedNickname
    }
  }

  // Create share link with NEW ID for the invited person
  function createShareLink(): string {
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
    return url.toString()
  }

  // Set nickname
  function setNickname(name: string) {
    nickname.value = name
    if (typeof window !== 'undefined') {
      localStorage.setItem(STORAGE_KEY_NICKNAME, name)
    }
  }

  // Check if user needs nickname immediately (invited via URL)
  function needsNicknameImmediate(): boolean {
    return wasInvited.value && !nickname.value
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
      if (typeof window !== 'undefined') {
        localStorage.setItem(STORAGE_KEY_NICKNAME, user.nickname)
      }
    })

    socket.on('share:nickname_taken', () => {
      // Nickname is taken, show modal again
      showNicknameModal.value = true
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
  async function copyShareLink(): Promise<boolean> {
    const link = createShareLink()
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
    isShareMode,
    wasInvited,
    sharingActiveOnServer,
    initShare,
    createShareLink,
    setNickname,
    needsNicknameImmediate,
    needsNicknameForMessage,
    needsNicknameForShare,
    checkSharingStatus,
    registerUser,
    setupSocketListeners,
    getNicknameById,
    isOwnMessage,
    copyShareLink,
  }
}
