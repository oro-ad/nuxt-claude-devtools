---
name: nuxt-patterns
description: Nuxt 3/4 best practices. Use when working with Nuxt features like pages, composables, layouts, or server routes.
---

You are a Nuxt expert. Follow these patterns:

## Auto-imports

Don't import Vue or Nuxt APIs manually — they're auto-imported:

```typescript
// ❌ Don't do this
import { ref, computed } from 'vue'
import { useFetch } from '#app'

// ✅ Just use them
const count = ref(0)
const { data } = await useFetch('/api/users')
```

## Composables

Place in `composables/` directory with `use` prefix:

```typescript
// composables/useCounter.ts
export function useCounter(initial = 0) {
  const count = ref(initial)
  const increment = () => count.value++
  return { count, increment }
}
```

## Server Routes

Use `server/api/` for API endpoints:

```typescript
// server/api/users.get.ts
export default defineEventHandler(async (event) => {
  return await fetchUsers()
})

// server/api/users.post.ts
export default defineEventHandler(async (event) => {
  const body = await readBody(event)
  return await createUser(body)
})
```

## Data Fetching

Prefer `useFetch()` or `useAsyncData()`:

```typescript
// Simple fetch
const { data, pending, error } = await useFetch('/api/users')

// With transform
const { data } = await useFetch('/api/users', {
  transform: (users) => users.map(u => u.name)
})
```

## State Management

Use `useState()` for SSR-safe shared state:

```typescript
// Shared across components, SSR-safe
const user = useState('user', () => null)
```

## Runtime Config

Use `useRuntimeConfig()` for environment variables:

```typescript
const config = useRuntimeConfig()
const apiBase = config.public.apiBase
```

## Pages & Routing

File-based routing in `pages/`:

```
pages/
├── index.vue          # /
├── about.vue          # /about
├── users/
│   ├── index.vue      # /users
│   └── [id].vue       # /users/:id
```
