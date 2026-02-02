<script setup lang="ts">
import { nextTick, ref, watch } from 'vue'
import type { ContentBlock, Message } from '../../../shared/types'
import MarkdownContent from '../MarkdownContent.vue'
import ToolCallBlock from '../ToolCallBlock.vue'

const props = defineProps<{
  messages: Message[]
  isShareMode: boolean
  findToolResult: (blocks: ContentBlock[] | undefined, toolUseId: string) => ContentBlock | undefined
  isOwnMessage: (senderId?: string) => boolean
}>()

const messagesContainer = ref<HTMLElement | null>(null)

function stripContextBlock(content: string): string {
  return content.replace(/^\[context\]\n[\s\S]*?\n\[\/context\]\n?/, '').trim()
}

function getDisplayContent(message: Message): string {
  return stripContextBlock(message.content)
}

function getMessageClass(role: Message['role']) {
  if (role === 'user') return 'claude-message-user'
  if (role === 'assistant') return 'claude-message-assistant'
  return 'claude-message-system'
}

function scrollToBottom() {
  if (messagesContainer.value) {
    messagesContainer.value.scrollTop = messagesContainer.value.scrollHeight
  }
}

// Auto-scroll on new messages
watch(
  () => props.messages.length,
  () => nextTick(scrollToBottom),
)

// Watch for streaming content
watch(
  () => props.messages[props.messages.length - 1]?.content,
  () => nextTick(scrollToBottom),
)

defineExpose({ scrollToBottom })
</script>

<template>
  <div
    ref="messagesContainer"
    class="claude-messages"
  >
    <div
      v-if="messages.length === 0"
      class="claude-empty"
    >
      <p>
        Start a conversation with Claude
      </p>
      <p class="claude-empty-hint">
        Type a message or use /commands
      </p>
    </div>

    <div
      v-for="message in messages"
      :key="message.id"
      :class="[
        'claude-message',
        getMessageClass(message.role),
        {
          'claude-message-own': message.role === 'user' && isOwnMessage(message.senderId),
          'claude-message-other': message.role === 'user' && !isOwnMessage(message.senderId),
        },
      ]"
    >
      <!-- User message -->
      <template v-if="message.role === 'user'">
        <div
          v-if="isShareMode && message.senderNickname"
          class="claude-message-sender"
        >
          {{ message.senderNickname }}
          <span
            v-if="isOwnMessage(message.senderId)"
            class="claude-message-you"
          >(you)</span>
        </div>
        <div class="claude-message-content">
          {{ getDisplayContent(message) }}
        </div>
      </template>

      <!-- Assistant message -->
      <template v-else-if="message.role === 'assistant'">
        <div class="claude-message-content">
          <template v-if="message.contentBlocks?.length">
            <template
              v-for="(block, idx) in message.contentBlocks"
              :key="idx"
            >
              <MarkdownContent
                v-if="block.type === 'text' && block.text"
                :content="stripContextBlock(block.text)"
              />
              <ToolCallBlock
                v-else-if="block.type === 'tool_use'"
                :block="block"
                :result="findToolResult(message.contentBlocks, block.id!)"
              />
            </template>
          </template>
          <template v-else-if="message.content">
            <MarkdownContent :content="getDisplayContent(message)" />
          </template>
          <span
            v-if="message.streaming"
            class="claude-cursor"
          />
        </div>
      </template>

      <!-- System message -->
      <template v-else>
        <div class="claude-message-content claude-message-system-content">
          {{ getDisplayContent(message) }}
        </div>
      </template>
    </div>
  </div>
</template>

<style>
.claude-messages {
  flex: 1;
  overflow-y: auto;
  padding: 80px 20px 140px;
  display: flex;
  flex-direction: column;
  gap: 16px;
  position: relative;
  z-index: 1;
}

.claude-empty {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  color: var(--claude-text-muted);
  text-align: center;
  padding: 0 20px;
  margin-top: -60px;
}

.claude-empty p:first-child {
  font-size: 16px;
  font-weight: 500;
  margin-bottom: 8px;
  background: linear-gradient(135deg, var(--claude-text) 0%, var(--claude-text-muted) 100%);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
}

