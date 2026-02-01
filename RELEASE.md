## v1.3.0 — Overlay & Collaboration

Major release introducing lightweight overlay mode and real-time collaborative chat sessions.

### New Features

**Overlay Mode (Lightweight Chat)**

A floating chat panel that works without DevTools — perfect for quick interactions:
- Toggle with `Ctrl+Shift+K` or click the FAB button
- Draggable FAB with position persistence
- Semi-transparent when inactive
- Full markdown rendering with tables and code blocks
- Slash commands and documentation autocomplete
- Voice input support

**Mobile Support**

Fully responsive mobile experience:
- Bottom sheet UI (92vh height)
- Swipe down to close
- Touch-optimized controls
- Body scroll lock when open
- Safe area support for notched devices

**Collaborative Mode**

Share chat sessions with team members in real-time:
- Generate shareable links with the Share button
- Nickname system for identifying participants
- Real-time message sync across all clients
- Visual distinction: own messages (right, green) vs others (left, purple)
- Auto-save nickname from URL parameter (`oro_share_nickname`)

**LLMS Sources**

Configure external documentation in llms.txt format:
- Add documentation URLs that Claude can fetch
- Supports markdown, llms.txt manifests, and API docs
- Managed in the Docs tab

**Plugin Marketplace**

Browse and install community plugins:
- Skills, agents, and commands from external sources
- Plugin management UI in DevTools

### Improvements

**Shared Composables**

Unified codebase for overlay and DevTools client:
- `useClaudeChat` — Chat logic with collaborative support
- `useVoiceInput` — Speech recognition
- `useShare` — Collaborative session management

**Session Resumption**

Improved conversation continuity:
- Uses `--resume` with session ID instead of `--continue`
- Sessions persist across page reloads
- Automatic recovery after Nuxt restarts

**Architecture Updates**

- New `src/runtime/shared/` for code shared between overlay and client
- `ShareManager` for collaborative session state
- `PluginsManager` for plugin marketplace

---

## v1.2.0 — Context Awareness

Enhanced Claude DevTools with context-aware messaging and improved codebase architecture.

### New Features

**Context Chips**

Added context chips to send additional context with messages:
- Viewport — app window size
- User Agent — browser and OS info
- Routing — current route, query params, page component path

Chips are located to the right of the input field, toggle on click.

**Message Context Display**

Context is beautifully rendered in user messages with compact badges and icons showing viewport, browser, route and selected components.

### Improvements

**Codebase Refactoring**

Created modular composables architecture:
- useClaudeChat — Socket, messages, session, history
- useMessageContext — Context chips, collect/parse context
- useVoiceInput — Speech recognition
- useAutocomplete — Docs/commands autocomplete
- useComponentPicker — Component selection
