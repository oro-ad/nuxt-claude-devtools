# 💡 Examples & Use Cases

Practical examples of what you can build with Claude in this playground.

---

## 🧩 Component Examples

### Simple Card Component

**Prompt:** "Create a simple info card with icon, title, and description"

```vue
<script setup lang="ts">
defineProps<{
  icon: string
  title: string
  description: string
}>()
</script>

<template>
  <div class="info-card">
    <span class="icon">{{ icon }}</span>
    <h3>{{ title }}</h3>
    <p>{{ description }}</p>
  </div>
</template>

<style scoped>
.info-card {
  background: var(--color-bg-elevated);
  border: 1px solid var(--color-border);
  border-radius: var(--radius);
  padding: 24px;
  text-align: center;
}

.icon {
  font-size: 32px;
  margin-bottom: 12px;
  display: block;
}

h3 {
  color: var(--color-text);
  margin-bottom: 8px;
}

p {
  color: var(--color-text-muted);
  font-size: 14px;
}
</style>
```

---

### Interactive Counter

**Prompt:** "Build a counter with increment/decrement buttons and animation"

```vue
<script setup lang="ts">
import { ref } from 'vue'

const count = ref(0)

const increment = () => count.value++
const decrement = () => count.value--
</script>

<template>
  <div class="counter">
    <button @click="decrement" :disabled="count <= 0">−</button>
    <span class="value">{{ count }}</span>
    <button @click="increment">+</button>
  </div>
</template>

<style scoped>
.counter {
  display: flex;
  align-items: center;
  gap: 16px;
}

button {
  width: 40px;
  height: 40px;
  border-radius: 50%;
  background: var(--color-primary);
  color: white;
  font-size: 20px;
  border: none;
  cursor: pointer;
  transition: transform 0.2s, opacity 0.2s;
}

button:hover:not(:disabled) {
  transform: scale(1.1);
}

button:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.value {
  font-size: 32px;
  font-weight: bold;
  min-width: 60px;
  text-align: center;
}
</style>
```

---

### Modal Dialog

**Prompt:** "Create a reusable modal with backdrop and close button"

```vue
<script setup lang="ts">
defineProps<{
  title: string
  open: boolean
}>()

const emit = defineEmits<{
  (e: 'close'): void
}>()

const handleBackdropClick = (event: MouseEvent) => {
  if (event.target === event.currentTarget) {
    emit('close')
  }
}
</script>

<template>
  <Teleport to="body">
    <Transition name="modal">
      <div v-if="open" class="backdrop" @click="handleBackdropClick">
        <div class="modal">
          <header>
            <h2>{{ title }}</h2>
            <button class="close" @click="emit('close')">×</button>
          </header>
          <div class="content">
            <slot />
          </div>
        </div>
      </div>
    </Transition>
  </Teleport>
</template>

<style scoped>
.backdrop {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.7);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
}

.modal {
  background: var(--color-bg-elevated);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-lg);
  width: 90%;
  max-width: 500px;
  max-height: 80vh;
  overflow: hidden;
}

header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 16px 20px;
  border-bottom: 1px solid var(--color-border);
}

.close {
  background: none;
  border: none;
  font-size: 24px;
  color: var(--color-text-muted);
  cursor: pointer;
}

.content {
  padding: 20px;
}

/* Transitions */
.modal-enter-active,
.modal-leave-active {
  transition: all 0.3s ease;
}

.modal-enter-from,
.modal-leave-to {
  opacity: 0;
}

.modal-enter-from .modal,
.modal-leave-to .modal {
  transform: scale(0.9);
}
</style>
```

---

## 🔄 Composable Examples

### useLocalStorage

**Prompt:** "Create a composable that syncs state with localStorage"

```typescript
// composables/useLocalStorage.ts
import { ref, watch, onMounted } from 'vue'

export function useLocalStorage<T>(key: string, defaultValue: T) {
  const data = ref<T>(defaultValue)

  onMounted(() => {
    const stored = localStorage.getItem(key)
    if (stored) {
      try {
        data.value = JSON.parse(stored)
      } catch {
        data.value = defaultValue
      }
    }
  })

  watch(data, (newValue) => {
    localStorage.setItem(key, JSON.stringify(newValue))
  }, { deep: true })

  return data
}
```

