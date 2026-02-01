<script setup lang="ts">
import { computed } from 'vue'
import { marked } from 'marked'

const props = defineProps<{
  content: string
}>()

// Configure marked for safe rendering
marked.setOptions({
  breaks: true,
  gfm: true,
})

const renderedContent = computed(() => {
  if (!props.content) return ''
  try {
    return marked.parse(props.content) as string
  }
  catch (e) {
    console.error('Markdown parsing error:', e)
    return props.content
  }
})
</script>

<template>
  <div
    class="markdown-content"
    v-html="renderedContent"
  />
</template>

<style>
.markdown-content {
  font-size: 14px;
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
  line-height: 1.625;
  word-break: break-word;
}

/* Headers */
.markdown-content h1 {
  font-size: 1.25rem;
  font-weight: 700;
  margin-top: 1rem;
  margin-bottom: 0.5rem;
}

.markdown-content h2 {
  font-size: 1.125rem;
  font-weight: 700;
  margin-top: 0.75rem;
  margin-bottom: 0.5rem;
}

.markdown-content h3 {
  font-size: 1rem;
  font-weight: 600;
  margin-top: 0.5rem;
  margin-bottom: 0.25rem;
}

/* Paragraphs */
.markdown-content p {
  margin: 0.5rem 0;
}

/* Lists */
.markdown-content ul,
.markdown-content ol {
  margin: 0.5rem 0;
  margin-left: 1rem;
}

.markdown-content ul {
  list-style-type: disc;
}

.markdown-content ol {
  list-style-type: decimal;
}

.markdown-content li {
  margin: 0.25rem 0;
}

/* Inline code */
.markdown-content code {
  font-family: 'SF Mono', Monaco, 'Cascadia Code', Consolas, monospace;
  font-size: 0.75rem;
  background: rgba(255, 255, 255, 0.1);
  padding: 0.125rem 0.375rem;
  border-radius: 4px;
}

/* Code blocks */
.markdown-content pre {
  margin: 0.5rem 0;
  padding: 0.75rem;
  background: rgba(0, 0, 0, 0.3);
  border-radius: 8px;
  overflow-x: auto;
}

.markdown-content pre code {
  background: transparent;
  padding: 0;
  font-size: 0.8rem;
  line-height: 1.5;
}

/* Blockquotes */
.markdown-content blockquote {
  margin: 0.5rem 0;
  padding-left: 1rem;
  border-left: 4px solid rgba(255, 255, 255, 0.2);
  font-style: italic;
  color: var(--claude-text-muted, #a0a0a0);
}

/* Links */
.markdown-content a {
  color: #3b82f6;
  text-decoration: none;
}

.markdown-content a:hover {
  text-decoration: underline;
}

/* Tables */
.markdown-content table {
  margin: 0.5rem 0;
  width: 100%;
  border-collapse: collapse;
  font-size: 0.875rem;
}

.markdown-content th,
.markdown-content td {
  border: 1px solid rgba(255, 255, 255, 0.15);
  padding: 0.5rem 0.75rem;
  text-align: left;
}

.markdown-content th {
  background: rgba(255, 255, 255, 0.05);
  font-weight: 600;
}

.markdown-content tr:nth-child(even) {
  background: rgba(255, 255, 255, 0.02);
}

/* Horizontal rules */
.markdown-content hr {
  margin: 1rem 0;
  border: none;
  border-top: 1px solid rgba(255, 255, 255, 0.15);
}

/* Images */
.markdown-content img {
  max-width: 100%;
  height: auto;
  border-radius: 8px;
}

/* First/last child margin cleanup */
.markdown-content > *:first-child {
  margin-top: 0;
}

.markdown-content > *:last-child {
  margin-bottom: 0;
}
</style>
