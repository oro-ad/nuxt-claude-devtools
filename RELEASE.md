## v1.5.1 — Fix ESM/CJS Compatibility

### Bug Fixes

**socket.io-client Import Error**

Fixed `SyntaxError: The requested module 'debug' does not provide an export named 'default'` when installing the module via npm/yarn.

The `debug` package used by `socket.io-client` is CommonJS and lacks proper ESM exports. Added Vite `optimizeDeps.include` configuration to pre-bundle these dependencies correctly:

- `socket.io-client`
- `engine.io-client`
- `debug`
- `marked`

---

## v1.5.0 — Redesign, Attachments & Stop Generation

### New Features

**Stop Generation**

Interrupt Claude's response at any time with the stop button.

**File Attachments**

Redesigned attachment menu with three options:
- **Image** — pick from gallery
- **Camera** — capture directly
- **File** — native file browser (File System Access API on desktop)

**Overlay Redesign**

- Floating panel with improved glassmorphism styling
- Refined chat input with better mobile UX
- Smoother animations and transitions

**Playground Redesign**

- New landing page with feature showcase
- Theme toggle (light/dark)
- Improved responsive layout

### Improvements

- Shared composables refactored to `src/runtime/shared/`
- Removed redundant `optimizeDeps.include` from module setup

---

## v1.3.0 — Overlay & Collaboration

Release introducing lightweight overlay mode and real-time collaborative chat sessions.

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

- Bottom sheet UI
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

**Plugins**

Browse community plugins:

- Skills, agents, and commands from external sources
- Plugin management UI in DevTools

### Improvements

**Shared Composables**

Unified codebase for overlay and DevTools client:

- `useClaudeChat` — Chat logic with collaborative support
- `useVoiceInput` — Speech recognition
- `useShare` — Collaborative session management

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

Context is beautifully rendered in user messages with compact badges and icons showing viewport, browser, route and
selected components.

### Improvements

**Codebase Refactoring**

Created modular composables architecture:

- useClaudeChat — Socket, messages, session, history
- useMessageContext — Context chips, collect/parse context
- useVoiceInput — Speech recognition
- useAutocomplete — Docs/commands autocomplete
- useComponentPicker — Component selection
