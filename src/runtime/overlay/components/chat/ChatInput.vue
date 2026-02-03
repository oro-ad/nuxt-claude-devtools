<script setup lang="ts">
import { computed, nextTick, onMounted, onUnmounted, ref } from 'vue'
import type { ImageAttachment, SlashCommand } from '../../../shared/types'

const props = defineProps<{
  isConnected: boolean
  isProcessing: boolean
  isRecording: boolean
  isSpeechSupported: boolean
  commands: SlashCommand[]
}>()

const emit = defineEmits<{
  submit: [message: string, attachments?: ImageAttachment[]]
  voiceInput: []
  stop: []
}>()

const inputMessage = ref('')
const textareaRef = ref<HTMLTextAreaElement | null>(null)
const inputContainerRef = ref<HTMLElement | null>(null)
const fileInputRef = ref<HTMLInputElement | null>(null)
const showCommandsAutocomplete = ref(false)
const showAttachMenu = ref(false)
const isMobile = ref(false)
const isDragOver = ref(false)

// Pending image attachments
const pendingImages = ref<ImageAttachment[]>([])

// Supported image types (for preview)
const IMAGE_TYPES = ['image/png', 'image/jpeg', 'image/jpg', 'image/gif', 'image/webp']
const MAX_FILE_SIZE = 10 * 1024 * 1024 // 10MB

// Detect mobile device
function checkMobile() {
  if (typeof window === 'undefined') return false
  return window.innerWidth <= 640 || /iPhone|iPad|iPod|Android/i.test(navigator.userAgent)
}

onMounted(() => {
  isMobile.value = checkMobile()
  window.addEventListener('resize', () => {
    isMobile.value = checkMobile()
  })
  // Global paste listener
  document.addEventListener('paste', handlePaste)
  // Close attach menu on click outside
  document.addEventListener('click', closeAttachMenuOnClickOutside)
})

onUnmounted(() => {
  window.removeEventListener('resize', () => {
    isMobile.value = checkMobile()
  })
  document.removeEventListener('paste', handlePaste)
  document.removeEventListener('click', closeAttachMenuOnClickOutside)
})

// Show send button when there's text input or images
const hasContent = computed(() => inputMessage.value.trim().length > 0 || pendingImages.value.length > 0)
const hasText = computed(() => inputMessage.value.trim().length > 0)

const filteredCommands = computed(() => {
  if (!showCommandsAutocomplete.value) return []
  const match = inputMessage.value.match(/(?:^|\s)\/(\S*)$/)
  if (!match) return []
  const query = match[1].toLowerCase()
  return props.commands.filter(cmd =>
    cmd.name.toLowerCase().includes(query),
  ).slice(0, 5)
})

function handleInput() {
  const match = inputMessage.value.match(/(?:^|\s)\/\S*$/)
  showCommandsAutocomplete.value = !!match
  autoResizeTextarea()
}

function autoResizeTextarea() {
  const textarea = textareaRef.value
  if (!textarea) return
  textarea.style.height = 'auto'
  textarea.style.height = `${Math.min(textarea.scrollHeight, 280)}px`
}

function selectCommand(cmd: SlashCommand) {
  const match = inputMessage.value.match(/(?:^|\s)(\/\S*)$/)
  if (match) {
    const slashIndex = inputMessage.value.length - match[1].length
    inputMessage.value = inputMessage.value.slice(0, slashIndex) + `/${cmd.name} `
  }
  showCommandsAutocomplete.value = false
  textareaRef.value?.focus()
  nextTick(autoResizeTextarea)
}

function handleSubmit() {
  if ((!inputMessage.value.trim() && pendingImages.value.length === 0) || props.isProcessing) return
  emit('submit', inputMessage.value, pendingImages.value.length > 0 ? [...pendingImages.value] : undefined)
  inputMessage.value = ''
  pendingImages.value = []
  showCommandsAutocomplete.value = false
  if (textareaRef.value) {
    textareaRef.value.style.height = 'auto'
  }
}

