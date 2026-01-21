# /api — Create API Endpoint

Generate a Nuxt server API route with proper typing and error handling.

## Usage

```
/api [endpoint-name] [method]
```

## Instructions

Create API endpoints in `server/api/` with:

1. **TypeScript**: Full type safety
2. **Validation**: Input validation with Zod or manual checks
3. **Error Handling**: Proper HTTP error codes
4. **Methods**: Support GET, POST, PUT, DELETE

### Template

```typescript
// server/api/[resource].ts
export default defineEventHandler(async (event) => {
  // For POST/PUT, get body
  const body = await readBody(event)

  // For GET with params
  const query = getQuery(event)

  // Validation
  if (!body.name) {
    throw createError({
      statusCode: 400,
      message: 'Name is required'
    })
  }

  // Your logic here

  return {
    success: true,
    data: result
  }
})
```

### Method-Specific Files

```
server/api/users.get.ts    # GET /api/users
server/api/users.post.ts   # POST /api/users
server/api/users/[id].ts   # GET/PUT/DELETE /api/users/:id
```

## Example

User: `/api products post`

Creates `server/api/products.post.ts` with body validation and error handling.
