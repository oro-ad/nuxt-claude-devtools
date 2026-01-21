---
name: typescript-strict
description: Strict TypeScript practices. Use when writing TypeScript code to ensure type safety.
---

Enforce strict TypeScript practices:

## No `any`

Never use `any`. Use `unknown` for truly unknown types:

```typescript
// ❌ Avoid
function process(data: any) { }

// ✅ Better
function process(data: unknown) {
  if (typeof data === 'string') {
    // Now TypeScript knows it's a string
  }
}
```

## Explicit Return Types

Add explicit return types for public/exported functions:

```typescript
// ✅ Explicit return type
function calculateTotal(items: Item[]): number {
  return items.reduce((sum, item) => sum + item.price, 0)
}

// ✅ For async functions
async function fetchUser(id: string): Promise<User | null> {
  // ...
}
```

## Interface over Type

Prefer `interface` for object shapes (better error messages, extendable):

```typescript
// ✅ Prefer interface
interface User {
  id: string
  name: string
  email: string
}

// Use type for unions, primitives, or complex types
type Status = 'pending' | 'active' | 'done'
type Nullable<T> = T | null
```

## Readonly

Mark immutable data as `readonly`:

```typescript
interface Config {
  readonly apiUrl: string
  readonly maxRetries: number
}

function processItems(items: readonly Item[]) {
  // items.push() would be an error
}
```

## Type Guards

Use type guards for runtime type checking:

```typescript
function isUser(value: unknown): value is User {
  return (
    typeof value === 'object' &&
    value !== null &&
    'id' in value &&
    'name' in value
  )
}

if (isUser(data)) {
  // TypeScript knows data is User
  console.log(data.name)
}
```

## Const Assertions

Use `as const` for literal types:

```typescript
const STATUSES = ['pending', 'active', 'done'] as const
type Status = typeof STATUSES[number] // 'pending' | 'active' | 'done'
```

## Non-null Assertion

Avoid `!` when possible. Use optional chaining or type guards:

```typescript
// ❌ Risky
const name = user!.name

// ✅ Safer
const name = user?.name ?? 'Unknown'
```
