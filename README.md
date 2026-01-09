# @oro.ad/nuxt-claude-devtools

[![npm version][npm-version-src]][npm-version-href]
[![npm downloads][npm-downloads-src]][npm-downloads-href]
[![License][license-src]][license-href]
[![Nuxt][nuxt-src]][nuxt-href]

Nuxt DevTools integration for [Claude Code](https://claude.com/claude-code) AI assistant. Chat with Claude directly from your Nuxt DevTools panel.

## Features

- **Chat Interface** — Interactive chat with Claude AI directly in DevTools
- **Streaming Responses** — Real-time streaming output from Claude
- **Session Management** — Start new conversations or continue previous ones
- **MCP Servers** — Manage Model Context Protocol servers (add, remove, list)
- **Multiple Transports** — Support for stdio, HTTP, and SSE MCP transports

## Prerequisites

- [Claude Code CLI](https://claude.com/claude-code) must be installed and authenticated
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
| `claude.command` | `string` | `'claude'` | Path to Claude CLI executable |
| `claude.args` | `string[]` | `[]` | Additional arguments for Claude CLI |

## Usage

### Chat Interface

1. Open Nuxt DevTools (press `Shift + Option + D` or click the Nuxt icon)
2. Navigate to the "AI" tab
3. Type your message and press Enter
4. Claude will respond with streaming output

The module automatically uses `--continue` for follow-up messages within a session. Click "New Chat" to start a fresh conversation.

### MCP Servers

Manage Model Context Protocol servers directly from DevTools:

1. Click the "MCP" button in the chat header
2. View configured servers
3. Add new servers (stdio, HTTP, or SSE transport)
4. Remove existing servers

Example MCP servers:
- **GitHub**: `npx -y @modelcontextprotocol/server-github`
- **Nuxt UI**: `https://ui.nuxt.com/mcp` (HTTP)

## Architecture

```
┌─────────────────────────────────────────────────────────┐
│                    Nuxt DevTools                        │
│  ┌───────────────────────────────────────────────────┐  │
│  │              Claude DevTools Panel                │  │
│  │         (iframe at /__claude-devtools)            │  │
│  └───────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────┘
                          │
                          │ Socket.IO (port 3355)
                          ▼
┌─────────────────────────────────────────────────────────┐
│                  Claude Session Server                  │
│  ┌─────────────────┐    ┌─────────────────────────────┐│
│  │  Socket.IO Hub  │───▶│  Claude CLI Process         ││
│  │                 │    │  (spawn with --continue)    ││
│  └─────────────────┘    └─────────────────────────────┘│
└─────────────────────────────────────────────────────────┘
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
│   ├── module.ts          # Nuxt module definition
│   ├── devtools.ts        # DevTools UI setup
│   └── runtime/
│       └── server/
│           └── claude-session.ts  # Socket.IO server & Claude process management
├── client/                # DevTools panel UI (Nuxt app)
│   ├── pages/
│   │   ├── index.vue      # Chat interface
│   │   └── mcp.vue        # MCP servers management
│   └── nuxt.config.ts
└── playground/            # Development playground
```

## Security Notes

- The module only runs in development mode (`nuxt.options.dev`)
- Uses `--dangerously-skip-permissions` flag for Claude CLI (development only)
- Socket.IO server runs on a separate port (3355)

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
