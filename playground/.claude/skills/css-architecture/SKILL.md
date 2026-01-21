---
name: css-architecture
description: CSS and styling best practices. Use when working with styles, layouts, or theming.
---

Follow modern CSS architecture patterns:

## CSS Variables

Use CSS custom properties for theming:

```css
:root {
  /* Colors */
  --color-primary: #10a37f;
  --color-primary-dark: #0d8a6a;
  --color-bg: #0f0f0f;
  --color-bg-elevated: #1a1a1a;
  --color-text: #ffffff;
  --color-text-muted: #a0a0a0;
  --color-border: #333333;

  /* Spacing */
  --space-xs: 4px;
  --space-sm: 8px;
  --space-md: 16px;
  --space-lg: 24px;
  --space-xl: 32px;

  /* Border Radius */
  --radius-sm: 8px;
  --radius: 12px;
  --radius-lg: 16px;
}
```

## Scoped Styles

Always use `<style scoped>` in Vue components:

```vue
<style scoped>
.card {
  background: var(--color-bg-elevated);
  border-radius: var(--radius);
}
</style>
```

## Flexbox & Grid

Prefer modern layout methods:

```css
/* Flexbox for 1D layouts */
.row {
  display: flex;
  gap: var(--space-md);
  align-items: center;
}

/* Grid for 2D layouts */
.grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
  gap: var(--space-lg);
}
```

## Mobile-First

Start with mobile styles, add breakpoints for larger screens:

```css
.container {
  padding: var(--space-md);
}

@media (min-width: 768px) {
  .container {
    padding: var(--space-lg);
  }
}

@media (min-width: 1024px) {
  .container {
    padding: var(--space-xl);
    max-width: 1200px;
    margin: 0 auto;
  }
}
```

## Transitions

Use consistent transitions:

```css
.button {
  transition: all 0.2s ease;
}

.button:hover {
  transform: translateY(-2px);
}
```

## Dark Mode

This project uses dark mode by default. For light mode support:

```css
@media (prefers-color-scheme: light) {
  :root {
    --color-bg: #ffffff;
    --color-text: #1f2937;
  }
}
```