function handleKeydown(e: KeyboardEvent) {
  // Desktop: Enter = send, Shift+Enter = newline
  // Mobile: Enter = newline (no send on enter)
  if (e.key === 'Enter' && !e.shiftKey && !isMobile.value) {
    e.preventDefault()
    handleSubmit()
  }
  if (e.key === 'Escape' && showCommandsAutocomplete.value) {
    showCommandsAutocomplete.value = false
  }
}

// ============================================================================
// IMAGE HANDLING
// ============================================================================

function generateImageId(): string {
  return `img_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`
}

function isImageType(mimeType: string): boolean {
  return IMAGE_TYPES.includes(mimeType) || mimeType.startsWith('image/')
}

async function processFile(file: File): Promise<ImageAttachment | null> {
  if (file.size > MAX_FILE_SIZE) {
    console.warn('File too large:', file.size)
    return null
  }

  return new Promise((resolve) => {
    const reader = new FileReader()
    reader.onload = (e) => {
      const dataUrl = e.target?.result as string
      // Extract base64 data (remove data:xxx;base64, prefix)
      const base64Data = dataUrl.split(',')[1]
      if (!base64Data) {
        resolve(null)
        return
      }

      const ext = file.name.split('.').pop() || 'bin'
      resolve({
        id: generateImageId(),
        filename: file.name || `file_${Date.now()}.${ext}`,
        mimeType: file.type || 'application/octet-stream',
        data: base64Data,
        size: file.size,
      })
    }
    reader.onerror = () => resolve(null)
    reader.readAsDataURL(file)
  })
}

async function handlePaste(e: ClipboardEvent) {
  const items = e.clipboardData?.items
  if (!items) return

  for (const item of items) {
    // Handle images and files from clipboard
    if (item.kind === 'file') {
      e.preventDefault()
      const file = item.getAsFile()
      if (file) {
        const attachment = await processFile(file)
        if (attachment) {
          pendingImages.value.push(attachment)
        }
      }
      return
    }
  }
}

function handleDragOver(e: DragEvent) {
  e.preventDefault()
  e.stopPropagation()
  isDragOver.value = true
}

function handleDragLeave(e: DragEvent) {
  e.preventDefault()
  e.stopPropagation()
  isDragOver.value = false
}

async function handleDrop(e: DragEvent) {
  e.preventDefault()
  e.stopPropagation()
  isDragOver.value = false

  const files = e.dataTransfer?.files
  if (!files) return

  for (const file of files) {
    const attachment = await processFile(file)
    if (attachment) {
      pendingImages.value.push(attachment)
    }
  }
}

function removeImage(id: string) {
  pendingImages.value = pendingImages.value.filter(img => img.id !== id)
}

function getImagePreviewUrl(attachment: ImageAttachment): string {
  return `data:${attachment.mimeType};base64,${attachment.data}`
}

// ============================================================================
// ATTACHMENT MENU
// ============================================================================

function toggleAttachMenu() {
  showAttachMenu.value = !showAttachMenu.value
}

function openImage() {
  showAttachMenu.value = false
  if (fileInputRef.value) {
    fileInputRef.value.accept = 'image/*'
    fileInputRef.value.removeAttribute('capture')
    fileInputRef.value.click()
  }
}

function openCamera() {
  showAttachMenu.value = false
  if (fileInputRef.value) {
    fileInputRef.value.accept = 'image/*'
    fileInputRef.value.setAttribute('capture', 'environment')
    fileInputRef.value.click()
  }
}

async function openFile() {
  showAttachMenu.value = false

  // Try modern File System Access API (opens native file picker)
  if ('showOpenFilePicker' in window) {
    try {
      const handles = await (window as any).showOpenFilePicker({ multiple: true })
      for (const handle of handles) {
        const file = await handle.getFile()
        const attachment = await processFile(file)
        if (attachment) {
          pendingImages.value.push(attachment)
        }
      }
      return
    }
    catch (e: any) {
      // User cancelled or API failed, fall through to input
      if (e.name === 'AbortError') return
    }
  }

  // Fallback: use input with document types to avoid camera/gallery on mobile
  if (fileInputRef.value) {
    fileInputRef.value.accept = '.pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.txt,.rtf,.csv,.json,.xml,.html,.css,.js,.ts,.py,.md,.zip,.rar,.7z,.tar,.gz,.log,.yaml,.yml,.toml,.env,.sh,.sql'
    fileInputRef.value.removeAttribute('capture')
    fileInputRef.value.click()
  }
}

