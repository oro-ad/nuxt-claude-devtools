# Architecture Overview

This document describes the architecture of the Nuxt Claude DevTools demo application.

## Directory Structure

```
playground/
├── app.vue                 # Root component (landing page)
├── nuxt.config.ts          # Nuxt configuration
├── components/             # Vue components
│   ├── DemoCard.vue        # Card with header/content
│   ├── DemoButton.vue      # Interactive button with ripple
│   └── DemoStats.vue       # Statistics display
├── composables/            # Vue composables (shared logic)
├── pages/                  # File-based routing
├── server/                 # Server routes & API
│   └── api/                # REST API endpoints
├── docs/                   # Project documentation
└── .claude/                # Claude DevTools configuration
    ├── settings.local.json # Skills & agents
    └── commands/           # Slash commands
```

## Component Architecture

### Design Principles

1. **Single Responsibility**: Each component does one thing well
2. **Props Down, Events Up**: Unidirectional data flow
3. **Composition API**: All components use `<script setup>`
4. **TypeScript**: Full type safety for props and emits

### Component Categories

#### Presentational Components
- Receive data via props
- Emit events for interactions
- No direct state management
- Examples: `DemoCard`, `DemoStats`

#### Interactive Components
- Handle user interactions
- May have local state
- Emit events to parent
- Examples: `DemoButton`

#### Container Components
- Compose other components
- Handle data fetching
- Manage application state
- Example: `app.vue`

## State Management

### Local State
```typescript
const count = ref(0)
const user = reactive({ name: '', email: '' })
```

### Computed State
```typescript
const fullName = computed(() => `${user.firstName} ${user.lastName}`)
```

### Global State (if needed)
```typescript
// composables/useAppState.ts
export const useAppState = () => {
  const theme = useState('theme', () => 'dark')
  return { theme }
}
```

## Styling Architecture

### CSS Variables (Theming)

```css
:root {
  --color-primary: #10a37f;
  --color-bg: #0f0f0f;
  --color-bg-elevated: #1a1a1a;
  --color-text: #ffffff;
  --color-text-muted: #a0a0a0;
  --color-border: #333333;
  --radius: 12px;
}
```

### Scoped Styles

All component styles use `<style scoped>` to prevent leakage.

### Responsive Design

Mobile-first approach with breakpoints:
- Mobile: Default styles
- Tablet: `@media (min-width: 768px)`
- Desktop: `@media (min-width: 1024px)`
