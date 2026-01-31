import { existsSync, mkdirSync, readdirSync, readFileSync, statSync, unlinkSync, writeFileSync } from 'node:fs'
import { basename, dirname, join, relative } from 'node:path'
import { createLogger } from '../logger'
import { CLAUDE_DIR, CLAUDE_MD_FILE, DEVTOOLS_DATA_DIR, DOCS_SUBDIR, LLMS_FILE, SETTINGS_FILE } from './constants'

const log = createLogger('docs', { timestamp: true })

// Files that trigger Nuxt restart when modified
export const CRITICAL_FILES = [
  'nuxt.config.ts',
  'nuxt.config.js',
  'app.config.ts',
  'app.config.js',
  '.nuxtrc',
  'tsconfig.json',
] as const

// Check if a file path is a critical config file
export function isCriticalFile(filePath: string): boolean {
  const fileName = basename(filePath)
  return CRITICAL_FILES.includes(fileName as typeof CRITICAL_FILES[number])
}

// Get critical file name from path (for display)
export function getCriticalFileName(filePath: string): string | null {
  const fileName = basename(filePath)
  if (CRITICAL_FILES.includes(fileName as typeof CRITICAL_FILES[number])) {
    return fileName
  }
  return null
}

export interface DocFile {
  path: string // Relative path from docs dir (e.g., "api/endpoints.md")
  name: string // File name without extension
  content: string
  updatedAt: string
}

export interface LlmsSource {
  url: string // e.g., "https://example.com/llms.txt"
  domain: string // e.g., "example.com"
  title?: string // Optional title from meta
  description?: string // Optional description
  addedAt: string
}

export interface LlmsStore {
  version: 1
  sources: LlmsSource[]
}

export class DocsManager {
  private docsDir: string
  private llmsPath: string
  private projectPath: string

  constructor(projectPath: string) {
    this.projectPath = projectPath
    // Use standard Claude docs directory
    this.docsDir = join(projectPath, CLAUDE_DIR, DOCS_SUBDIR)
    this.llmsPath = join(projectPath, DEVTOOLS_DATA_DIR, LLMS_FILE)

    // Ensure docs directory exists
    if (!existsSync(this.docsDir)) {
      mkdirSync(this.docsDir, { recursive: true })
      log('Created docs directory', { path: this.docsDir })
    }
  }

  // ============ Doc Files ============

  // Get all doc files recursively
  getDocFiles(): DocFile[] {
    const files: DocFile[] = []
    this.scanDirectory(this.docsDir, files)
    return files.sort((a, b) => a.path.localeCompare(b.path))
  }

  private scanDirectory(dir: string, files: DocFile[]): void {
    if (!existsSync(dir)) return

    const entries = readdirSync(dir)
    for (const entry of entries) {
      const fullPath = join(dir, entry)
      const stat = statSync(fullPath)

      if (stat.isDirectory()) {
        this.scanDirectory(fullPath, files)
      }
      else if (entry.endsWith('.md')) {
        const relativePath = relative(this.docsDir, fullPath)
        const content = readFileSync(fullPath, 'utf-8')
        files.push({
          path: relativePath,
          name: basename(entry, '.md'),
          content,
          updatedAt: stat.mtime.toISOString(),
        })
      }
    }
  }

  // Get single doc file
  getDocFile(relativePath: string): DocFile | null {
    const fullPath = join(this.docsDir, relativePath)
    if (!existsSync(fullPath)) return null

    const stat = statSync(fullPath)
    const content = readFileSync(fullPath, 'utf-8')

    return {
      path: relativePath,
      name: basename(relativePath, '.md'),
      content,
      updatedAt: stat.mtime.toISOString(),
    }
  }

