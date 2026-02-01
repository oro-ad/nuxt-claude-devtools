import { computed, ref } from 'vue'
import type { Socket } from 'socket.io-client'
import type { ShareUser } from '../types'
import {
  STORAGE_KEY_NICKNAME,
  STORAGE_KEY_USER_ID,
  URL_PARAM_SHARE,
  URL_PARAM_SHARE_NICKNAME,
} from '../constants'

interface ShareOptions {
  /** Get tunnel URL for share links */
  getTunnelUrl?: () => string | null
  /** Log function */
  log?: (...args: unknown[]) => void
}

export function useShare(options: ShareOptions = {}) {
  const { log = () => {} } = options

  const userId = ref<string | null>(null)
  const nickname = ref<string | null>(null)
  const users = ref<ShareUser[]>([])
  const showNicknameModal = ref(false)
  const nicknameError = ref<string | null>(null)
  const isShareMode = computed(() => users.value.length > 1)
  const wasInvited = ref(false)
  const sharingActiveOnServer = ref(false)
  const nicknameFromUrl = ref(false) // Track if nickname came from URL

  function generateId(): string {
    return Math.random().toString(36).substring(2, 10)
  }

  // Get share parameters from URL
  function getShareParamsFromUrl(): { shareId: string | null, shareNickname: string | null } {
    if (typeof window === 'undefined') return { shareId: null, shareNickname: null }

    const params = new URLSearchParams(window.location.search)
    return {
      shareId: params.get(URL_PARAM_SHARE),
      shareNickname: params.get(URL_PARAM_SHARE_NICKNAME),
    }
  }

  // Clean share params from URL
  function cleanShareParamsFromUrl() {
    if (typeof window === 'undefined') return

    const url = new URL(window.location.href)
    let changed = false

    if (url.searchParams.has(URL_PARAM_SHARE)) {
      url.searchParams.delete(URL_PARAM_SHARE)
      changed = true
    }
    if (url.searchParams.has(URL_PARAM_SHARE_NICKNAME)) {
      url.searchParams.delete(URL_PARAM_SHARE_NICKNAME)
      changed = true
    }

    if (changed) {
      window.history.replaceState({}, '', url.toString())
    }
  }

  // Initialize share - get or create user ID, handle URL nickname
  function initShare() {
    if (typeof window === 'undefined') return

    const { shareId, shareNickname } = getShareParamsFromUrl()

    // Handle user ID from URL (invited user)
    if (shareId) {
      userId.value = shareId
      wasInvited.value = true
      localStorage.setItem(STORAGE_KEY_USER_ID, shareId)
      log('Invited user ID:', shareId)
    }
    else {
      // Check localStorage for existing ID
      const storedUserId = localStorage.getItem(STORAGE_KEY_USER_ID)
      if (storedUserId) {
        userId.value = storedUserId
      }
      else {
        const newId = generateId()
        userId.value = newId
        localStorage.setItem(STORAGE_KEY_USER_ID, newId)
        log('Generated new user ID:', newId)
      }
    }

    // Handle nickname from URL (auto-save without modal)
    if (shareNickname) {
      nickname.value = shareNickname
      localStorage.setItem(STORAGE_KEY_NICKNAME, shareNickname)
      nicknameFromUrl.value = true
      log('Nickname from URL:', shareNickname)
    }
    else {
      // Load nickname from localStorage
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

    const inviteeId = generateId()

    // Get base URL - prefer tunnel, then current window origin
    let baseUrl: string
    const tunnelUrl = options.getTunnelUrl?.()
    if (tunnelUrl) {
      baseUrl = tunnelUrl
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

  // Check if user needs nickname for sending message
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
    registerUser,
    setupSocketListeners,
    getNicknameById,
    isOwnMessage,
    copyShareLink,
  }
}