async function handleFileSelect(e: Event) {
  const input = e.target as HTMLInputElement
  const files = input.files
  if (!files) return

  for (const file of files) {
    const attachment = await processFile(file)
    if (attachment) {
      pendingImages.value.push(attachment)
    }
  }

  // Reset input for future selections
  input.value = ''
}

function closeAttachMenuOnClickOutside(e: MouseEvent) {
  const target = e.target as HTMLElement
  if (!target.closest('.claude-attach-menu') && !target.closest('.claude-attach-btn')) {
    showAttachMenu.value = false
  }
}

// Expose focus method
defineExpose({
  focus: () => textareaRef.value?.focus(),
  appendText: (text: string) => {
    inputMessage.value += text + ' '
    nextTick(autoResizeTextarea)
  },
})
</script>

<template>
  <div
    ref="inputContainerRef"
    :class="['claude-input-container', { 'claude-drag-over': isDragOver }]"
    @dragover="handleDragOver"
    @dragleave="handleDragLeave"
    @drop="handleDrop"
  >
    <!-- Commands autocomplete -->
    <div
      v-if="showCommandsAutocomplete && filteredCommands.length > 0"
      class="claude-autocomplete"
    >
      <button
        v-for="cmd in filteredCommands"
        :key="cmd.name"
        class="claude-autocomplete-item"
        @click="selectCommand(cmd)"
      >
        <span class="claude-autocomplete-name">/{{ cmd.name }}</span>
        <span
          v-if="cmd.description"
          class="claude-autocomplete-desc"
        >{{ cmd.description }}</span>
      </button>
    </div>

    <!-- File/Image previews -->
    <div
      v-if="pendingImages.length > 0"
      class="claude-file-previews"
    >
      <div
        v-for="file in pendingImages"
        :key="file.id"
        :class="['claude-file-preview', { 'claude-file-preview-image': isImageType(file.mimeType) }]"
        :title="file.filename"
      >
        <!-- Image preview -->
        <img
          v-if="isImageType(file.mimeType)"
          :src="getImagePreviewUrl(file)"
          :alt="file.filename"
        >
        <!-- File icon + name -->
        <template v-else>
          <svg
            class="claude-file-icon"
            fill="currentColor"
            height="20"
            viewBox="0 0 24 24"
            width="20"
          >
            <path d="M14 2H6c-1.1 0-2 .9-2 2v16c0 1.1.9 2 2 2h12c1.1 0 2-.9 2-2V8l-6-6zm4 18H6V4h7v5h5v11z" />
          </svg>
          <span class="claude-file-name">{{ file.filename }}</span>
        </template>
        <button
          class="claude-file-remove"
          title="Remove"
          @click="removeImage(file.id)"
        >
          <svg
            fill="currentColor"
            height="14"
            viewBox="0 0 24 24"
            width="14"
          >
            <path d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z" />
          </svg>
        </button>
      </div>
    </div>

    <!-- Drag overlay -->
    <div
      v-if="isDragOver"
      class="claude-drag-overlay"
    >
      <svg
        fill="currentColor"
        height="32"
        viewBox="0 0 24 24"
        width="32"
      >
        <path d="M16.5 6v11.5c0 2.21-1.79 4-4 4s-4-1.79-4-4V5c0-1.38 1.12-2.5 2.5-2.5s2.5 1.12 2.5 2.5v10.5c0 .55-.45 1-1 1s-1-.45-1-1V6H10v9.5c0 1.38 1.12 2.5 2.5 2.5s2.5-1.12 2.5-2.5V5c0-2.21-1.79-4-4-4S7 2.79 7 5v12.5c0 3.04 2.46 5.5 5.5 5.5s5.5-2.46 5.5-5.5V6h-1.5z" />
      </svg>
      <span>Drop file here</span>
    </div>

    <!-- Hidden file input -->
    <input
      ref="fileInputRef"
      accept="image/*"
      class="claude-file-input"
      multiple
      type="file"
      @change="handleFileSelect"
    >

    <div class="claude-input-wrapper">
      <!-- Attachment button -->
      <div class="claude-attach-wrapper">
        <button
          class="claude-attach-btn"
          :disabled="!isConnected || isProcessing"
          title="Attach file"
          @click.stop="toggleAttachMenu"
        >
          <svg
            fill="currentColor"
            height="20"
            viewBox="0 0 24 24"
            width="20"
          >
            <path d="M16.5 6v11.5c0 2.21-1.79 4-4 4s-4-1.79-4-4V5c0-1.38 1.12-2.5 2.5-2.5s2.5 1.12 2.5 2.5v10.5c0 .55-.45 1-1 1s-1-.45-1-1V6H10v9.5c0 1.38 1.12 2.5 2.5 2.5s2.5-1.12 2.5-2.5V5c0-2.21-1.79-4-4-4S7 2.79 7 5v12.5c0 3.04 2.46 5.5 5.5 5.5s5.5-2.46 5.5-5.5V6h-1.5z" />
          </svg>
        </button>

        <!-- Attachment menu -->
        <Transition name="claude-menu">
          <div
            v-if="showAttachMenu"
            class="claude-attach-menu"
          >
            <button
              class="claude-attach-option"
              @click="openImage"
            >
              <svg
                fill="currentColor"
                height="18"
                viewBox="0 0 24 24"
                width="18"
              >
                <path d="M21 19V5c0-1.1-.9-2-2-2H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2zM8.5 13.5l2.5 3.01L14.5 12l4.5 6H5l3.5-4.5z" />
              </svg>
              <span>Image</span>
            </button>
            <button
              class="claude-attach-option"
              @click="openCamera"
            >
              <svg
                fill="currentColor"
                height="18"
                viewBox="0 0 24 24"
                width="18"
              >
                <path d="M12 15.2c1.77 0 3.2-1.43 3.2-3.2s-1.43-3.2-3.2-3.2-3.2 1.43-3.2 3.2 1.43 3.2 3.2 3.2zM9 2L7.17 4H4c-1.1 0-2 .9-2 2v12c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V6c0-1.1-.9-2-2-2h-3.17L15 2H9zm3 15c-2.76 0-5-2.24-5-5s2.24-5 5-5 5 2.24 5 5-2.24 5-5 5z" />
              </svg>
              <span>Camera</span>
            </button>
            <button
              class="claude-attach-option"
              @click="openFile"
            >
              <svg
                fill="currentColor"
                height="18"
                viewBox="0 0 24 24"
                width="18"
              >
                <path d="M14 2H6c-1.1 0-2 .9-2 2v16c0 1.1.9 2 2 2h12c1.1 0 2-.9 2-2V8l-6-6zm4 18H6V4h7v5h5v11z" />
              </svg>
              <span>File</span>
            </button>
          </div>
        </Transition>
      </div>

      <textarea
        ref="textareaRef"
        v-model="inputMessage"
        :disabled="!isConnected || isProcessing"
        class="claude-input"
        :placeholder="pendingImages.length > 0 ? 'Add a message (optional)...' : 'Ask Claude...'"
        rows="1"
        @input="handleInput"
        @keydown="handleKeydown"
      />
      <div class="claude-input-actions">
        <Transition
          name="claude-btn"
          mode="out-in"
        >
          <!-- Stop button (when AI is processing) -->
          <button
            v-if="isProcessing"
            key="stop"
            class="claude-stop-btn"
            title="Stop generation"
            @click="emit('stop')"
          >
            <svg
              fill="currentColor"
              height="20"
              viewBox="0 0 24 24"
              width="20"
            >
              <rect
                height="14"
                rx="2"
                width="14"
                x="5"
                y="5"
              />
            </svg>
          </button>
          <!-- Voice recording button (when recording - always show to allow stop) -->
          <button
            v-else-if="isRecording"
            key="recording"
            class="claude-voice-btn claude-voice-recording"
            title="Stop recording"
            @click="emit('voiceInput')"
          >
            <svg
              fill="currentColor"
              height="20"
              viewBox="0 0 24 24"
              width="20"
            >
              <path d="M12 14c1.66 0 2.99-1.34 2.99-3L15 5c0-1.66-1.34-3-3-3S9 3.34 9 5v6c0 1.66 1.34 3 3 3zm5.3-3c0 3-2.54 5.1-5.3 5.1S6.7 14 6.7 11H5c0 3.41 2.72 6.23 6 6.72V21h2v-3.28c3.28-.48 6-3.3 6-6.72h-1.7z" />
            </svg>
          </button>
          <!-- Send button (when there's content and not recording) -->
          <button
            v-else-if="hasContent"
            key="send"
            :disabled="!isConnected"
            class="claude-send-btn"
            @click="handleSubmit"
          >
            <svg
              fill="currentColor"
              height="20"
              viewBox="0 0 24 24"
              width="20"
            >
              <path d="M2.01 21L23 12 2.01 3 2 10l15 2-15 2z" />
            </svg>
          </button>
          <!-- Voice input button (default - when no text, not recording, voice supported) -->
          <button
            v-else-if="isSpeechSupported"
            key="voice"
            class="claude-voice-btn"
            :disabled="!isConnected"
            title="Voice input"
            @click="emit('voiceInput')"
          >
            <svg
              fill="currentColor"
              height="20"
              viewBox="0 0 24 24"
              width="20"
            >
              <path d="M12 14c1.66 0 2.99-1.34 2.99-3L15 5c0-1.66-1.34-3-3-3S9 3.34 9 5v6c0 1.66 1.34 3 3 3zm5.3-3c0 3-2.54 5.1-5.3 5.1S6.7 14 6.7 11H5c0 3.41 2.72 6.23 6 6.72V21h2v-3.28c3.28-.48 6-3.3 6-6.72h-1.7z" />
            </svg>
          </button>
          <!-- Fallback send button (when voice not supported) -->
          <button
            v-else
            key="send-fallback"
            :disabled="!hasText || !isConnected"
            class="claude-send-btn"
            @click="handleSubmit"
          >
            <svg
              fill="currentColor"
              height="20"
              viewBox="0 0 24 24"
              width="20"
            >
              <path d="M2.01 21L23 12 2.01 3 2 10l15 2-15 2z" />
            </svg>
          </button>
        </Transition>
      </div>
    </div>
  </div>
</template>

<style>
.claude-input-container {
  position: absolute;
  bottom: 0;
  left: 0;
  right: 0;
  padding: 20px;
  background: transparent;
  z-index: 10;
  pointer-events: none;
}

.claude-input-container > * {
  pointer-events: auto;
}

.claude-autocomplete {
  position: absolute;
  bottom: 100%;
  left: 20px;
  right: 20px;
  background: rgba(0, 0, 0, 0.7);
  backdrop-filter: blur(20px);
  -webkit-backdrop-filter: blur(20px);
  border: 1px solid rgba(255, 255, 255, 0.1);
  border-radius: var(--claude-radius-sm);
  overflow: hidden;
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.4);
  margin-bottom: 8px;
}