.claude-empty-hint {
  font-size: 13px;
  margin-top: 4px;
  opacity: 0.6;
}

.claude-message {
  max-width: 88%;
  animation: claude-message-in 0.3s ease-out;
}

@keyframes claude-message-in {
  from {
    opacity: 0;
    transform: translateY(10px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

.claude-message-user {
  align-self: flex-end;
}

.claude-message-sender {
  font-size: 11px;
  font-weight: 600;
  color: var(--claude-primary);
  margin-bottom: 6px;
  padding-left: 4px;
  text-shadow: 0 0 20px var(--claude-primary-glow);
}

.claude-message-you {
  opacity: 0.5;
  font-weight: 400;
}

.claude-message-own {
  align-self: flex-end;
}

.claude-message-own .claude-message-content {
  background: var(--claude-user-bg);
  backdrop-filter: blur(10px);
  -webkit-backdrop-filter: blur(10px);
  border-radius: var(--claude-radius-sm) var(--claude-radius-sm) 4px var(--claude-radius-sm);
  padding: 12px 16px;
  white-space: pre-wrap;
  word-break: break-word;
  border: 1px solid rgba(254, 154, 0, 0.2);
  box-shadow: 0 4px 15px rgba(254, 154, 0, 0.15);
}

.claude-message-other {
  align-self: flex-start;
}

.claude-message-other .claude-message-content {
  background: var(--claude-other-user-bg);
  backdrop-filter: blur(10px);
  -webkit-backdrop-filter: blur(10px);
  border-radius: var(--claude-radius-sm) var(--claude-radius-sm) var(--claude-radius-sm) 4px;
  padding: 12px 16px;
  white-space: pre-wrap;
  word-break: break-word;
  border: 1px solid rgba(236, 72, 153, 0.2);
  box-shadow: 0 4px 15px rgba(236, 72, 153, 0.1);
}

.claude-message-user .claude-message-content {
  background: var(--claude-user-bg);
  backdrop-filter: blur(10px);
  -webkit-backdrop-filter: blur(10px);
  border-radius: var(--claude-radius-sm) var(--claude-radius-sm) 4px var(--claude-radius-sm);
  padding: 12px 16px;
  white-space: pre-wrap;
  word-break: break-word;
  border: 1px solid rgba(254, 154, 0, 0.2);
}

.claude-message-assistant {
  align-self: flex-start;
}

.claude-message-assistant .claude-message-content {
  background: var(--claude-assistant-bg);
  backdrop-filter: blur(10px);
  -webkit-backdrop-filter: blur(10px);
  border-radius: 4px var(--claude-radius-sm) var(--claude-radius-sm) var(--claude-radius-sm);
  padding: 12px 16px;
  border: 1px solid var(--claude-border);
}

.claude-message-system {
  align-self: center;
}

.claude-message-system-content {
  background: var(--claude-system-bg);
  border-radius: 20px;
  padding: 8px 16px;
  font-size: 12px;
  color: var(--claude-text-muted);
  border: 1px solid var(--claude-border);
}

.claude-cursor {
  display: inline-block;
  width: 3px;
  height: 18px;
  background: linear-gradient(180deg, var(--claude-primary) 0%, #FBBF24 100%);
  margin-left: 4px;
  border-radius: 2px;
  animation: claude-cursor-blink 1s ease-in-out infinite;
  box-shadow: 0 0 10px var(--claude-primary-glow);
}

@keyframes claude-cursor-blink {
  0%, 100% { opacity: 1; }
  50% { opacity: 0.3; }
}

/* Scrollbar */
.claude-messages::-webkit-scrollbar {
  width: 6px;
}

.claude-messages::-webkit-scrollbar-track {
  background: transparent;
}

.claude-messages::-webkit-scrollbar-thumb {
  background: var(--claude-border);
  border-radius: 3px;
}

.claude-messages::-webkit-scrollbar-thumb:hover {
  background: var(--claude-text-dim);
}

@media (max-width: 640px) {
  .claude-messages {
    padding: 90px 16px 160px;
  }
}
</style>
