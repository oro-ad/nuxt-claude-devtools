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
/* ═══════════════════════════════════════════════════════════════════════════
   MARKDOWN CONTENT - Glassmorphism styled markdown rendering
   ═══════════════════════════════════════════════════════════════════════════ */

.markdown-content {
  font-size: 14px;
  font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
  line-height: 1.7;
  word-break: break-word;
  color: rgba(255, 255, 255, 0.92);
}

/* Headers - with gradient text */
.markdown-content h1 {
  font-size: 1.35rem;
  font-weight: 700;
  margin-top: 1.25rem;
  margin-bottom: 0.625rem;
  background: linear-gradient(135deg, #fff 0%, rgba(255, 255, 255, 0.75) 100%);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
}

.markdown-content h2 {
  font-size: 1.2rem;
  font-weight: 700;
  margin-top: 1rem;
  margin-bottom: 0.5rem;
  background: linear-gradient(135deg, #fff 0%, rgba(255, 255, 255, 0.8) 100%);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
}

.markdown-content h3 {
  font-size: 1.05rem;
  font-weight: 600;
  margin-top: 0.75rem;
  margin-bottom: 0.375rem;
  color: rgba(255, 255, 255, 0.95);
}

/* Paragraphs */
.markdown-content p {
  margin: 0.625rem 0;
}

/* Lists */
.markdown-content ul,
.markdown-content ol {
  margin: 0.625rem 0;
  margin-left: 1.25rem;
}

.markdown-content ul {
  list-style-type: disc;
}

.markdown-content ol {
  list-style-type: decimal;
}

.markdown-content li {
  margin: 0.375rem 0;
  color: rgba(255, 255, 255, 0.88);
}

.markdown-content li::marker {
  color: rgba(254, 154, 0, 0.7);
}

/* Inline code - glass style */
.markdown-content code {
  font-family: 'JetBrains Mono', 'Fira Code', 'SF Mono', Monaco, monospace;
  font-size: 0.8rem;
  background: rgba(254, 154, 0, 0.12);
  border: 1px solid rgba(254, 154, 0, 0.2);
  padding: 0.15rem 0.45rem;
  border-radius: 6px;
  color: #FCD34D;
}

/* Code blocks - frosted glass container */
.markdown-content pre {
  margin: 0.75rem 0;
  padding: 1rem 1.125rem;
  background: rgba(0, 0, 0, 0.35);
  backdrop-filter: blur(10px);
  -webkit-backdrop-filter: blur(10px);
  border: 1px solid rgba(255, 255, 255, 0.08);
  border-radius: 12px;
  overflow-x: auto;
  box-shadow: inset 0 1px 0 rgba(255, 255, 255, 0.05);
}

.markdown-content pre code {
  background: transparent;
  border: none;
  padding: 0;
  font-size: 0.825rem;
  line-height: 1.6;
  color: #e2e8f0;
}

/* Blockquotes - glass accent border */
.markdown-content blockquote {
  margin: 0.75rem 0;
  padding: 0.75rem 1rem;
  padding-left: 1.25rem;
  background: rgba(254, 154, 0, 0.08);
  border-left: 3px solid rgba(254, 154, 0, 0.5);
  border-radius: 0 10px 10px 0;
  font-style: italic;
  color: rgba(255, 255, 255, 0.7);
}

.markdown-content blockquote p {
  margin: 0;
}

/* Links - gradient hover effect */
.markdown-content a {
  color: #FBBF24;
  text-decoration: none;
  transition: all 0.2s ease;
  border-bottom: 1px solid transparent;
}

.markdown-content a:hover {
  color: #FCD34D;
  border-bottom-color: rgba(254, 154, 0, 0.5);
  text-shadow: 0 0 12px rgba(254, 154, 0, 0.4);
}

/* Tables - glass styled */
.markdown-content table {
  margin: 0.75rem 0;
  width: 100%;
  border-collapse: separate;
  border-spacing: 0;
  font-size: 0.875rem;
  border-radius: 10px;
  overflow: hidden;
  border: 1px solid rgba(255, 255, 255, 0.1);
}

.markdown-content th,
.markdown-content td {
  border: none;
  border-bottom: 1px solid rgba(255, 255, 255, 0.08);
  padding: 0.625rem 0.875rem;
  text-align: left;
}

.markdown-content th {
  background: rgba(254, 154, 0, 0.15);
  font-weight: 600;
  color: rgba(255, 255, 255, 0.95);
  font-size: 0.8rem;
  text-transform: uppercase;
  letter-spacing: 0.03em;
}

.markdown-content tr:last-child td {
  border-bottom: none;
}

.markdown-content tr:nth-child(even) {
  background: rgba(255, 255, 255, 0.03);
}

.markdown-content tr:hover {
  background: rgba(254, 154, 0, 0.08);
}

/* Horizontal rules - gradient line */
.markdown-content hr {
  margin: 1.25rem 0;
  border: none;
  height: 1px;
  background: linear-gradient(
    90deg,
    transparent 0%,
    rgba(254, 154, 0, 0.4) 20%,
    rgba(59, 130, 246, 0.4) 80%,
    transparent 100%
  );
}

/* Images - rounded with shadow */
.markdown-content img {
  max-width: 100%;
  height: auto;
  border-radius: 12px;
  box-shadow: 0 8px 25px rgba(0, 0, 0, 0.3);
  border: 1px solid rgba(255, 255, 255, 0.1);
}

/* Strong/Bold */
.markdown-content strong {
  font-weight: 600;
  color: rgba(255, 255, 255, 0.98);
}

/* Emphasis/Italic */
.markdown-content em {
  color: rgba(255, 255, 255, 0.85);
}

/* First/last child margin cleanup */
.markdown-content > *:first-child {
  margin-top: 0;
}

.markdown-content > *:last-child {
  margin-bottom: 0;
}
</style>
