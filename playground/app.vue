<script lang="ts" setup>
import { ref } from 'vue'

const features = [
  {
    icon: '💬',
    title: 'Chat with Claude',
    description: 'Interact with Claude AI directly from your DevTools. Ask questions, get code suggestions, and debug issues conversationally.',
  },
  {
    icon: '🎯',
    title: 'Component Context',
    description: 'Select Vue components directly from the page to provide context. Claude understands your component structure and can help refactor or extend it.',
  },
  {
    icon: '📚',
    title: 'Project Docs',
    description: 'Reference your project documentation with @docs/ autocomplete. Claude reads your docs to give contextual answers.',
  },
  {
    icon: '⚡',
    title: 'Slash Commands',
    description: 'Use /commands for quick actions. Create custom commands in .claude/commands/ to automate repetitive tasks.',
  },
  {
    icon: '🔌',
    title: 'MCP Servers',
    description: 'Extend Claude with Model Context Protocol servers. Connect to databases, APIs, or custom tools.',
  },
  {
    icon: '🤖',
    title: 'Custom Agents',
    description: 'Define specialized agents for different tasks. Each agent has its own model, prompt, and allowed tools.',
  },
  {
    icon: '🎨',
    title: 'Skills System',
    description: 'Create reusable skills that Claude applies automatically based on context. Perfect for coding standards and patterns.',
  },
  {
    icon: '🎙️',
    title: 'Voice Input',
    description: 'Speak your questions naturally. Voice recognition with support for multiple languages.',
  },
]

const quickStart = [
  { step: '1', text: 'Install Claude Code CLI', code: 'npm install -g @anthropic-ai/claude-code' },
  { step: '2', text: 'Install the module', code: 'npm install -D @oro.ad/nuxt-claude-devtools' },
  { step: '3', text: 'Add to nuxt.config.ts', code: 'modules: [\'@oro.ad/nuxt-claude-devtools\']' },
  { step: '4', text: 'Open DevTools', code: 'Press Shift + Option + D' },
]

const npmPackage = '@oro.ad/nuxt-claude-devtools'
const repoUrl = 'https://github.com/oro-ad/nuxt-claude-devtools'

const activeDemo = ref<string | null>(null)
</script>