.claude-autocomplete-item {
  width: 100%;
  padding: 12px 16px;
  border: none;
  background: transparent;
  color: var(--claude-text);
  cursor: pointer;
  text-align: left;
  display: flex;
  flex-direction: column;
  gap: 4px;
  transition: all 0.15s ease;
  border-bottom: 1px solid rgba(255, 255, 255, 0.05);
}

.claude-autocomplete-item:last-child {
  border-bottom: none;
}

.claude-autocomplete-item:hover {
  background: rgba(254, 154, 0, 0.15);
}

.claude-autocomplete-name {
  font-family: 'JetBrains Mono', 'Fira Code', monospace;
  font-size: 13px;
  color: var(--claude-primary);
  text-shadow: 0 0 15px var(--claude-primary-glow);
}

.claude-autocomplete-desc {
  font-size: 12px;
  color: var(--claude-text-muted);
}

/* Hidden file input */
.claude-file-input {
  display: none;
}

.claude-input-wrapper {
  display: flex;
  gap: 10px;
  align-items: flex-end;
}

/* Attachment button */
.claude-attach-wrapper {
  position: relative;
  flex-shrink: 0;
}

.claude-attach-btn {
  width: 40px;
  height: 48px;
  border: none;
  background: transparent;
  color: var(--claude-text-muted);
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.2s ease;
  border-radius: 8px;
}