  // Create or update doc file
  saveDocFile(relativePath: string, content: string): DocFile {
    // Ensure path ends with .md
    if (!relativePath.endsWith('.md')) {
      relativePath += '.md'
    }

    const fullPath = join(this.docsDir, relativePath)
    const dir = dirname(fullPath)

    // Ensure directory exists
    if (!existsSync(dir)) {
      mkdirSync(dir, { recursive: true })
    }

    writeFileSync(fullPath, content, 'utf-8')
    log('Saved doc file', { path: relativePath })

    return {
      path: relativePath,
      name: basename(relativePath, '.md'),
      content,
      updatedAt: new Date().toISOString(),
    }
  }

  // Delete doc file
  deleteDocFile(relativePath: string): boolean {
    const fullPath = join(this.docsDir, relativePath)
    if (!existsSync(fullPath)) return false

    unlinkSync(fullPath)
    log('Deleted doc file', { path: relativePath })
    return true
  }

  // ============ CLAUDE.md ============

  private get claudeMdPath(): string {
    return join(this.projectPath, CLAUDE_MD_FILE)
  }

  // Get CLAUDE.md content
  getClaudeMd(): { content: string, exists: boolean, updatedAt: string | null } {
    const path = this.claudeMdPath
    if (!existsSync(path)) {
      return { content: '', exists: false, updatedAt: null }
    }

    const stat = statSync(path)
    const content = readFileSync(path, 'utf-8')
    return {
      content,
      exists: true,
      updatedAt: stat.mtime.toISOString(),
    }
  }

  // Save CLAUDE.md content
  saveClaudeMd(content: string): { content: string, exists: boolean, updatedAt: string } {
    writeFileSync(this.claudeMdPath, content, 'utf-8')
    log('Saved CLAUDE.md')
    return {
      content,
      exists: true,
      updatedAt: new Date().toISOString(),
    }
  }

  // Section markers for auto-generated content
  private static readonly CRITICAL_FILES_START = '<!-- NUXT-DEVTOOLS:CRITICAL-FILES -->'
  private static readonly CRITICAL_FILES_END = '<!-- /NUXT-DEVTOOLS:CRITICAL-FILES -->'

  // Ensure CLAUDE.md has the critical files warning section
  // Always updates the auto-generated section on startup to ensure latest instructions
  ensureCriticalFilesSection(autoConfirm: boolean = false): void {
    const { content, exists } = this.getClaudeMd()

    const criticalFilesSection = this.generateCriticalFilesSection(autoConfirm)

    if (!exists) {
      // Create new CLAUDE.md with section
      const newContent = `# Project Guidelines\n\n${criticalFilesSection}\n`
      this.saveClaudeMd(newContent)
      log('Created CLAUDE.md with critical files section')
      return
    }

    // Check if section markers exist
    if (content.includes(DocsManager.CRITICAL_FILES_START)) {
      const startIdx = content.indexOf(DocsManager.CRITICAL_FILES_START)
      const endIdx = content.indexOf(DocsManager.CRITICAL_FILES_END)

      if (endIdx > startIdx) {
        // Always replace the section between markers with latest content
        const before = content.substring(0, startIdx)
        const after = content.substring(endIdx + DocsManager.CRITICAL_FILES_END.length)
        const newContent = before + criticalFilesSection + after
        this.saveClaudeMd(newContent)
        log('Updated critical files section in CLAUDE.md')
      }
    }
    else {
      // Append section to end
      const newContent = content.trimEnd() + '\n\n' + criticalFilesSection + '\n'
      this.saveClaudeMd(newContent)
      log('Added critical files section to CLAUDE.md')
    }
  }

