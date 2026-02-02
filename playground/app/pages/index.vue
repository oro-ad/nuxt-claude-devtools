<!-- eslint-disable vue/multi-word-component-names -->
<script lang="ts" setup>
import { computed, onMounted, onUnmounted, ref } from 'vue'
import { useI18n } from '#imports'

const { t } = useI18n()

// Scroll reveal
const revealElements = ref<Element[]>([])

function handleIntersection(entries: IntersectionObserverEntry[]) {
  entries.forEach((entry) => {
    if (entry.isIntersecting) {
      entry.target.classList.add('revealed')
    }
  })
}

let observer: IntersectionObserver | null = null

onMounted(() => {
  observer = new IntersectionObserver(handleIntersection, {
    threshold: 0.1,
    rootMargin: '0px 0px -50px 0px',
  })

  document.querySelectorAll('.reveal').forEach((el) => {
    observer?.observe(el)
  })
})

onUnmounted(() => {
  observer?.disconnect()
})

const features = computed(() => [
  {
    icon: '💬',
    key: 'chat',
    title: t('features.chat.title'),
    description: t('features.chat.description'),
  },
  {
    icon: '🌐',
    key: 'context',
    title: t('features.context.title'),
    description: t('features.context.description'),
  },
  {
    icon: '👥',
    key: 'collab',
    title: t('features.collab.title'),
    description: t('features.collab.description'),
  },
  {
    icon: '📚',
    key: 'docs',
    title: t('features.docs.title'),
    description: t('features.docs.description'),
  },
  {
    icon: '⚡',
    key: 'commands',
    title: t('features.commands.title'),
    description: t('features.commands.description'),
  },
  {
    icon: '🔌',
    key: 'mcp',
    title: t('features.mcp.title'),
    description: t('features.mcp.description'),
  },
  {
    icon: '🤖',
    key: 'agents',
    title: t('features.agents.title'),
    description: t('features.agents.description'),
  },
  {
    icon: '🎨',
    key: 'skills',
    title: t('features.skills.title'),
    description: t('features.skills.description'),
  },
  {
    icon: '🎙️',
    key: 'voice',
    title: t('features.voice.title'),
    description: t('features.voice.description'),
  },
  {
    icon: '🧩',
    key: 'plugins',
    title: t('features.plugins.title'),
    description: t('features.plugins.description'),
  },
])

const quickStart = computed(() => [
  { step: '1', text: t('quickstart.step1'), code: 'npm install -g @anthropic-ai/claude-code' },
  { step: '2', text: t('quickstart.step2'), code: 'npm install -D @oro.ad/nuxt-claude-devtools' },
  { step: '3', text: t('quickstart.step3'), code: 'modules: [\'@oro.ad/nuxt-claude-devtools\']' },
  { step: '4', text: t('quickstart.step4'), code: 'Press Shift + Option + D' },
])

const npmPackage = '@oro.ad/nuxt-claude-devtools'
const repoUrl = 'https://github.com/oro-ad/nuxt-claude-devtools'
const docsUrl = 'https://nuxt-claude-devtools.oro.ad/'
const nuxtModulesUrl = 'https://nuxt.com/modules/nuxt-claude-devtools'
</script>

