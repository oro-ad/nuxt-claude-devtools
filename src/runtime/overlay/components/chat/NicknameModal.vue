<script setup lang="ts">
import { ref } from 'vue'

defineProps<{
  show: boolean
  error?: string
}>()

const emit = defineEmits<{
  submit: [nickname: string]
  cancel: []
}>()

const nicknameInput = ref('')

function handleSubmit() {
  const name = nicknameInput.value.trim()
  if (name.length >= 2 && name.length <= 20) {
    emit('submit', name)
    nicknameInput.value = ''
  }
}

function handleCancel() {
  emit('cancel')
  nicknameInput.value = ''
}
</script>

<template>
  <Teleport to="body">
    <Transition name="claude-modal-fade">
      <div
        v-if="show"
        class="claude-modal-backdrop"
        @click.self="handleCancel"
      >
        <div class="claude-modal">
          <div class="claude-modal-header">
            <h3>Enter your nickname</h3>
            <button
              class="claude-btn-icon"
              @click="handleCancel"
            >
              <svg
                fill="currentColor"
                height="16"
                viewBox="0 0 24 24"
                width="16"
              >
                <path d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z" />
              </svg>
            </button>
          </div>
          <div class="claude-modal-body">
            <p class="claude-modal-hint">
              Choose a nickname for collaborative chat sessions
            </p>
            <input
              v-model="nicknameInput"
              class="claude-modal-input"
              maxlength="20"
              placeholder="Your nickname (2-20 characters)"
              type="text"
              @keydown.enter="handleSubmit"
            >
            <p
              v-if="error"
              class="claude-modal-error"
            >
              {{ error }}
            </p>
          </div>
          <div class="claude-modal-actions">
            <button
              class="claude-modal-btn-secondary"
              @click="handleCancel"
            >
              Cancel
            </button>
            <button
              :disabled="nicknameInput.trim().length < 2"
              class="claude-modal-btn-primary"
              @click="handleSubmit"
            >
              Save
            </button>
          </div>
        </div>
      </div>
    </Transition>
  </Teleport>
</template>

<style>
.claude-modal-backdrop {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.5);
  backdrop-filter: blur(12px);
  -webkit-backdrop-filter: blur(12px);
  z-index: 100000;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 24px;
}

.claude-modal {
  background: var(--claude-glass-solid);
  backdrop-filter: blur(var(--claude-blur-heavy));
  -webkit-backdrop-filter: blur(var(--claude-blur-heavy));
  border-radius: var(--claude-radius);
  border: 1px solid var(--claude-border-light);
  width: 100%;
  max-width: 380px;
  box-shadow: var(--claude-shadow-lg), var(--claude-glow);
  overflow: hidden;
}

.claude-modal-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 20px 20px 16px;
}

.claude-modal-header h3 {
  margin: 0;
  font-size: 17px;
  font-weight: 600;
  background: linear-gradient(135deg, #fff 0%, rgba(255, 255, 255, 0.8) 100%);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
}

.claude-modal-body {
  padding: 20px;
}

.claude-modal-hint {
  margin: 0 0 16px;
  font-size: 14px;
  color: var(--claude-text-muted);
  line-height: 1.5;
}

.claude-modal-input {
  width: 100%;
  padding: 12px 16px;
  background: var(--claude-glass);
  border: 1px solid var(--claude-border);
  border-radius: var(--claude-radius-sm);
  color: var(--claude-text);
  font-size: 14px;
  font-family: inherit;
  transition: all 0.2s ease;
}

.claude-modal-input:focus {
  outline: none;
  border-color: var(--claude-primary);
  box-shadow: 0 0 0 3px rgba(254, 154, 0, 0.15);
  background: var(--claude-glass-elevated);
}

.claude-modal-input::placeholder {
  color: var(--claude-text-dim);
}

.claude-modal-error {
  margin: 10px 0 0;
  font-size: 13px;
  color: #f87171;
}

.claude-modal-actions {
  display: flex;
  gap: 10px;
  padding: 16px 20px 20px;
  justify-content: flex-end;
}

.claude-modal-btn-secondary,
.claude-modal-btn-primary {
  padding: 10px 20px;
  border-radius: var(--claude-radius-sm);
  font-size: 14px;
  font-weight: 500;
  cursor: pointer;
  border: none;
  transition: all 0.2s ease;
}

.claude-modal-btn-secondary {
  background: var(--claude-glass);
  border: 1px solid var(--claude-border);
  color: var(--claude-text);
}

.claude-modal-btn-secondary:hover {
  background: var(--claude-glass-hover);
  border-color: var(--claude-border-light);
}

.claude-modal-btn-primary {
  background: linear-gradient(135deg, #FE9A00 0%, #F59E0B 100%);
  color: white;
  box-shadow: 0 4px 15px rgba(254, 154, 0, 0.3);
}

.claude-modal-btn-primary:hover:not(:disabled) {
  transform: translateY(-1px);
  box-shadow: 0 6px 20px rgba(254, 154, 0, 0.4);
}

.claude-modal-btn-primary:disabled {
  opacity: 0.4;
  cursor: not-allowed;
  transform: none;
  box-shadow: none;
}

.claude-modal-fade-enter-active,
.claude-modal-fade-leave-active {
  transition: opacity 0.3s ease;
}

.claude-modal-fade-enter-from,
.claude-modal-fade-leave-to {
  opacity: 0;
}
</style>