**Usage:**
```vue
<script setup lang="ts">
const theme = useLocalStorage('theme', 'dark')
</script>
```

---

### useDebounce

**Prompt:** "Create a debounce composable for search inputs"

```typescript
// composables/useDebounce.ts
import { ref, watch, type Ref } from 'vue'

export function useDebounce<T>(value: Ref<T>, delay = 300): Ref<T> {
  const debounced = ref(value.value) as Ref<T>
  let timeout: ReturnType<typeof setTimeout>

  watch(value, (newValue) => {
    clearTimeout(timeout)
    timeout = setTimeout(() => {
      debounced.value = newValue
    }, delay)
  })

  return debounced
}
```

**Usage:**
```vue
<script setup lang="ts">
const searchQuery = ref('')
const debouncedQuery = useDebounce(searchQuery, 500)

watch(debouncedQuery, (query) => {
  // Fetch search results
})
</script>
```

---

## 🔌 API Examples

### CRUD Endpoints

**Prompt:** "Create REST endpoints for a todos resource"

```typescript
// server/api/todos/index.get.ts
export default defineEventHandler(async () => {
  // Fetch all todos
  return [
    { id: 1, title: 'Learn Nuxt', done: true },
    { id: 2, title: 'Build app', done: false }
  ]
})

// server/api/todos/index.post.ts
export default defineEventHandler(async (event) => {
  const body = await readBody(event)

  if (!body.title) {
    throw createError({
      statusCode: 400,
      message: 'Title is required'
    })
  }

  return {
    id: Date.now(),
    title: body.title,
    done: false
  }
})

// server/api/todos/[id].patch.ts
export default defineEventHandler(async (event) => {
  const id = getRouterParam(event, 'id')
  const body = await readBody(event)

  return {
    id: Number(id),
    ...body
  }
})

// server/api/todos/[id].delete.ts
export default defineEventHandler(async (event) => {
  const id = getRouterParam(event, 'id')
  return { deleted: true, id: Number(id) }
})
```

---

## 🧪 Test Examples

**Prompt:** "Write tests for the DemoButton component"

```typescript
// components/DemoButton.test.ts
import { describe, it, expect } from 'vitest'
import { mount } from '@vue/test-utils'
import DemoButton from './DemoButton.vue'

describe('DemoButton', () => {
  it('renders slot content', () => {
    const wrapper = mount(DemoButton, {
      slots: {
        default: 'Click me'
      }
    })
    expect(wrapper.text()).toContain('Click me')
  })

  it('emits click event', async () => {
    const wrapper = mount(DemoButton)
    await wrapper.trigger('click')
    expect(wrapper.emitted('click')).toHaveLength(1)
  })

  it('has hover styles', () => {
    const wrapper = mount(DemoButton)
    expect(wrapper.classes()).toContain('demo-button')
  })
})
```

---

## 🎨 Styling Examples

### Gradient Text

```css
.gradient-text {
  background: linear-gradient(135deg, var(--color-primary), var(--color-nuxt));
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
}
```

### Glass Effect

```css
.glass {
  background: rgba(255, 255, 255, 0.05);
  backdrop-filter: blur(10px);
  border: 1px solid rgba(255, 255, 255, 0.1);
  border-radius: var(--radius);
}
```

### Skeleton Loader

```css
.skeleton {
  background: linear-gradient(
    90deg,
    var(--color-bg-elevated) 25%,
    var(--color-bg-card) 50%,
    var(--color-bg-elevated) 75%
  );
  background-size: 200% 100%;
  animation: shimmer 1.5s infinite;
  border-radius: var(--radius-sm);
}

@keyframes shimmer {
  0% { background-position: 200% 0; }
  100% { background-position: -200% 0; }
}
```

---

## 📝 Prompts to Try

Here are some prompts you can use with Claude:

| Category | Prompt |
|----------|--------|
| Component | "Create a notification toast with auto-dismiss" |
| Component | "Build a star rating component" |
| Component | "Make a drag-and-drop sortable list" |
| Composable | "Create useMediaQuery for responsive logic" |
| Composable | "Build useIntersectionObserver for lazy loading" |
| API | "Create an API route with pagination" |
| API | "Add rate limiting to an endpoint" |
| Styling | "Add a page transition animation" |
| Testing | "Write E2E tests with Playwright" |