<template>
  <div class="app">
    <!-- Floating Orbs (wow effect) -->
    <div class="floating-orbs">
      <div class="orb orb-1" />
      <div class="orb orb-2" />
      <div class="orb orb-3" />
    </div>

    <!-- Settings Bar -->
    <div class="settings-bar">
      <ThemeToggle />
      <LanguageSwitcher />
    </div>

    <!-- Hero Section -->
    <header class="hero">
      <div class="hero-content reveal reveal-left">
        <div class="logo">
          <span class="logo-nuxt">Nuxt</span>
          <span class="logo-plus">+</span>
          <span class="logo-claude">Claude</span>
        </div>
        <h1>{{ t('hero.title') }}</h1>
        <p class="tagline">
          {{ t('hero.tagline') }}
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
            :href="docsUrl"
            class="btn btn-primary"
            target="_blank"
          >
            <span>✨</span> {{ t('hero.see_more') || 'See More' }}
          </a>
          <a
            :href="`https://npmjs.com/package/${npmPackage}`"
            class="btn btn-secondary"
            target="_blank"
          >
            <span>📊</span> {{ t('hero.view_npm') }}
          </a>
        </div>
      </div>
      <div class="hero-visual reveal reveal-right">
        <div class="devtools-preview">
          <div class="preview-header">
            <div class="preview-dots">
              <span /><span /><span />
            </div>
            <span class="preview-title">{{ t('hero.preview_title') }}</span>
          </div>
          <div class="preview-content">
            <div class="chat-bubble user">
              {{ t('hero.preview_user') }}
            </div>
            <div class="chat-bubble assistant">
              <span class="typing">{{ t('hero.preview_assistant') }}</span>
            </div>
          </div>
        </div>
      </div>
    </header>

    <!-- Features Section -->
    <section class="features">
      <h2 class="reveal reveal-up">{{ t('features.section_title') }}</h2>
      <p class="section-subtitle reveal reveal-up">
        {{ t('features.section_subtitle') }}
      </p>
      <div class="features-grid">
        <div
          v-for="(feature, index) in features"
          :key="feature.key"
          :style="{ transitionDelay: `${index * 0.05}s` }"
          class="feature-card reveal reveal-up"
        >
          <span class="feature-icon">{{ feature.icon }}</span>
          <h3>{{ feature.title }}</h3>
          <p>{{ feature.description }}</p>
        </div>
      </div>
    </section>

    <!-- Collaborative Section -->
    <section class="collaborative">
      <div class="collab-content">
        <div class="collab-text reveal reveal-left">
          <span class="collab-badge">{{ t('collaborative.badge') }}</span>
          <h2>{{ t('collaborative.title') }}</h2>
          <p class="collab-description">
            {{ t('collaborative.description') }}
          </p>
          <ul class="collab-features">
            <li>
              <span class="collab-icon">🌐</span>
              {{ t('collaborative.feature1') }}
            </li>
            <li>
              <span class="collab-icon">🔗</span>
              {{ t('collaborative.feature2') }}
            </li>
            <li>
              <span class="collab-icon">📱</span>
              {{ t('collaborative.feature3') }}
            </li>
          </ul>
        </div>
        <div class="collab-visual reveal reveal-right">
          <div class="collab-demo">
            <div class="demo-terminal">
              <div class="terminal-header">
                <span class="terminal-dot red" />
                <span class="terminal-dot yellow" />
                <span class="terminal-dot green" />
                <span class="terminal-title">Terminal</span>
              </div>
              <div class="terminal-body">
                <code><span class="terminal-prompt">$</span> cloudflared tunnel --url localhost:3000</code>
                <code class="terminal-output terminal-link">https://abc-xyz.trycloudflare.com</code>
                <code class="terminal-comment"># {{ t('collaborative.copy_host') }}</code>
                <code><span class="terminal-prompt">$</span> DEV_TUNNEL_HOST=abc-xyz.trycloudflare.com npm run
                  dev</code>
              </div>
            </div>
            <div class="demo-share">
              <span class="share-icon">📤</span>
              <span class="share-text">{{ t('collaborative.share_link') }}</span>
            </div>
          </div>
        </div>
      </div>
    </section>

    <!-- Modes Section -->
    <section class="modes">
      <h2 class="reveal reveal-up">{{ t('modes.section_title') }}</h2>
      <p class="section-subtitle reveal reveal-up">
        {{ t('modes.section_subtitle') }}
      </p>
      <div class="modes-grid">
        <div class="mode-card mode-light reveal reveal-left">
          <div class="mode-badge">
            {{ t('modes.light.badge') }}
          </div>
          <span class="mode-icon">✨</span>
          <h3>{{ t('modes.light.title') }}</h3>
          <p class="mode-description">
            {{ t('modes.light.description') }}
          </p>
          <ul class="mode-features">
            <li>{{ t('modes.light.feature1') }}</li>
            <li>{{ t('modes.light.feature2') }}</li>
            <li>{{ t('modes.light.feature3') }}</li>
          </ul>
          <div class="mode-code">
            <span class="code-label">nuxt.config.ts</span>
            <code>claudeDevtools: { overlay: { enabled: true } }</code>
          </div>
        </div>
        <div class="mode-card mode-devtools reveal reveal-right">
          <div class="mode-badge">
            {{ t('modes.devtools.badge') }}
          </div>
          <span class="mode-icon">🛠️</span>
          <h3>{{ t('modes.devtools.title') }}</h3>
          <p class="mode-description">
            {{ t('modes.devtools.description') }}
          </p>
          <ul class="mode-features">
            <li>{{ t('modes.devtools.feature1') }}</li>
            <li>{{ t('modes.devtools.feature2') }}</li>
            <li>{{ t('modes.devtools.feature3') }}</li>
          </ul>
          <div class="mode-code">
            <span class="code-label">nuxt.config.ts</span>
            <code>devtools: { enabled: true }</code>
          </div>
        </div>
      </div>
    </section>

    <!-- Quick Start Section -->
    <section class="quickstart">
      <h2 class="reveal reveal-up">{{ t('quickstart.title') }}</h2>
      <p class="section-subtitle reveal reveal-up">
        {{ t('quickstart.subtitle') }}
      </p>
      <div class="steps">
        <div
          v-for="(item, index) in quickStart"
          :key="item.step"
          :style="{ transitionDelay: `${index * 0.1}s` }"
          class="step reveal reveal-up"
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
      <h2 class="reveal reveal-up">{{ t('cta.title') }}</h2>
      <p class="reveal reveal-up">{{ t('cta.subtitle') }}</p>
      <div class="cta-actions reveal reveal-up">
        <a
          :href="repoUrl"
          class="btn btn-primary btn-large"
          target="_blank"
        >
          {{ t('cta.get_started') }}
        </a>
        <a
          :href="`https://npmjs.com/package/${npmPackage}`"
          class="btn btn-outline btn-large"
          target="_blank"
        >
          {{ t('cta.view_npm') }}
        </a>
      </div>
    </section>

    <!-- Footer -->
    <footer class="footer">
      <div class="footer-content">
        <p>
          {{ t('footer.built_by') }}
          <a
            href="mailto:jobsbystr@gmail.com"
          >Simon Bystrov</a>
          ·
          {{ t('footer.powered_by') }}
          <a
            href="https://claude.ai"
            target="_blank"
          >Claude</a>
        </p>
        <div class="footer-links">
          <a
            :href="docsUrl"
            target="_blank"
          >{{ t('footer.docs') }}</a>
          <a
            :href="nuxtModulesUrl"
            target="_blank"
          >{{ t('footer.nuxt_modules') }}</a>
          <a
            :href="repoUrl"
            target="_blank"
          >GitHub</a>
          <a
            :href="`https://npmjs.com/package/${npmPackage}`"
            target="_blank"
          >npm</a>
        </div>
      </div>
    </footer>
  </div>
