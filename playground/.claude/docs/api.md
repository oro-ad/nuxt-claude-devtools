# API Reference

Server routes and API endpoints documentation.

## Overview

API routes are located in `server/api/` and follow Nuxt's file-based routing conventions.

## Endpoints

### Health Check

```
GET /api/health
```

Returns server status.

**Response:**
```json
{
  "status": "ok",
  "timestamp": "2024-01-15T10:30:00.000Z"
}
```

---

## Creating API Routes

### Basic GET Route

```typescript
// server/api/users.get.ts
export default defineEventHandler(async (event) => {
  const users = await fetchUsers()
  return users
})
```

### POST Route with Body

```typescript
// server/api/users.post.ts
export default defineEventHandler(async (event) => {
  const body = await readBody(event)

  // Validate
  if (!body.email) {
    throw createError({
      statusCode: 400,
      message: 'Email is required'
    })
  }

  const user = await createUser(body)
  return { success: true, user }
})
```

### Dynamic Routes

```typescript
// server/api/users/[id].ts
export default defineEventHandler(async (event) => {
  const id = getRouterParam(event, 'id')

  const user = await getUserById(id)

  if (!user) {
    throw createError({
      statusCode: 404,
      message: 'User not found'
    })
  }

  return user
})
```

### Query Parameters

```typescript
// server/api/search.get.ts
export default defineEventHandler(async (event) => {
  const { q, page = '1', limit = '10' } = getQuery(event)

  const results = await search({
    query: q as string,
    page: parseInt(page as string),
    limit: parseInt(limit as string)
  })

  return results
})
```

## Error Handling

### Standard Error Response

```typescript
throw createError({
  statusCode: 400,
  statusMessage: 'Bad Request',
  message: 'Detailed error message',
  data: { field: 'email', issue: 'invalid format' }
})
```

### HTTP Status Codes

| Code | Usage |
|------|-------|
| 200 | Success |
| 201 | Created |
| 400 | Bad Request (validation error) |
| 401 | Unauthorized |
| 403 | Forbidden |
| 404 | Not Found |
| 500 | Internal Server Error |

## Authentication

### Protected Routes

```typescript
// server/api/protected.ts
export default defineEventHandler(async (event) => {
  const token = getHeader(event, 'authorization')?.replace('Bearer ', '')

  if (!token) {
    throw createError({
      statusCode: 401,
      message: 'Authentication required'
    })
  }

  const user = await verifyToken(token)

  if (!user) {
    throw createError({
      statusCode: 401,
      message: 'Invalid token'
    })
  }

  // Continue with authenticated user
  return { user }
})
```

## TypeScript Types

### Request/Response Types

```typescript
// types/api.ts
interface CreateUserRequest {
  email: string
  name: string
  role?: 'user' | 'admin'
}

interface UserResponse {
  id: string
  email: string
  name: string
  createdAt: string
}

interface ApiError {
  statusCode: number
  message: string
  data?: Record<string, unknown>
}
```

## Testing APIs

### Using useFetch

```typescript
// In a Vue component
const { data, pending, error } = await useFetch('/api/users')
```

### Using $fetch

```typescript
// Direct fetch
const user = await $fetch('/api/users/123')

// With options
const result = await $fetch('/api/users', {
  method: 'POST',
  body: { email: 'user@example.com', name: 'John' }
})
```
