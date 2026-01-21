# /refactor — Refactor Code

Refactor selected code or component for better structure, performance, or readability.

## Usage

```
/refactor [description of what to improve]
```

## Instructions

When refactoring Vue/Nuxt code:

### Code Quality
- Extract repeated logic into composables
- Replace magic numbers with named constants
- Improve variable and function names
- Add TypeScript types where missing
- Remove dead code and unused imports

### Performance
- Memo expensive computations with `computed()`
- Use `shallowRef()` for large objects not needing deep reactivity
- Lazy load components with `defineAsyncComponent()`
- Add `v-once` for static content
- Use `v-memo` for expensive list renders

### Patterns
- Extract complex logic into composables (`composables/`)
- Split large components into smaller ones
- Use provide/inject for deep prop drilling
- Replace watchers with computed when possible

## Examples

**Input:** `/refactor extract the form validation logic`

**Action:** Create a `useFormValidation` composable and refactor the component to use it.

**Input:** `/refactor improve performance`

**Action:** Analyze the component for performance issues and apply optimizations.