  private generateCriticalFilesSection(autoConfirm: boolean): string {
    const filesList = CRITICAL_FILES.map(f => `- \`${f}\``).join('\n')
    const settingsPath = `${DEVTOOLS_DATA_DIR}/${SETTINGS_FILE}`

    return `${DocsManager.CRITICAL_FILES_START}
## ⚠️ Critical Configuration Files

The following files trigger a full Nuxt restart when modified:
${filesList}

### 🔴 MANDATORY CHECK (EVERY TIME, NO EXCEPTIONS)

**BEFORE modifying ANY of these files, you MUST:**

\`\`\`
1. READ ${settingsPath}
2. CHECK criticalFiles.autoConfirm value
3. IF false OR file missing → STOP and ASK user
4. IF true → inform user, then proceed
\`\`\`

**This check is REQUIRED every single time, even if you checked before in this session.**

### Order of Operations

1. **Complete ALL prerequisite tasks FIRST**
   - Create all new files that will be referenced
   - Install all dependencies
   - Write all related code

2. **Verify prerequisites exist**
   - All files referenced in config change must exist
   - All imports must be valid

3. **Check settings file** (read \`${settingsPath}\`)

4. **Act based on autoConfirm setting**

### Example: Adding i18n locale

\`\`\`
Step 1: Create locales/es.json           ✓ prerequisite
Step 2: Read ${settingsPath}  ✓ check flag
Step 3: If autoConfirm=false → ask user
Step 4: Update nuxt.config.ts            ✓ only after confirmation
\`\`\`

### Current Setting

**autoConfirm: ${autoConfirm ? 'ENABLED' : 'DISABLED'}**

${autoConfirm
  ? '→ Inform user about restart, no confirmation needed.'
  : '→ MUST ask user and WAIT for explicit "yes" before proceeding.'}

---
After restart, conversation history is preserved. User can send "continue" to resume.
${DocsManager.CRITICAL_FILES_END}`
  }

  // ============ LLMS Sources ============

  private loadLlmsStore(): LlmsStore {
    try {
      if (existsSync(this.llmsPath)) {
        const data = readFileSync(this.llmsPath, 'utf-8')
        return JSON.parse(data) as LlmsStore
      }
    }
    catch (error) {
      log('Failed to load llms store', { error })
    }

    return {
      version: 1,
      sources: [],
    }
  }

  private saveLlmsStore(store: LlmsStore): void {
    const dir = dirname(this.llmsPath)
    if (!existsSync(dir)) {
      mkdirSync(dir, { recursive: true })
    }
    writeFileSync(this.llmsPath, JSON.stringify(store, null, 2))
    log('Saved llms store')
  }

  // Get all LLMS sources
  getLlmsSources(): LlmsSource[] {
    return this.loadLlmsStore().sources
  }

  // Add LLMS source
  addLlmsSource(url: string, title?: string, description?: string): LlmsSource {
    const store = this.loadLlmsStore()

    // Extract domain from URL
    let domain: string
    try {
      const urlObj = new URL(url)
      domain = urlObj.hostname
    }
    catch {
      domain = url.replace(/^https?:\/\//, '').split('/')[0]
    }

    // Check if already exists
    const existing = store.sources.find(s => s.url === url)
    if (existing) {
      // Update metadata
      existing.title = title || existing.title
      existing.description = description || existing.description
      this.saveLlmsStore(store)
      return existing
    }

    const source: LlmsSource = {
      url,
      domain,
      title,
      description,
      addedAt: new Date().toISOString(),
    }

    store.sources.push(source)
    this.saveLlmsStore(store)
    log('Added LLMS source', { url, domain })

    return source
  }

  // Remove LLMS source
  removeLlmsSource(url: string): boolean {
    const store = this.loadLlmsStore()
    const index = store.sources.findIndex(s => s.url === url)

    if (index === -1) return false

    store.sources.splice(index, 1)
    this.saveLlmsStore(store)
    log('Removed LLMS source', { url })

    return true
  }

  // Update LLMS source metadata
  updateLlmsSource(url: string, updates: { title?: string, description?: string }): LlmsSource | null {
    const store = this.loadLlmsStore()
    const source = store.sources.find(s => s.url === url)

    if (!source) return null

    if (updates.title !== undefined) source.title = updates.title
    if (updates.description !== undefined) source.description = updates.description

    this.saveLlmsStore(store)
    return source
  }
}