<template>
  <div class="app">
    <!-- Hero Section -->
    <header class="hero">
      <div class="hero-content">
        <div class="logo">
          <span class="logo-nuxt">Nuxt</span>
          <span class="logo-plus">+</span>
          <span class="logo-claude">Claude</span>
        </div>
        <h1>AI-Powered DevTools</h1>
        <p class="tagline">
          Bring Claude AI directly into your Nuxt development workflow.
          Chat, debug, and build faster with context-aware assistance.
        </p>
        <!-- Badges -->
        <div class="badges">
          <a
            :href="`https://npmjs.com/package/${npmPackage}`"
            target="_blank"
          >
            <img
              :src="`https://img.shields.io/npm/v/${npmPackage}/latest.svg?style=flat&colorA=18181B&colorB=28CF8D`"
              alt="npm version"
            >
          </a>
          <a
            :href="`https://npmjs.com/package/${npmPackage}`"
            target="_blank"
          >
            <img
              :src="`https://img.shields.io/npm/dm/${npmPackage}.svg?style=flat&colorA=18181B&colorB=28CF8D`"
              alt="npm downloads"
            >
          </a>
          <a
            :href="repoUrl"
            target="_blank"
          >
            <img
              alt="Nuxt"
              src="https://img.shields.io/badge/Nuxt-18181B?logo=nuxt"
            >
          </a>
        </div>

        <div class="hero-actions">
          <a
            :href="repoUrl"
            class="btn btn-primary"
            target="_blank"
          >
            <span>📦</span> Get Started
          </a>
          <a
            :href="`https://npmjs.com/package/${npmPackage}`"
            class="btn btn-secondary"
            target="_blank"
          >
            <span>📊</span> View on npm
          </a>
        </div>
      </div>
      <div class="hero-visual">
        <div class="devtools-preview">
          <div class="preview-header">
            <div class="preview-dots">
              <span /><span /><span />
            </div>
            <span class="preview-title">Nuxt DevTools — Claude AI</span>
          </div>
          <div class="preview-content">
            <div class="chat-bubble user">
              How do I add authentication to this component?
            </div>
            <div class="chat-bubble assistant">
              <span class="typing">Looking at your UserCard component, I can help you add authentication...</span>
            </div>
          </div>
        </div>
      </div>
    </header>

    <!-- Features Section -->
    <section class="features">
      <h2>Everything you need</h2>
      <p class="section-subtitle">
        A complete AI assistant integrated into your development environment
      </p>
      <div class="features-grid">
        <div
          v-for="feature in features"
          :key="feature.title"
          class="feature-card"
        >
          <span class="feature-icon">{{ feature.icon }}</span>
          <h3>{{ feature.title }}</h3>
          <p>{{ feature.description }}</p>
        </div>
      </div>
    </section>

    <!-- Quick Start Section -->
    <section class="quickstart">
      <h2>Quick Start</h2>
      <p class="section-subtitle">
        Get up and running in under a minute
      </p>
      <div class="steps">
        <div
          v-for="item in quickStart"
          :key="item.step"
          class="step"
        >
          <div class="step-number">
            {{ item.step }}
          </div>
          <div class="step-content">
            <p class="step-text">
              {{ item.text }}
            </p>
            <code class="step-code">{{ item.code }}</code>
          </div>
        </div>
      </div>
    </section>

    <!-- CTA Section -->
    <section class="cta">
      <h2>Ready to supercharge your development?</h2>
      <p>Join developers using Claude to build better Nuxt applications faster.</p>
      <div class="cta-actions">
        <a
          :href="repoUrl"
          class="btn btn-primary btn-large"
          target="_blank"
        >
          Get Started Free
        </a>
        <a
          :href="`https://npmjs.com/package/${npmPackage}`"
          class="btn btn-outline btn-large"
          target="_blank"
        >
          View on npm
        </a>
      </div>
    </section>

    <!-- Footer -->
    <footer class="footer">
      <div class="footer-content">
        <p>
          Built with ❤️ by
          <a
            href="https://t.me/jobsbystr"
            target="_blank"
          >Simon Bystrov</a>
          ·
          Powered by
          <a
            href="https://claude.ai"
            target="_blank"
          >Claude</a>
        </p>
        <div class="footer-links">
          <a
            :href="repoUrl"
            target="_blank"
          >GitHub</a>
          <a
            :href="`https://npmjs.com/package/${npmPackage}`"
            target="_blank"
          >npm</a>
          <a
            href="https://nuxt.com"
            target="_blank"
          >Nuxt</a>
        </div>
      </div>
    </footer>
  </div>
</template>

<style>
:root {
  --color-primary: #10a37f;
  --color-primary-dark: #0d8a6a;
  --color-nuxt: #00dc82;
  --color-claude: #d97706;
  --color-bg: #0f0f0f;
  --color-bg-elevated: #1a1a1a;
  --color-bg-card: #242424;
  --color-text: #ffffff;
  --color-text-muted: #a0a0a0;
  --color-border: #333333;
  --radius: 12px;
  --radius-sm: 8px;
}

* {
  box-sizing: border-box;
  margin: 0;
  padding: 0;
}

body {
  font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
  background: var(--color-bg);
  color: var(--color-text);
  line-height: 1.6;
}

.app {
  min-height: 100vh;
}

/* Hero Section */
.hero {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 60px;
  max-width: 1200px;
  margin: 0 auto;
  padding: 80px 40px;
  align-items: center;
}

.logo {
  font-size: 14px;
  font-weight: 600;
  letter-spacing: 2px;
  text-transform: uppercase;
  margin-bottom: 20px;
}

