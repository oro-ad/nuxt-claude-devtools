import { computed, ref } from 'vue'
import type { Socket } from 'socket.io-client'
import type { ShareUser } from '../types'
import {
  STORAGE_KEY_NICKNAME,
  STORAGE_KEY_USER_ID,
  URL_PARAM_SHARE,
  URL_PARAM_SHARE_NICKNAME,
} from '../constants'

export interface ShareOptions {
  /**
   * Get URL parameter value (context-specific)
   * For overlay: just check window.location
   * For DevTools: check window, parent window, host route
   */
  getUrlParam?: (param: string) => string | null
  /**
   * Get base URL for share links (context-specific)
   * For overlay: use tunnel URL or window.location.origin
   * For DevTools: use tunnel URL, parent window, or window.location.origin
   */
  getBaseUrl?: () => string
  /** Log function */
  log?: (...args: unknown[]) => void
}

// Default implementations for simple contexts (like overlay)
function defaultGetUrlParam(param: string): string | null {
  if (typeof window === 'undefined') return null
  const params = new URLSearchParams(window.location.search)
  return params.get(param)
}

function defaultGetBaseUrl(): string {
  if (typeof window === 'undefined') return ''
  return window.location.origin
}

export function useShare(options: ShareOptions = {}) {
  const {
    getUrlParam = defaultGetUrlParam,
    getBaseUrl = defaultGetBaseUrl,
    log = () => {},
  } = options

  // State
  const userId = ref<string | null>(null)
  const nickname = ref<string | null>(null)
  const users = ref<ShareUser[]>([])
  const showNicknameModal = ref(false)
  const nicknameError = ref<string | null>(null)
  const isShareMode = computed(() => users.value.length > 1)
  const wasInvited = ref(false)
  const sharingActiveOnServer = ref(false)
  const nicknameFromUrl = ref(false)

  // Helpers
  function generateId(): string {
    return Math.random().toString(36).substring(2, 10)
  }

  function getUserIdFromUrl(): string | null {
    return getUrlParam(URL_PARAM_SHARE)
  }

  function getNicknameFromUrl(): string | null {
    return getUrlParam(URL_PARAM_SHARE_NICKNAME)
  }

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

    const urlUserId = getUserIdFromUrl()
    const urlNickname = getNicknameFromUrl()

    log('initShare', { urlUserId, urlNickname })

    if (urlUserId) {
      userId.value = urlUserId
      wasInvited.value = true
      localStorage.setItem(STORAGE_KEY_USER_ID, urlUserId)
    }
    else {
      const storedUserId = localStorage.getItem(STORAGE_KEY_USER_ID)
      if (storedUserId) {
        userId.value = storedUserId
      }
      else {
        const newId = generateId()
        userId.value = newId
        localStorage.setItem(STORAGE_KEY_USER_ID, newId)
      }
    }

    if (urlNickname) {
      nickname.value = urlNickname
      localStorage.setItem(STORAGE_KEY_NICKNAME, urlNickname)
      nicknameFromUrl.value = true
    }
    else {
      const storedNickname = localStorage.getItem(STORAGE_KEY_NICKNAME)
      if (storedNickname && storedNickname.trim()) {
        nickname.value = storedNickname
      }
    }

    cleanShareParamsFromUrl()
  }

  // Create share link with NEW ID for the invited person
  function createShareLink(includeNickname = false): string {
    if (typeof window === 'undefined') return ''

    const inviteeId = generateId()
    const baseUrl = getBaseUrl()

    const url = new URL(baseUrl)
    url.searchParams.set(URL_PARAM_SHARE, inviteeId)

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

  // Sync existing credentials with server
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
      nickname.value = user.nickname
      nicknameError.value = null
      showNicknameModal.value = false
      if (typeof window !== 'undefined') {
        localStorage.setItem(STORAGE_KEY_NICKNAME, user.nickname)
      }
    })

    socket.on('share:nickname_taken', () => {
      nicknameError.value = 'This nickname is already taken'
      showNicknameModal.value = true
    })

    socket.on('share:synced', (data: { user: ShareUser | null, status: 'exists' | 'registered' | 'nickname_conflict' }) => {
      if (data.status === 'nickname_conflict') {
        nickname.value = null
        if (typeof window !== 'undefined') {
          localStorage.removeItem(STORAGE_KEY_NICKNAME)
        }
        nicknameError.value = 'Your nickname is already used by another user in this project'
        showNicknameModal.value = true
      }
      else if (data.user) {
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
    if (!senderId || !userId.value) return true
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
    // State
    userId,
    nickname,
    users,
    showNicknameModal,
    nicknameError,
    isShareMode,
    wasInvited,
    sharingActiveOnServer,
    nicknameFromUrl,

    // Methods
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
