# @oro.ad/nuxt-claude-devtools

[![npm version][npm-version-src]][npm-version-href]
[![npm downloads][npm-downloads-src]][npm-downloads-href]
[![License][license-src]][license-href]
[![Nuxt][nuxt-src]][nuxt-href]

Nuxt DevTools integration for [Claude Code](https://claude.ai/code) AI assistant. Chat with Claude directly from your Nuxt DevTools panel with full support for skills, agents, and slash commands.

## Features

### Core
- **Chat Interface** — Interactive chat with Claude AI directly in DevTools
- **Overlay Mode** — Lightweight floating chat panel that works without DevTools (`devtools: false`)
- **Streaming Responses** — Real-time streaming output from Claude
- **Voice Input** — Speech-to-text for hands-free messaging
- **Session Management** — Start new conversations or continue previous ones
- **Chat History** — Browse and restore previous conversations

### Context & Integration
- **Context Chips** — Send viewport size, browser info, and routing context with messages
- **Component Picker** — Select Vue components from the page to add as context
- **LLMS Sources** — Configure external documentation URLs (llms.txt format)

### Extensibility
- **Skills** — Markdown-based skills to extend Claude's capabilities (`.claude/skills/<name>/SKILL.md`)
- **Subagents** — Specialized AI agents for delegated tasks (`.claude/agents/<name>.md`)
- **Slash Commands** — Custom commands with YAML frontmatter (`.claude/commands/<name>.md`)
- **Documentation** — Manage project docs that Claude can reference (`.claude/docs/`)
- **MCP Servers** — Manage Model Context Protocol servers (add, remove, list)

### Collaboration & Access
- **Collaborative Mode** — Share chat sessions with team members via link
- **Tunnel Support** — Remote access via cloudflared tunnel
- **Mobile Support** — Responsive bottom-sheet UI with swipe gestures

## Prerequisites

- [Claude Code CLI](https://claude.ai/code) must be installed and authenticated
- Nuxt 3.x or 4.x with DevTools enabled

## Quick Setup

1. Install the module:

```bash
# Using pnpm
pnpm add -D @oro.ad/nuxt-claude-devtools

# Using yarn
yarn add --dev @oro.ad/nuxt-claude-devtools

# Using npm
npm install --save-dev @oro.ad/nuxt-claude-devtools
```

2. Add to your `nuxt.config.ts`:

```ts
export default defineNuxtConfig({
  modules: ['@oro.ad/nuxt-claude-devtools'],

  devtools: {
    enabled: true,
  },

  claudeDevtools: {
    enabled: true,
    claude: {
      command: 'claude', // Path to Claude CLI
      args: [],          // Additional CLI arguments
    },
  },
})
```

3. Start your Nuxt dev server and open DevTools — you'll see a new "AI" tab.

## Configuration

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `enabled` | `boolean` | `true` | Enable/disable the module |
| `debug` | `boolean` | `false` | Enable debug logging in console |
| `claude.command` | `string` | `'claude'` | Path to Claude CLI executable |
| `claude.args` | `string[]` | `[]` | Additional arguments for Claude CLI |

## Overlay Mode

When you don't need full DevTools integration, use overlay mode for a lightweight chat experience:

```ts
export default defineNuxtConfig({
  modules: ['@oro.ad/nuxt-claude-devtools'],

  devtools: {
    enabled: false, // Disable DevTools
  },

  claudeDevtools: {
    enabled: true,
  },
})
```

The overlay appears as a floating button (FAB) in the corner of your app:
- **Desktop**: Draggable floating panel, `Ctrl+Shift+K` to toggle
- **Mobile**: Full-width bottom sheet with swipe-to-close
- **Features**: Voice input, slash commands, markdown rendering, collaborative sharing

## Usage

### Chat Interface

1. Open Nuxt DevTools (press `Shift + Option + D` or click the Nuxt icon)
2. Navigate to the "AI" tab
3. Type your message and press Enter
4. Claude will respond with streaming output

The module automatically uses `--continue` for follow-up messages within a session. Click "New Chat" to start a fresh conversation.

### Context Chips

Add contextual information to your messages using the chips next to the input field:

| Chip | Context Provided |
|------|------------------|
| **Viewport** | App window dimensions (width × height) |
| **User Agent** | Browser and OS information |
| **Routing** | Current route path, query params, page component file |

Click a chip to toggle it on/off. Active chips will include their context with your next message.

### Component Picker

Click "Add Component" to select Vue components directly from your running app. The component's file path will be included as context, allowing Claude to read and understand the component code.

### Skills

Skills extend Claude's capabilities with specialized knowledge. Create markdown files with YAML frontmatter:

**Location:** `.claude/skills/<skill-name>/SKILL.md`

```markdown
---
description: Vue 3 Composition API expert
model: sonnet
---

You are an expert in Vue 3 Composition API...

## Guidelines
- Always use `<script setup lang="ts">`
- Follow TypeScript best practices
```

**Frontmatter options:**
| Field | Description |
|-------|-------------|
| `description` | Brief description (required) |
| `model` | Model to use: `sonnet`, `opus`, `haiku` |
| `argumentHint` | Hint for skill arguments (e.g., `<query>`) |

### Subagents

Subagents are specialized AI agents that Claude can delegate tasks to:

**Location:** `.claude/agents/<agent-name>.md`

```markdown
---
name: code-reviewer
description: Reviews code for quality and best practices
model: sonnet
tools: Read, Grep, Glob
skills:
  - typescript-strict
  - vue-composition-api
---

You are a code reviewer. Your job is to:
1. Review code for bugs and issues
2. Suggest improvements
3. Check for security vulnerabilities
```

**Frontmatter options:**
| Field | Description |
|-------|-------------|
| `name` | Agent name (kebab-case) |
| `description` | Brief description |
| `model` | Model: `sonnet`, `opus`, `haiku` |
| `tools` | Comma-separated list of allowed tools |
| `disallowedTools` | Tools to exclude |
| `skills` | Array of skill names to preload |
| `permissionMode` | `default`, `acceptEdits`, `dontAsk`, `bypassPermissions`, `plan` |

### Slash Commands

Create custom commands with markdown and YAML frontmatter:

**Location:** `.claude/commands/<command-name>.md`

```markdown
---
description: Generate a Vue component
allowedTools: Read, Write, Edit
---

Generate a Vue 3 component with:
- `<script setup lang="ts">`
- Typed props with `defineProps<T>()`
- CSS variables for styling
```

Invoke with `/<command-name>` in the chat.

### Documentation

Store project documentation that Claude can reference:

**Location:** `.claude/docs/`

Create markdown files for architecture, components, API reference, etc. Claude will use these as context when answering questions about your project.

### MCP Servers

Manage Model Context Protocol servers directly from DevTools:

1. Click the "MCP" button in the chat header
2. View configured servers
3. Add new servers (stdio, HTTP, or SSE transport)
4. Remove existing servers

Example MCP servers:
- **GitHub**: `npx -y @modelcontextprotocol/server-github`
- **Nuxt UI**: `https://ui.nuxt.com/mcp` (HTTP)

### Collaborative Mode

Share your chat session with team members:

1. Click the **Share** button in the chat header
2. Enter a nickname (required for collaboration)
3. Copy and share the generated link
4. Team members opening the link join the same session

Features:
- Real-time message sync between all participants
- Nicknames displayed on messages from other users
- Own messages appear on the right (green), others on the left (purple)
- Share links can include pre-set nicknames via `oro_share_nickname` URL parameter

### LLMS Sources

Configure external documentation URLs in llms.txt format:

1. Go to the **Docs** tab in DevTools
2. Add URLs to documentation sources
3. Claude can fetch and use these when answering questions

Supported formats:
- Direct markdown URLs
- llms.txt manifest files
- API documentation endpoints

## Architecture

```
┌─────────────────────────────────────────────────────────┐
│                    Nuxt DevTools                        │
│  ┌───────────────────────────────────────────────────┐  │
│  │              Claude DevTools Panel                │  │
│  │         (iframe at /__claude-devtools)            │  │
│  │                                                   │  │
│  │  Pages:                                           │  │
│  │  - /           Chat interface                     │  │
│  │  - /skills     Skills manager                     │  │
│  │  - /agents     Subagents manager                  │  │
│  │  - /commands   Slash commands manager             │  │
│  │  - /docs       Documentation & LLMS sources       │  │
│  │  - /mcp        MCP servers config                 │  │
│  │  - /plugins    Plugin marketplace                 │  │
│  └───────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────┘
         │                              │
         │ Socket.IO                    │ (or)
         ▼                              ▼
┌──────────────────────┐    ┌──────────────────────────────┐
│    Chat Overlay      │    │   Multiple Clients           │
│  (Floating Panel)    │    │   (Collaborative Mode)       │
│                      │    │                              │
│  - Desktop: Draggable│    │  Client A ◄──┐               │
│  - Mobile: Bottom    │    │  Client B ◄──┼── Shared      │
│    sheet with swipe  │    │  Client C ◄──┘   Session     │
└──────────────────────┘    └──────────────────────────────┘
                          │
                          │ Socket.IO
                          ▼
┌─────────────────────────────────────────────────────────┐
│                  Claude Session Server                  │
│  ┌─────────────────┐    ┌─────────────────────────────┐│
│  │  Socket.IO Hub  │───▶│  Claude CLI Process         ││
│  │                 │    │  (spawn with --resume)      ││
│  │  Managers:      │    └─────────────────────────────┘│
│  │  - Skills       │                                   │
│  │  - Agents       │    ┌─────────────────────────────┐│
│  │  - Commands     │    │  File Storage               ││
│  │  - Docs         │    │  .claude-devtools/          ││
│  │  - History      │    │  .claude/skills/            ││
│  │  - Share        │    │  .claude/agents/            ││
│  │  - Plugins      │    │  .claude/commands/          ││
│  └─────────────────┘    │  .claude/docs/              ││
│                         └─────────────────────────────┘│
└─────────────────────────────────────────────────────────┘
```

## File Structure

```
.claude/
├── settings.local.json    # Local permissions
├── skills/                # Skills (markdown)
│   └── <skill-name>/
│       └── SKILL.md
├── agents/                # Subagents (markdown)
│   └── <agent-name>.md
├── commands/              # Slash commands (markdown)
│   └── <command-name>.md
└── docs/                  # Documentation
    └── *.md
```

## Development

```bash
# Install dependencies
npm install

# Install dependencies for client
cd ./client
npm install
cd ../

# Generate type stubs
npm run dev:prepare

# Start playground with hot reload
npm run dev

# Build for production
npm run prepack

# Run linter
npm run lint
```

### Project Structure

```
├── src/
│   ├── module.ts              # Nuxt module definition
│   ├── devtools.ts            # DevTools UI setup
│   └── runtime/
│       ├── logger.ts          # Logging utility
│       ├── overlay/           # Lightweight chat overlay
│       │   └── components/
│       │       ├── ChatOverlay.vue    # Main overlay component
│       │       ├── MarkdownContent.vue # Markdown renderer
│       │       └── ToolCallBlock.vue  # Tool call display
│       ├── shared/            # Shared code (overlay + client)
│       │   ├── composables/
│       │   │   ├── useClaudeChat.ts   # Chat logic
│       │   │   ├── useVoiceInput.ts   # Speech recognition
│       │   │   └── useShare.ts        # Collaborative sharing
│       │   ├── types.ts       # TypeScript types
│       │   └── constants.ts   # Shared constants
│       └── server/
│           ├── claude-session.ts   # Socket.IO server & Claude process
│           ├── skills-manager.ts   # Skills CRUD operations
│           ├── agents-manager.ts   # Agents CRUD operations
│           ├── commands-manager.ts # Commands CRUD operations
│           ├── docs-manager.ts     # Documentation & LLMS management
│           ├── history-manager.ts  # Chat history management
│           ├── share-manager.ts    # Collaborative session management
│           └── plugins-manager.ts  # Plugin marketplace
├── client/                    # DevTools panel UI (Nuxt app)
│   ├── pages/
│   │   ├── index.vue          # Chat interface
│   │   ├── skills.vue         # Skills manager
│   │   ├── agents.vue         # Subagents manager
│   │   ├── commands.vue       # Slash commands manager
│   │   ├── docs.vue           # Documentation & LLMS viewer
│   │   ├── mcp.vue            # MCP servers management
│   │   └── plugins.vue        # Plugin marketplace
│   ├── composables/
│   │   ├── useClaudeChat.ts   # Socket, messages, session
│   │   ├── useMessageContext.ts # Context chips logic
│   │   ├── useVoiceInput.ts   # Speech recognition
│   │   ├── useAutocomplete.ts # Docs/commands autocomplete
│   │   ├── useComponentPicker.ts # Component selection
│   │   └── useShare.ts        # Collaborative sharing
│   └── nuxt.config.ts
└── playground/                # Development playground
```

## Showcase

Check out real-world use cases and demos at **[nuxt-claude-devtools.oro.ad](https://nuxt-claude-devtools.oro.ad/)**

Have an interesting use case? We'd love to feature it! Send your story to [jobsbystr@gmail.com](mailto:jobsbystr@gmail.com).

## Security Notes

- The module only runs in development mode (`nuxt.options.dev`)
- Uses `--dangerously-skip-permissions` flag for Claude CLI (development only)
- Socket.IO server runs on a dedicated port
- All file operations are scoped to `.claude/` directory

## License

[This project is licensed under the GNU General Public License v3.0 (GPL-3.0).](./LICENSE.md)

<!-- Badges -->
[npm-version-src]: https://img.shields.io/npm/v/@oro.ad/nuxt-claude-devtools/latest.svg?style=flat&colorA=18181B&colorB=28CF8D
[npm-version-href]: https://npmjs.com/package/@oro.ad/nuxt-claude-devtools

[npm-downloads-src]: https://img.shields.io/npm/dm/@oro.ad/nuxt-claude-devtools.svg?style=flat&colorA=18181B&colorB=28CF8D
[npm-downloads-href]: https://npmjs.com/package/@oro.ad/nuxt-claude-devtools

[license-src]: https://img.shields.io/badge/license-GPL--3.0-green.svg?style=flat&colorA=18181B&colorB=28CF8D
[license-href]: ./LICENSE.md

[nuxt-src]: https://img.shields.io/badge/Nuxt-18181B?logo=nuxt
[nuxt-href]: https://nuxt.com
