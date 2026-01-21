# /composable — Create Composable

Generate a Vue 3 composable function with proper TypeScript types.

## Usage

```
/composable [name] [description]
```

## Instructions

Create composables in `composables/` directory:

1. **Naming**: Start with `use` prefix (`useCounter`, `useAuth`)
2. **Types**: Full TypeScript with return type
3. **Reactivity**: Use refs for mutable state
4. **SSR-Safe**: Consider server-side rendering

### Template

```typescript
// composables/useFeatureName.ts
import { ref, computed, onMounted, onUnmounted } from 'vue'

interface UseFeatureNameOptions {
  initialValue?: string
  // other options
}

interface UseFeatureNameReturn {
  state: Ref<string>
  computedValue: ComputedRef<string>
  doSomething: () => void
}

export function useFeatureName(
  options: UseFeatureNameOptions = {}
): UseFeatureNameReturn {
  const { initialValue = '' } = options

  // State
  const state = ref(initialValue)

  // Computed
  const computedValue = computed(() => state.value.toUpperCase())

  // Methods
  function doSomething() {
    state.value = 'something'
  }

  // Lifecycle (if needed)
  onMounted(() => {
    // setup
  })

  onUnmounted(() => {
    // cleanup
  })

  return {
    state,
    computedValue,
    doSomething
  }
}
```

## Common Patterns

- `useLocalStorage(key)` — Persist state to localStorage
- `useFetch(url)` — Data fetching with loading/error states
- `useDebounce(value, delay)` — Debounced reactive value
- `useMediaQuery(query)` — Reactive media query matching

## Example

User: `/composable useTheme dark mode toggle`

Creates `composables/useTheme.ts` with dark/light mode state and toggle function.
