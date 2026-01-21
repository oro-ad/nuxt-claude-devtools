# 🚀 Getting Started

Welcome! This guide will help you set up and explore the Nuxt Claude DevTools playground.

## Prerequisites

Before you begin, make sure you have:

- ✅ **Node.js 18+** installed
- ✅ **Claude Code CLI** installed globally
- ✅ **Anthropic API key** (set in your environment)

## Installation

### 1. Install Claude Code CLI

```bash
npm install -g @anthropic-ai/claude-code
```

### 2. Clone & Install Dependencies

```bash
git clone https://github.com/anthropics/nuxt-claude-devtools
cd nuxt-claude-devtools
npm install
```

### 3. Start the Playground

```bash
npm run dev:playground
```

This starts the Nuxt dev server with Claude DevTools enabled.

### 4. Open DevTools

1. Open your browser at `http://localhost:3000`
2. Press `Shift + Option + D` (Mac) or `Shift + Alt + D` (Windows/Linux)
3. Navigate to the **Claude** tab in DevTools

---

## First Steps

### 👋 Say Hello

Open the Claude tab and type a greeting. Claude will introduce itself and show you what's available.

### 🧩 Try a Command

Type `/component UserAvatar` to generate a new component. Claude will create a fully-typed Vue component following project conventions.

### 🔍 Explore the Codebase

Ask Claude about the project:
- "What components do we have?"
- "How does the styling system work?"
- "Show me the API endpoints"

### 🛠️ Build Something

Try these prompts:
- "Create a notification toast component"
- "Add a dark/light theme toggle"
- "Build a contact form with validation"

---

## Project Structure

```
playground/
├── app.vue              # Main landing page
├── components/          # Vue components
├── composables/         # Shared logic
├── pages/               # File-based routing
├── server/api/          # API endpoints
└── .claude/             # Claude configuration
    ├── settings.local.json
    ├── commands/        # Slash commands
    └── docs/            # Documentation
```

---

## Configuration

### DevTools Module

The module is configured in `nuxt.config.ts`:

```typescript
export default defineNuxtConfig({
  modules: ['@oro.ad/nuxt-claude-devtools'],

  // Optional: customize behavior
  claudeDevtools: {
    // options here
  }
})
```

### Claude Settings

Customize Claude's behavior in `.claude/settings.local.json`:

```json
{
  "skills": [...],
  "agents": [...]
}
```

### Slash Commands

Add custom commands in `.claude/commands/`:

```
.claude/commands/
├── component.md
├── refactor.md
├── test.md
├── api.md
└── composable.md
```

---

## Keyboard Shortcuts

| Shortcut | Action |
|----------|--------|
| `Shift + Option/Alt + D` | Toggle DevTools |
| `Cmd/Ctrl + K` | Focus Claude chat |
| `Cmd/Ctrl + Enter` | Send message |
| `Escape` | Close DevTools |

---

## Troubleshooting

### Claude tab not showing?

Make sure the module is installed and added to `nuxt.config.ts`:

```typescript
modules: ['@oro.ad/nuxt-claude-devtools']
```

### API errors?

Check that your Anthropic API key is set:

```bash
export ANTHROPIC_API_KEY=your-key-here
```

### DevTools not opening?

Try refreshing the page or restarting the dev server.

---

## Next Steps

- 📖 Read the [Architecture Guide](architecture.md)
- 🧩 Explore [Component Documentation](components.md)
- 🎨 Learn about [Styling](styling.md)
- 💡 Check out [Examples](examples.md)