.claude-attach-btn:hover:not(:disabled) {
  color: var(--claude-text);
  background: rgba(255, 255, 255, 0.1);
}

.claude-attach-btn:disabled {
  opacity: 0.4;
  cursor: not-allowed;
}

/* Attachment menu */
.claude-attach-menu {
  position: absolute;
  bottom: 100%;
  left: 0;
  margin-bottom: 8px;
  background: rgba(0, 0, 0, 0.85);
  backdrop-filter: blur(20px);
  -webkit-backdrop-filter: blur(20px);
  border: 1px solid rgba(255, 255, 255, 0.15);
  border-radius: 12px;
  overflow: hidden;
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.4);
  min-width: 140px;
}

.claude-attach-option {
  width: 100%;
  padding: 12px 16px;
  border: none;
  background: transparent;
  color: var(--claude-text);
  cursor: pointer;
  display: flex;
  align-items: center;
  gap: 12px;
  font-size: 14px;
  transition: all 0.15s ease;
}

.claude-attach-option:hover {
  background: rgba(254, 154, 0, 0.15);
}

.claude-attach-option:not(:last-child) {
  border-bottom: 1px solid rgba(255, 255, 255, 0.1);
}

.claude-attach-option svg {
  color: var(--claude-primary);
}

/* Menu transition */
.claude-menu-enter-active,
.claude-menu-leave-active {
  transition: all 0.2s ease;
}

