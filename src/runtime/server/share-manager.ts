import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { createLogger } from '../logger'
import { DEVTOOLS_DATA_DIR, SHARE_FILE } from './constants'

const log = createLogger('share', { timestamp: true })

export interface ShareUser {
  id: string
  nickname: string
  joinedAt: string
  lastSeen: string
}

export interface ShareStore {
  version: 1
  users: ShareUser[]
}

export class ShareManager {
  private storePath: string

  constructor(projectPath: string) {
    this.storePath = join(projectPath, DEVTOOLS_DATA_DIR, SHARE_FILE)
  }

  private loadStore(): ShareStore {
    try {
      if (existsSync(this.storePath)) {
        const data = readFileSync(this.storePath, 'utf-8')
        return JSON.parse(data) as ShareStore
      }
    }
    catch (error) {
      log('Failed to load share store', { error })
    }

    return {
      version: 1,
      users: [],
    }
  }

  private saveStore(store: ShareStore): void {
    const dir = dirname(this.storePath)
    if (!existsSync(dir)) {
      mkdirSync(dir, { recursive: true })
    }
    writeFileSync(this.storePath, JSON.stringify(store, null, 2))
    log('Saved share store')
  }

  // Get all users
  getUsers(): ShareUser[] {
    return this.loadStore().users
  }

  // Get user by ID
  getUser(id: string): ShareUser | null {
    const store = this.loadStore()
    return store.users.find(u => u.id === id) || null
  }

  // Get user by nickname
  getUserByNickname(nickname: string): ShareUser | null {
    const store = this.loadStore()
    return store.users.find(u => u.nickname.toLowerCase() === nickname.toLowerCase()) || null
  }

  // Register or update user
  registerUser(id: string, nickname: string): ShareUser {
    const store = this.loadStore()
    const existingIndex = store.users.findIndex(u => u.id === id)
    const now = new Date().toISOString()

    if (existingIndex >= 0) {
      // Update existing user
      store.users[existingIndex].nickname = nickname
      store.users[existingIndex].lastSeen = now
      this.saveStore(store)
      log('Updated user', { id, nickname })
      return store.users[existingIndex]
    }

    // Create new user
    const user: ShareUser = {
      id,
      nickname,
      joinedAt: now,
      lastSeen: now,
    }
    store.users.push(user)
    this.saveStore(store)
    log('Registered new user', { id, nickname })
    return user
  }

  // Update last seen
  updateLastSeen(id: string): void {
    const store = this.loadStore()
    const user = store.users.find(u => u.id === id)
    if (user) {
      user.lastSeen = new Date().toISOString()
      this.saveStore(store)
    }
  }

  // Check if nickname is available
  isNicknameAvailable(nickname: string, excludeId?: string): boolean {
    const store = this.loadStore()
    const existing = store.users.find(
      u => u.nickname.toLowerCase() === nickname.toLowerCase() && u.id !== excludeId,
    )
    return !existing
  }

  // Check if sharing is active (has registered users)
  isActive(): boolean {
    const store = this.loadStore()
    return store.users.length > 0
  }

  // Generate user ID
  static generateUserId(): string {
    return Math.random().toString(36).substring(2, 10)
  }
}