</template>

<style scoped>
.app {
  min-height: 100vh;
  background: var(--gradient-bg);
  background-attachment: fixed;
  position: relative;
  overflow-x: hidden;
}

/* Floating Orbs - Wow Effect */
.floating-orbs {
  position: fixed;
  inset: 0;
  pointer-events: none;
  z-index: 0;
  overflow: hidden;
}

.orb {
  position: absolute;
  border-radius: 50%;
  filter: blur(80px);
  opacity: 0.5;
  animation: float 20s ease-in-out infinite;
}

.orb-1 {
  width: 400px;
  height: 400px;
  background: radial-gradient(circle, rgba(254, 154, 0, 0.3), transparent 70%);
  top: -100px;
  right: -100px;
  animation-delay: 0s;
}

.orb-2 {
  width: 300px;
  height: 300px;
  background: radial-gradient(circle, rgba(255, 183, 64, 0.2), transparent 70%);
  bottom: 20%;
  left: -50px;
  animation-delay: -7s;
  animation-duration: 25s;
}

.orb-3 {
  width: 250px;
  height: 250px;
  background: radial-gradient(circle, rgba(254, 154, 0, 0.2), transparent 70%);
  top: 50%;
  right: 10%;
  animation-delay: -14s;
  animation-duration: 30s;
}

