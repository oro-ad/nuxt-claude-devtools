# /test — Generate Tests

Generate Vitest tests for Vue components or functions.

## Usage

```
/test [component or function name]
```

## Instructions

When generating tests:

### Setup
- Use Vitest with `@vue/test-utils`
- Create test file next to source: `Component.test.ts`
- Import from `vitest`: `describe`, `it`, `expect`, `vi`

### Test Categories

1. **Rendering**: Component mounts without errors
2. **Props**: Props are properly applied
3. **Emits**: Events are emitted correctly
4. **Interactions**: User actions work as expected
5. **Edge Cases**: Handle null, undefined, empty states

### Template

```typescript
import { describe, it, expect } from 'vitest'
import { mount } from '@vue/test-utils'
import ComponentName from './ComponentName.vue'

describe('ComponentName', () => {
  it('renders properly', () => {
    const wrapper = mount(ComponentName, {
      props: {
        // required props
      }
    })
    expect(wrapper.exists()).toBe(true)
  })

  it('displays the correct content', () => {
    const wrapper = mount(ComponentName, {
      props: { title: 'Hello' }
    })
    expect(wrapper.text()).toContain('Hello')
  })

  it('emits event on click', async () => {
    const wrapper = mount(ComponentName)
    await wrapper.find('button').trigger('click')
    expect(wrapper.emitted('click')).toBeTruthy()
  })
})
```

## Example

User: `/test DemoButton`

Generates tests for DemoButton component covering rendering, click events, and ripple effect.
