<script lang="ts" setup>
import { computed } from 'vue'
import { marked } from 'marked'

const props = defineProps<{
  content: string
}>()

// Configure marked for safe rendering
marked.setOptions({
  breaks: true, // Convert \n to <br>
  gfm: true, // GitHub Flavored Markdown
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
  @apply text-sm font-sans leading-relaxed;
}

.markdown-content h1 {
  @apply text-xl font-bold mt-4 mb-2;
}

.markdown-content h2 {
  @apply text-lg font-bold mt-3 mb-2;
}

.markdown-content h3 {
  @apply text-base font-semibold mt-2 mb-1;
}

.markdown-content p {
  @apply my-2;
}

.markdown-content ul,
.markdown-content ol {
  @apply my-2 ml-4;
}

.markdown-content ul {
  @apply list-disc;
}

.markdown-content ol {
  @apply list-decimal;
}

.markdown-content li {
  @apply my-1;
}

.markdown-content code {
  @apply font-mono text-xs bg-neutral-200 dark:bg-neutral-700 px-1.5 py-0.5 rounded;
}

.markdown-content pre {
  @apply my-2 p-3 bg-neutral-100 dark:bg-neutral-800 rounded-lg overflow-x-auto;
}

.markdown-content pre code {
  @apply bg-transparent p-0;
}

.markdown-content blockquote {
  @apply my-2 pl-4 border-l-4 border-neutral-300 dark:border-neutral-600 italic;
}

.markdown-content a {
  @apply text-blue-500 hover:underline;
}

.markdown-content table {
  @apply my-2 w-full border-collapse;
}

.markdown-content th,
.markdown-content td {
  @apply border border-neutral-300 dark:border-neutral-600 px-2 py-1 text-left;
}

.markdown-content th {
  @apply bg-neutral-100 dark:bg-neutral-800 font-semibold;
}

.markdown-content hr {
  @apply my-4 border-neutral-300 dark:border-neutral-600;
}

.markdown-content img {
  @apply max-w-full h-auto rounded;
}
</style>