@keyframes float {
  0%, 100% {
    transform: translate(0, 0) scale(1);
  }
  25% {
    transform: translate(30px, -30px) scale(1.05);
  }
  50% {
    transform: translate(-20px, 20px) scale(0.95);
  }
  75% {
    transform: translate(20px, 10px) scale(1.02);
  }
}

/* Settings Bar */
.settings-bar {
  position: fixed;
  top: 20px;
  right: 20px;
  z-index: 100;
  display: flex;
  gap: 12px;
  align-items: center;
  padding: 8px;
  background: var(--color-bg-elevated);
  backdrop-filter: blur(var(--glass-blur));
  -webkit-backdrop-filter: blur(var(--glass-blur));
  border: 1px solid var(--color-border);
  border-radius: var(--radius);
}

/* Hero Section */
.hero {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 60px;
  max-width: 1200px;
  margin: 0 auto;
  padding: 100px 40px;
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
  text-shadow: 0 0 20px rgba(0, 220, 130, 0.5);
}

.logo-plus {
  color: var(--color-text-muted);
  margin: 0 8px;
}

.logo-claude {
  color: var(--color-claude);
  text-shadow: 0 0 20px rgba(217, 119, 6, 0.5);
}

.hero h1 {
  font-size: 56px;
  font-weight: 700;
  line-height: 1.1;
  margin-bottom: 20px;
  background: linear-gradient(135deg, var(--color-text) 0%, var(--color-text-muted) 100%);
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
  transition: all 0.3s ease;
  border: none;
}

