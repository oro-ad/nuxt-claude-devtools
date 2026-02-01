# Nuxt Claude DevTools Playground

Demo playground for `@oro.ad/nuxt-claude-devtools` — a Nuxt module that integrates Claude Code AI assistant into your development workflow.

## Features

### Core
- **Chat Interface** — Interactive chat with Claude AI in DevTools
- **Overlay Mode** — Lightweight floating chat panel (works without DevTools)
- **Streaming Responses** — Real-time streaming output
- **Voice Input** — Speech-to-text for hands-free messaging

### Context & Integration
- **Context Chips** — Send viewport, browser, and routing context
- **Component Picker** — Select Vue components to add as context
- **LLMS Sources** — Configure external documentation URLs

### Extensibility
- **Skills** — Markdown-based skills (`.claude/skills/`)
- **Subagents** — Specialized AI agents (`.claude/agents/`)
- **Slash Commands** — Custom commands (`.claude/commands/`)
- **Documentation** — Project docs (`.claude/docs/`)

### Collaboration
- **Collaborative Mode** — Share chat sessions via link
- **Tunnel Support** — Remote access via cloudflared

## Quick Start

```bash
# Install dependencies
npm install

# Start development server
npm run dev
```

Open DevTools (`Shift + Option + D`) and navigate to the "AI" tab.

## Overlay Mode

To use the lightweight chat overlay without DevTools:

```typescript
// nuxt.config.ts
export default defineNuxtConfig({
  modules: ['@oro.ad/nuxt-claude-devtools'],

  devtools: { enabled: false },

  claudeDevtools: {
    enabled: true,
    overlay: { enabled: true },
  },
})
```

- **Toggle**: `Ctrl+Shift+K` or click the floating button
- **Mobile**: Bottom sheet with swipe-to-close
- **Draggable**: Move the button anywhere on screen

## Collaborative Mode

1. Click **Share** in the chat header
2. Enter a nickname
3. Share the generated link with team members
4. Messages sync in real-time across all participants

## Project Structure

```
playground/
├── app.vue                 # Landing page
├── nuxt.config.ts          # Module configuration
├── components/             # Demo components
│   ├── DemoCard.vue
│   ├── DemoButton.vue
│   └── DemoStats.vue
└── .claude/
    ├── commands/           # Slash commands
    ├── skills/             # AI skills
    ├── agents/             # Subagents
    └── docs/               # Documentation
```

## Available Commands

| Command | Description |
|---------|-------------|
| `/component [name]` | Generate Vue component |
| `/refactor` | Refactor selected code |
| `/test [file]` | Generate Vitest tests |
| `/api [name]` | Create API endpoint |
| `/composable [name]` | Create Vue composable |

## License

GPL-3.0-only
