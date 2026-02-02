<script setup lang="ts">
import { computed, nextTick, ref } from 'vue'
import type { SlashCommand } from '../../../shared/types'

const props = defineProps<{
  isConnected: boolean
  isProcessing: boolean
  isRecording: boolean
  isSpeechSupported: boolean
  commands: SlashCommand[]
}>()

const emit = defineEmits<{
  submit: [message: string]
  voiceInput: []
}>()

const inputMessage = ref('')
const textareaRef = ref<HTMLTextAreaElement | null>(null)
const showCommandsAutocomplete = ref(false)

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
  if (!inputMessage.value.trim() || props.isProcessing) return
  emit('submit', inputMessage.value)
  inputMessage.value = ''
  showCommandsAutocomplete.value = false
  if (textareaRef.value) {
    textareaRef.value.style.height = 'auto'
  }
}

function handleKeydown(e: KeyboardEvent) {
  if (e.key === 'Enter' && !e.shiftKey) {
    e.preventDefault()
    handleSubmit()
  }
  if (e.key === 'Escape' && showCommandsAutocomplete.value) {
    showCommandsAutocomplete.value = false
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
  <div class="claude-input-container">
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
        <span v-if="cmd.description" class="claude-autocomplete-desc">{{ cmd.description }}</span>
      </button>
    </div>

    <div class="claude-input-wrapper">
      <textarea
        ref="textareaRef"
        v-model="inputMessage"
        :disabled="!isConnected || isProcessing"
        class="claude-input"
        placeholder="Ask Claude..."
        rows="1"
        @input="handleInput"
        @keydown="handleKeydown"
      />
      <div class="claude-input-actions">
        <!-- Voice input button -->
        <button
          v-if="isSpeechSupported"
          :class="['claude-voice-btn', { 'claude-voice-recording': isRecording }]"
          :disabled="!isConnected || isProcessing"
          title="Voice input"
          @click="emit('voiceInput')"
        >
          <svg fill="currentColor" height="20" viewBox="0 0 24 24" width="20">
            <path d="M12 14c1.66 0 2.99-1.34 2.99-3L15 5c0-1.66-1.34-3-3-3S9 3.34 9 5v6c0 1.66 1.34 3 3 3zm5.3-3c0 3-2.54 5.1-5.3 5.1S6.7 14 6.7 11H5c0 3.41 2.72 6.23 6 6.72V21h2v-3.28c3.28-.48 6-3.3 6-6.72h-1.7z" />
          </svg>
        </button>
        <!-- Send button -->
        <button
          :disabled="!inputMessage.trim() || !isConnected || isProcessing"
          class="claude-send-btn"
          @click="handleSubmit"
        >
          <svg v-if="isProcessing" class="claude-spinner" fill="none" height="20" stroke="currentColor" viewBox="0 0 24 24" width="20">
            <circle cx="12" cy="12" opacity="0.25" r="10" stroke-width="2" />
            <path d="M12 2a10 10 0 0 1 10 10" stroke-linecap="round" stroke-width="2" />
          </svg>
          <svg v-else fill="currentColor" height="20" viewBox="0 0 24 24" width="20">
            <path d="M2.01 21L23 12 2.01 3 2 10l15 2-15 2z" />
          </svg>
        </button>
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

.claude-input-wrapper {
  display: flex;
  gap: 10px;
  align-items: flex-end;
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
  transition: all 0.2s ease;
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.3);
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

.claude-spinner {
  animation: claude-spin 1s linear infinite;
}

@keyframes claude-spin {
  from { transform: rotate(0deg); }
  to { transform: rotate(360deg); }
}

@media (max-width: 640px) {
  .claude-input {
    font-size: 16px;
  }

  .claude-voice-btn,
  .claude-send-btn {
    width: 52px;
    height: 52px;
  }

  .claude-input-container {
    padding: 20px 16px calc(20px + env(safe-area-inset-bottom, 0px)) 16px;
  }
}
</style>