.btn-primary {
  background: linear-gradient(135deg, var(--color-primary), #ffb740);
  color: #ffffff;
  font-weight: 600;
  box-shadow: 0 4px 20px rgba(var(--color-primary-rgb), 0.4);
  position: relative;
  overflow: hidden;
}

.btn-primary::before {
  content: '';
  position: absolute;
  top: 0;
  left: -100%;
  width: 100%;
  height: 100%;
  background: linear-gradient(90deg, transparent, rgba(255, 255, 255, 0.3), transparent);
  transition: left 0.5s ease;
}

.btn-primary:hover::before {
  left: 100%;
}

.btn-primary:hover {
  transform: translateY(-2px);
  box-shadow: 0 8px 30px rgba(254, 154, 0, 0.6);
}

.btn-secondary {
  background: var(--color-bg-card);
  backdrop-filter: blur(var(--glass-blur));
  -webkit-backdrop-filter: blur(var(--glass-blur));
  color: var(--color-text);
  border: 1px solid var(--color-border);
}

.btn-secondary:hover {
  background: var(--color-bg-elevated);
  border-color: var(--color-border-strong);
  transform: translateY(-2px);
}

.btn-outline {
  background: transparent;
  color: var(--color-text);
  border: 1px solid var(--color-border);
  backdrop-filter: blur(var(--glass-blur));
  -webkit-backdrop-filter: blur(var(--glass-blur));
}

.btn-outline:hover {
  border-color: var(--color-primary);
  color: var(--color-primary);
  background: rgba(254, 154, 0, 0.1);
}

.btn-large {
  padding: 18px 36px;
  font-size: 18px;
}

/* DevTools Preview - Glassmorphism */
.devtools-preview {
  background: var(--color-bg-elevated);
  backdrop-filter: blur(var(--glass-blur));
  -webkit-backdrop-filter: blur(var(--glass-blur));
  border-radius: var(--radius);
  border: 1px solid var(--color-border);
  overflow: hidden;
  box-shadow: var(--shadow-lg), var(--shadow-glow);
}

.preview-header {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 14px 18px;
  background: var(--color-bg-card);
  border-bottom: 1px solid var(--color-border);
}

.preview-dots {
  display: flex;
  gap: 8px;
}

.preview-dots span {
  width: 12px;
  height: 12px;
  border-radius: 50%;
  background: var(--color-border);
}

.preview-dots span:nth-child(1) {
  background: #ff5f57;
  box-shadow: 0 0 8px rgba(255, 95, 87, 0.5);
}

.preview-dots span:nth-child(2) {
  background: #ffbd2e;
  box-shadow: 0 0 8px rgba(255, 189, 46, 0.5);
}

.preview-dots span:nth-child(3) {
  background: #28ca41;
  box-shadow: 0 0 8px rgba(40, 202, 65, 0.5);
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
  padding: 14px 18px;
  border-radius: var(--radius-sm);
  max-width: 85%;
  font-size: 14px;
  backdrop-filter: blur(10px);
  -webkit-backdrop-filter: blur(10px);
}

.chat-bubble.user {
  background: rgba(254, 154, 0, 0.15);
  border: 1px solid rgba(254, 154, 0, 0.3);
  color: var(--color-primary);
  align-self: flex-end;
}

.chat-bubble.assistant {
  background: var(--color-bg-card);
  border: 1px solid var(--color-border);
  color: var(--color-text-muted);
  align-self: flex-start;
}

.typing::after {
  content: '|';
  animation: blink 1s infinite;
  color: var(--color-primary);
}

@keyframes blink {
  0%, 50% { opacity: 1; }
  51%, 100% { opacity: 0; }
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
  background: linear-gradient(135deg, var(--color-text) 0%, var(--color-text-muted) 100%);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
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
  gap: 20px;
}

.feature-card {
  background: var(--color-bg-elevated);
  backdrop-filter: blur(var(--glass-blur));
  -webkit-backdrop-filter: blur(var(--glass-blur));
  border: 1px solid var(--color-border);
  border-radius: var(--radius);
  padding: 24px;
  transition: all 0.3s ease;
}

.feature-card:hover {
  border-color: var(--color-primary);
  transform: translateY(-4px);
  box-shadow: var(--shadow-md), 0 0 30px rgba(254, 154, 0, 0.2);
}

.feature-icon {
  font-size: 36px;
  display: block;
  margin-bottom: 16px;
}

.feature-card h3 {
  font-size: 18px;
  margin-bottom: 8px;
  color: var(--color-text);
}

.feature-card p {
  font-size: 14px;
  color: var(--color-text-muted);
  line-height: 1.6;
}

/* Collaborative Section */
.collaborative {
  padding: 100px 40px;
}

.collab-content {
  max-width: 1200px;
  margin: 0 auto;
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 60px;
  align-items: center;
}

.collab-badge {
  display: inline-block;
  padding: 8px 16px;
  background: linear-gradient(135deg, var(--color-primary), #ffb740);
  border-radius: 24px;
  font-size: 12px;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 1px;
  margin-bottom: 16px;
  color: #ffffff;
  box-shadow: 0 4px 15px rgba(var(--color-primary-rgb), 0.4);
}

.collab-text h2 {
  font-size: 40px;
  margin-bottom: 16px;
  background: linear-gradient(135deg, var(--color-text) 0%, var(--color-text-muted) 100%);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
}

.collab-description {
  font-size: 18px;
  color: var(--color-text-muted);
  line-height: 1.7;
  margin-bottom: 24px;
}

.collab-features {
  list-style: none;
  padding: 0;
  margin: 0;
}

.collab-features li {
  display: flex;
  align-items: center;
  gap: 12px;
  margin-bottom: 14px;
  font-size: 16px;
  color: var(--color-text);
}

.collab-icon {
  font-size: 20px;
}

.collab-visual {
  display: flex;
  justify-content: center;
}

.collab-demo {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.demo-terminal {
  background: var(--color-bg-solid);
  backdrop-filter: blur(var(--glass-blur));
  -webkit-backdrop-filter: blur(var(--glass-blur));
  border: 1px solid var(--color-border);
  border-radius: var(--radius);
  overflow: hidden;
  min-width: 360px;
  box-shadow: var(--shadow-lg);
}

.terminal-header {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 14px 18px;
  background: var(--color-bg-card);
  border-bottom: 1px solid var(--color-border);
}

.terminal-dot {
  width: 12px;
  height: 12px;
  border-radius: 50%;
}

.terminal-dot.red {
  background: #ff5f57;
  box-shadow: 0 0 8px rgba(255, 95, 87, 0.5);
}

.terminal-dot.yellow {
  background: #ffbd2e;
  box-shadow: 0 0 8px rgba(255, 189, 46, 0.5);
}

.terminal-dot.green {
  background: #28ca41;
  box-shadow: 0 0 8px rgba(40, 202, 65, 0.5);
}

.terminal-title {
  margin-left: 8px;
  font-size: 13px;
  color: var(--color-text-muted);
}

.terminal-body {
  padding: 20px;
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.terminal-body code {
  font-family: 'Fira Code', 'JetBrains Mono', monospace;
  font-size: 13px;
  color: var(--color-text);
}

.terminal-prompt {
  color: var(--color-primary);
  margin-right: 8px;
}

.terminal-output {
  color: var(--color-text-muted);
  padding-left: 16px;
}

.terminal-link {
  color: var(--color-primary) !important;
}

.terminal-comment {
  color: var(--color-text-muted) !important;
  font-style: italic;
  opacity: 0.7;
}

.demo-share {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 10px;
  padding: 16px 24px;
  background: var(--color-bg-elevated);
  backdrop-filter: blur(var(--glass-blur));
  -webkit-backdrop-filter: blur(var(--glass-blur));
  border: 1px dashed var(--color-border-strong);
  border-radius: var(--radius);
}

.share-icon {
  font-size: 20px;
}

.share-text {
  font-size: 14px;
  color: var(--color-text-muted);
}

/* Modes Section */
.modes {
  padding: 100px 40px;
  max-width: 1200px;
  margin: 0 auto;
}

.modes h2 {
  font-size: 40px;
  text-align: center;
  margin-bottom: 12px;
  background: linear-gradient(135deg, var(--color-text) 0%, var(--color-text-muted) 100%);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
}

.modes-grid {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 32px;
  margin-top: 48px;
}

.mode-card {
  background: var(--color-bg-elevated);
  backdrop-filter: blur(var(--glass-blur));
  -webkit-backdrop-filter: blur(var(--glass-blur));
  border: 1px solid var(--color-border);
  border-radius: var(--radius);
  padding: 32px;
  position: relative;
  transition: all 0.3s ease;
}

.mode-card:hover {
  transform: translateY(-4px);
  box-shadow: var(--shadow-lg);
}

.mode-light:hover {
  border-color: #f59e0b;
  box-shadow: var(--shadow-lg), 0 0 30px rgba(245, 158, 11, 0.15);
}

.mode-devtools:hover {
  border-color: var(--color-nuxt);
  box-shadow: var(--shadow-lg), 0 0 30px rgba(0, 220, 130, 0.15);
}

.mode-badge {
  position: absolute;
  top: -12px;
  left: 24px;
  padding: 6px 14px;
  border-radius: 24px;
  font-size: 11px;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 1px;
}

.mode-light .mode-badge {
  background: linear-gradient(135deg, var(--color-primary), #ffb740);
  color: #ffffff;
  box-shadow: 0 4px 15px rgba(var(--color-primary-rgb), 0.4);
}

.mode-devtools .mode-badge {
  background: linear-gradient(135deg, var(--color-nuxt), #00b368);
  color: white;
  box-shadow: 0 4px 15px rgba(0, 220, 130, 0.4);
}

.mode-icon {
  font-size: 48px;
  display: block;
  margin-bottom: 16px;
}

.mode-card h3 {
  font-size: 24px;
  margin-bottom: 12px;
  color: var(--color-text);
}

.mode-description {
  color: var(--color-text-muted);
  font-size: 15px;
  line-height: 1.7;
  margin-bottom: 20px;
}

.mode-features {
  list-style: none;
  padding: 0;
  margin: 0 0 24px 0;
}

.mode-features li {
  position: relative;
  padding-left: 28px;
  margin-bottom: 12px;
  color: var(--color-text-muted);
  font-size: 14px;
}

.mode-features li::before {
  content: '✓';
  position: absolute;
  left: 0;
  color: var(--color-primary);
  font-weight: bold;
}

.mode-code {
  background: var(--color-bg-solid);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-sm);
  padding: 16px;
}

.mode-code .code-label {
  display: block;
  font-size: 11px;
  color: var(--color-text-muted);
  margin-bottom: 8px;
  text-transform: uppercase;
  letter-spacing: 1px;
}

.mode-code code {
  font-family: 'Fira Code', 'JetBrains Mono', monospace;
  font-size: 13px;
  color: var(--color-nuxt);
}

/* Quick Start Section */
.quickstart {
  padding: 100px 40px;
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
  width: 44px;
  height: 44px;
  border-radius: 50%;
  background: linear-gradient(135deg, var(--color-primary), #ffb740);
  color: #ffffff;
  display: flex;
  align-items: center;
  justify-content: center;
  font-weight: 700;
  flex-shrink: 0;
  box-shadow: 0 4px 15px rgba(var(--color-primary-rgb), 0.4);
}

.step-content {
  flex: 1;
}

.step-text {
  font-size: 16px;
  margin-bottom: 10px;
  color: var(--color-text);
}

.step-code {
  display: block;
  background: var(--color-bg-solid);
  padding: 14px 18px;
  border-radius: var(--radius-sm);
  font-family: 'Fira Code', 'JetBrains Mono', monospace;
  font-size: 13px;
  color: var(--color-primary);
  border: 1px solid var(--color-border);
}

/* CTA Section */
.cta {
  padding: 120px 40px;
  text-align: center;
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
  transition: color 0.2s;
}

.footer a:hover {
  color: #ffb740;
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

/* Scroll Reveal Animations */
.reveal {
  opacity: 0;
  transition: opacity 0.8s cubic-bezier(0.16, 1, 0.3, 1),
              transform 0.8s cubic-bezier(0.16, 1, 0.3, 1);
}

.reveal.reveal-up {
  transform: translateY(40px);
}

.reveal.reveal-left {
  transform: translateX(-40px);
}

.reveal.reveal-right {
  transform: translateX(40px);
}

.reveal.revealed {
  opacity: 1;
  transform: translate(0, 0);
}

/* Disable animations for reduced motion preference */
@media (prefers-reduced-motion: reduce) {
  .reveal {
    opacity: 1;
    transform: none;
    transition: none;
  }
}

/* Responsive */
@media (max-width: 1024px) {
  .hero {
    grid-template-columns: 1fr;
    text-align: center;
    padding: 80px 24px;
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

  .collab-content {
    grid-template-columns: 1fr;
    text-align: center;
  }

  .collab-features {
    display: inline-block;
    text-align: left;
  }

  .collab-visual {
    order: -1;
  }

  .modes-grid {
    grid-template-columns: 1fr;
  }
}

@media (max-width: 640px) {
  .settings-bar {
    position: relative;
    top: 0;
    right: 0;
    display: flex;
    justify-content: center;
    margin: 16px;
    background: var(--color-bg-elevated);
    border-radius: var(--radius);
  }

  .hero {
    padding: 20px 16px 60px;
  }

  .hero h1 {
    font-size: 32px;
  }

  .tagline {
    font-size: 16px;
  }

  .badges {
    justify-content: center;
  }

  .hero-actions {
    flex-direction: column;
    width: 100%;
  }

  .hero-actions .btn {
    width: 100%;
    justify-content: center;
  }

  .features {
    padding: 60px 16px;
  }

  .features-grid {
    grid-template-columns: 1fr;
  }

  .features h2,
  .modes h2,
  .quickstart h2,
  .cta h2 {
    font-size: 28px;
  }

  .collaborative {
    padding: 60px 16px;
  }

  .collab-text h2 {
    font-size: 28px;
  }

  .demo-terminal {
    min-width: auto;
    width: 100%;
  }

  .modes {
    padding: 60px 16px;
  }

  .mode-card {
    padding: 24px;
  }

  .mode-icon {
    font-size: 36px;
  }

  .mode-card h3 {
    font-size: 20px;
  }

  .quickstart {
    padding: 60px 16px;
  }

  .cta {
    padding: 80px 16px;
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