.claude-menu-enter-from,
.claude-menu-leave-to {
  opacity: 0;
  transform: translateY(8px) scale(0.95);
}

.claude-input {
  flex: 1;
  background: rgba(0, 0, 0, 0.5);
  backdrop-filter: blur(20px);
  -webkit-backdrop-filter: blur(20px);
  border: 1px solid rgba(255, 255, 255, 0.1);
  border-radius: var(--claude-radius-sm);
  padding: 14px 18px;
  color: var(--claude-text);
  font-size: 14px;
  resize: none;
  min-height: 48px;
  max-height: 280px;
  font-family: inherit;
  line-height: 1.5;
  overflow-y: auto;
  scrollbar-width: none;
  -ms-overflow-style: none;
  transition: all 0.2s ease;
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.3);
}

.claude-input::-webkit-scrollbar {
  display: none;
}

.claude-input:focus {
  outline: none;
  border-color: var(--claude-primary);
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.4), 0 0 0 3px rgba(254, 154, 0, 0.2), 0 0 30px rgba(254, 154, 0, 0.15);
  background: rgba(0, 0, 0, 0.6);
}

.claude-input::placeholder {
  color: var(--claude-text-dim);
}

.claude-input:disabled {
  opacity: 0.4;
  cursor: not-allowed;
}

.claude-input-actions {
  display: flex;
  gap: 10px;
  flex-shrink: 0;
}

.claude-voice-btn {
  width: 48px;
  height: 48px;
  border: 1px solid rgba(255, 255, 255, 0.1);
  background: rgba(0, 0, 0, 0.5);
  backdrop-filter: blur(20px);
  -webkit-backdrop-filter: blur(20px);
  color: rgba(255, 255, 255, 0.6);
  border-radius: var(--claude-radius-sm);
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.2s ease;
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.3);
}

.claude-voice-btn:hover:not(:disabled) {
  background: rgba(0, 0, 0, 0.6);
  color: #fff;
  border-color: rgba(255, 255, 255, 0.2);
  transform: translateY(-2px);
  box-shadow: 0 12px 40px rgba(0, 0, 0, 0.4);
}

.claude-voice-btn:disabled {
  opacity: 0.4;
  cursor: not-allowed;
}