.logo-nuxt {
  color: var(--color-nuxt);
}

.logo-plus {
  color: var(--color-text-muted);
  margin: 0 8px;
}

.logo-claude {
  color: var(--color-claude);
}

.hero h1 {
  font-size: 56px;
  font-weight: 700;
  line-height: 1.1;
  margin-bottom: 20px;
  background: linear-gradient(135deg, #fff 0%, #a0a0a0 100%);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
}

.tagline {
  font-size: 20px;
  color: var(--color-text-muted);
  margin-bottom: 32px;
  max-width: 500px;
}

.badges {
  display: flex;
  flex-wrap: wrap;
  gap: 12px;
  margin-bottom: 24px;
}

.badges a {
  display: block;
  height: 24px;
}

.badges img {
  height: 24px;
}

.hero-actions {
  display: flex;
  gap: 16px;
}

.btn {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  padding: 14px 28px;
  border-radius: var(--radius);
  font-size: 16px;
  font-weight: 500;
  text-decoration: none;
  cursor: pointer;
  transition: all 0.2s;
  border: none;
}

.btn-primary {
  background: var(--color-primary);
  color: white;
}

.btn-primary:hover {
  background: var(--color-primary-dark);
  transform: translateY(-2px);
}

.btn-secondary {
  background: var(--color-bg-card);
  color: var(--color-text);
  border: 1px solid var(--color-border);
}

.btn-secondary:hover {
  background: var(--color-bg-elevated);
  border-color: var(--color-text-muted);
}

.btn-outline {
  background: transparent;
  color: var(--color-text);
  border: 1px solid var(--color-border);
}

.btn-outline:hover {
  border-color: var(--color-primary);
  color: var(--color-primary);
}

.btn-large {
  padding: 18px 36px;
  font-size: 18px;
}

/* DevTools Preview */
.devtools-preview {
  background: var(--color-bg-elevated);
  border-radius: var(--radius);
  border: 1px solid var(--color-border);
  overflow: hidden;
  box-shadow: 0 20px 60px rgba(0, 0, 0, 0.5);
}

.preview-header {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 12px 16px;
  background: var(--color-bg-card);
  border-bottom: 1px solid var(--color-border);
}

.preview-dots {
  display: flex;
  gap: 6px;
}

.preview-dots span {
  width: 12px;
  height: 12px;
  border-radius: 50%;
  background: var(--color-border);
}

.preview-dots span:nth-child(1) {
  background: #ff5f57;
}

.preview-dots span:nth-child(2) {
  background: #ffbd2e;
}

.preview-dots span:nth-child(3) {
  background: #28ca41;
}

.preview-title {
  font-size: 13px;
  color: var(--color-text-muted);
}

.preview-content {
  padding: 24px;
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.chat-bubble {
  padding: 12px 16px;
  border-radius: var(--radius-sm);
  max-width: 85%;
  font-size: 14px;
}

.chat-bubble.user {
  background: rgba(16, 163, 127, 0.2);
  color: #6ee7b7;
  align-self: flex-end;
}

.chat-bubble.assistant {
  background: var(--color-bg-card);
  color: var(--color-text-muted);
  align-self: flex-start;
}

.typing::after {
  content: '|';
  animation: blink 1s infinite;
}

@keyframes blink {
  0%, 50% {
    opacity: 1;
  }
  51%, 100% {
    opacity: 0;
  }
}

/* Features Section */
.features {
  padding: 100px 40px;
  max-width: 1200px;
  margin: 0 auto;
}

.features h2,
.quickstart h2,
.demo-section h2,
.cta h2 {
  font-size: 40px;
  text-align: center;
  margin-bottom: 12px;
}

.section-subtitle {
  text-align: center;
  color: var(--color-text-muted);
  font-size: 18px;
  margin-bottom: 48px;
}

.features-grid {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 24px;
}

.feature-card {
  background: var(--color-bg-elevated);
  border: 1px solid var(--color-border);
  border-radius: var(--radius);
  padding: 24px;
  transition: all 0.2s;
}

.feature-card:hover {
  border-color: var(--color-primary);
  transform: translateY(-4px);
}

.feature-icon {
  font-size: 32px;
  display: block;
  margin-bottom: 16px;
}

.feature-card h3 {
  font-size: 18px;
  margin-bottom: 8px;
}

.feature-card p {
  font-size: 14px;
  color: var(--color-text-muted);
  line-height: 1.5;
}

/* Quick Start Section */
.quickstart {
  padding: 100px 40px;
  background: var(--color-bg-elevated);
}

.steps {
  max-width: 600px;
  margin: 0 auto;
  display: flex;
  flex-direction: column;
  gap: 24px;
}

.step {
  display: flex;
  gap: 20px;
  align-items: flex-start;
}

.step-number {
  width: 40px;
  height: 40px;
  border-radius: 50%;
  background: var(--color-primary);
  color: white;
  display: flex;
  align-items: center;
  justify-content: center;
  font-weight: 600;
  flex-shrink: 0;
}

.step-content {
  flex: 1;
}

.step-text {
  font-size: 16px;
  margin-bottom: 8px;
}

.step-code {
  display: block;
  background: var(--color-bg);
  padding: 12px 16px;
  border-radius: var(--radius-sm);
  font-family: 'Fira Code', monospace;
  font-size: 14px;
  color: var(--color-nuxt);
  border: 1px solid var(--color-border);
}

/* Demo Section */
.demo-section {
  padding: 100px 40px;
  max-width: 1200px;
  margin: 0 auto;
}

.demo-components {
  display: flex;
  gap: 24px;
  justify-content: center;
  flex-wrap: wrap;
}

.demo-note {
  text-align: center;
  margin-top: 24px;
  color: var(--color-primary);
  font-size: 14px;
}

/* CTA Section */
.cta {
  padding: 100px 40px;
  text-align: center;
  background: linear-gradient(180deg, var(--color-bg) 0%, var(--color-bg-elevated) 100%);
}

.cta p {
  color: var(--color-text-muted);
  font-size: 18px;
  margin-bottom: 32px;
}

.cta-actions {
  display: flex;
  gap: 16px;
  justify-content: center;
}

/* Footer */
.footer {
  padding: 40px;
  border-top: 1px solid var(--color-border);
}

.footer-content {
  max-width: 1200px;
  margin: 0 auto;
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.footer p {
  color: var(--color-text-muted);
  font-size: 14px;
}

.footer a {
  color: var(--color-primary);
  text-decoration: none;
}

.footer a:hover {
  text-decoration: underline;
}

.footer-links {
  display: flex;
  gap: 24px;
}

.footer-links a {
  color: var(--color-text-muted);
}

.footer-links a:hover {
  color: var(--color-text);
}

/* Responsive */
@media (max-width: 1024px) {
  .hero {
    grid-template-columns: 1fr;
    text-align: center;
    padding: 60px 24px;
  }

  .tagline {
    margin: 0 auto 32px;
  }

  .hero-actions {
    justify-content: center;
  }

  .hero-visual {
    display: none;
  }

  .features-grid {
    grid-template-columns: repeat(2, 1fr);
  }
}

@media (max-width: 640px) {
  .hero {
    padding: 40px 16px;
  }

  .hero h1 {
    font-size: 36px;
  }

  .badges {
    justify-content: center;
  }

  .features {
    padding: 60px 16px;
  }

  .quickstart {
    padding: 60px 16px;
  }

  .features-grid {
    grid-template-columns: 1fr;
  }

  .cta {
    padding: 60px 16px;
  }

  .cta-actions {
    flex-direction: column;
    align-items: center;
  }

  .footer-content {
    flex-direction: column;
    gap: 16px;
    text-align: center;
  }
}
</style>
