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