.claude-voice-recording {
  background: linear-gradient(135deg, #ef4444 0%, #dc2626 100%) !important;
  border-color: rgba(239, 68, 68, 0.5) !important;
  color: white !important;
  animation: claude-recording-pulse 1.5s ease-in-out infinite;
  box-shadow: 0 8px 32px rgba(239, 68, 68, 0.4);
}

@keyframes claude-recording-pulse {
  0%, 100% { box-shadow: 0 8px 32px rgba(239, 68, 68, 0.4); }
  50% { box-shadow: 0 8px 40px rgba(239, 68, 68, 0.6); }
}

.claude-send-btn {
  width: 48px;
  height: 48px;
  border: none;
  background: linear-gradient(135deg, #FE9A00 0%, #F59E0B 50%, #FBBF24 100%);
  color: white;
  border-radius: var(--claude-radius-sm);
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.2s ease;
  box-shadow: 0 8px 32px rgba(254, 154, 0, 0.35);
}

.claude-send-btn:hover:not(:disabled) {
  transform: translateY(-2px);
  box-shadow: 0 12px 40px rgba(254, 154, 0, 0.45);
}

.claude-send-btn:disabled {
  opacity: 0.4;
  cursor: not-allowed;
  transform: none;
  box-shadow: none;
}

.claude-stop-btn {
  width: 48px;
  height: 48px;
  border: none;
  background: linear-gradient(135deg, #ef4444 0%, #dc2626 100%);
  color: white;
  border-radius: var(--claude-radius-sm);
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.2s ease;
  box-shadow: 0 8px 32px rgba(239, 68, 68, 0.35);
  animation: claude-stop-pulse 2s ease-in-out infinite;
}

.claude-stop-btn:hover {
  transform: translateY(-2px);
  box-shadow: 0 12px 40px rgba(239, 68, 68, 0.5);
}

@keyframes claude-stop-pulse {
  0%, 100% {
    box-shadow: 0 8px 32px rgba(239, 68, 68, 0.35);
  }
  50% {
    box-shadow: 0 8px 40px rgba(239, 68, 68, 0.5);
  }
}

/* Button transition */
.claude-btn-enter-active,
.claude-btn-leave-active {
  transition: all 0.2s ease;
}

.claude-btn-enter-from {
  opacity: 0;
  transform: scale(0.8) rotate(-10deg);
}

.claude-btn-leave-to {
  opacity: 0;
  transform: scale(0.8) rotate(10deg);
}

/* File/Image previews */
.claude-file-previews {
  display: flex;
  gap: 8px;
  flex-wrap: wrap;
  margin-bottom: 10px;
  padding: 0;
}

.claude-file-preview {
  position: relative;
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 8px 12px;
  border-radius: 8px;
  background: rgba(0, 0, 0, 0.5);
  border: 1px solid rgba(255, 255, 255, 0.1);
  max-width: 150px;
}

.claude-file-preview-image {
  width: 60px;
  height: 60px;
  padding: 0;
  overflow: hidden;
}

.claude-file-preview-image img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.claude-file-icon {
  flex-shrink: 0;
  color: var(--claude-primary);
}

.claude-file-name {
  font-size: 12px;
  color: var(--claude-text);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  max-width: 80px;
}

.claude-file-remove {
  position: absolute;
  top: 2px;
  right: 2px;
  width: 20px;
  height: 20px;
  border: none;
  background: rgba(0, 0, 0, 0.7);
  color: white;
  border-radius: 50%;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.15s ease;
  opacity: 0;
}

.claude-file-preview:hover .claude-file-remove {
  opacity: 1;
}

.claude-file-remove:hover {
  background: #ef4444;
}

/* Drag and drop */
.claude-input-container.claude-drag-over {
  position: relative;
}

.claude-drag-overlay {
  position: absolute;
  inset: 0;
  background: rgba(254, 154, 0, 0.15);
  border: 2px dashed var(--claude-primary);
  border-radius: var(--claude-radius-sm);
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 8px;
  color: var(--claude-primary);
  font-size: 14px;
  font-weight: 500;
  z-index: 20;
  backdrop-filter: blur(4px);
  -webkit-backdrop-filter: blur(4px);
}

@media (max-width: 640px) {
  .claude-input {
    font-size: 16px;
  }

  .claude-voice-btn,
  .claude-send-btn,
  .claude-stop-btn {
    width: 52px;
    height: 52px;
  }

  .claude-input-container {
    padding: 20px 16px calc(20px + env(safe-area-inset-bottom, 0px)) 16px;
  }
}
</style>
