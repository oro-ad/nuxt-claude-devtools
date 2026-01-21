# Styling Guide

CSS architecture and design system for this project.

## Design Tokens

### Colors

```css
:root {
  /* Brand Colors */
  --color-primary: #10a37f;      /* Claude green */
  --color-primary-dark: #0d8a6a;
  --color-nuxt: #00dc82;         /* Nuxt green */
  --color-claude: #d97706;       /* Claude orange */

  /* Background Colors */
  --color-bg: #0f0f0f;           /* Page background */
  --color-bg-elevated: #1a1a1a;  /* Cards, sections */
  --color-bg-card: #242424;      /* Interactive elements */

  /* Text Colors */
  --color-text: #ffffff;         /* Primary text */
  --color-text-muted: #a0a0a0;   /* Secondary text */

  /* Border */
  --color-border: #333333;
}
```

### Spacing

```css
:root {
  --space-xs: 4px;
  --space-sm: 8px;
  --space-md: 16px;
  --space-lg: 24px;
  --space-xl: 32px;
  --space-2xl: 48px;
}
```

### Border Radius

```css
:root {
  --radius-sm: 8px;
  --radius: 12px;
  --radius-lg: 16px;
  --radius-full: 9999px;
}
```

## Typography

### Font Stack

```css
font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
```

### Font Sizes

| Class | Size | Usage |
|-------|------|-------|
| `text-xs` | 12px | Badges, labels |
| `text-sm` | 14px | Body text, descriptions |
| `text-base` | 16px | Default body |
| `text-lg` | 18px | Section subtitles |
| `text-xl` | 20px | Card titles |
| `text-2xl` | 24px | Section titles |
| `text-4xl` | 40px | Page headings |
| `text-5xl` | 56px | Hero heading |

## Component Patterns

### Cards

```css
.card {
  background: var(--color-bg-elevated);
  border: 1px solid var(--color-border);
  border-radius: var(--radius);
  padding: var(--space-lg);
  transition: all 0.2s;
}

.card:hover {
  border-color: var(--color-primary);
  transform: translateY(-4px);
}
```

### Buttons

```css
.btn {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  padding: 14px 28px;
  border-radius: var(--radius);
  font-size: 16px;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s;
}

.btn-primary {
  background: var(--color-primary);
  color: white;
}

.btn-primary:hover {
  background: var(--color-primary-dark);
  transform: translateY(-2px);
}
```

### Inputs

```css
.input {
  width: 100%;
  padding: 12px 16px;
  background: var(--color-bg);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-sm);
  color: var(--color-text);
  font-size: 14px;
}

.input:focus {
  outline: none;
  border-color: var(--color-primary);
  box-shadow: 0 0 0 3px rgba(16, 163, 127, 0.2);
}
```

## Responsive Design

### Breakpoints

```css
/* Mobile: default */

/* Tablet */
@media (min-width: 768px) { }

/* Desktop */
@media (min-width: 1024px) { }

/* Large Desktop */
@media (min-width: 1280px) { }
```

### Mobile-First Example

```css
/* Mobile: Stack vertically */
.grid {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

/* Tablet: 2 columns */
@media (min-width: 768px) {
  .grid {
    flex-direction: row;
    flex-wrap: wrap;
  }
  .grid > * {
    width: calc(50% - 8px);
  }
}

/* Desktop: 4 columns */
@media (min-width: 1024px) {
  .grid {
    display: grid;
    grid-template-columns: repeat(4, 1fr);
    gap: 24px;
  }
}
```

## Animations

### Transitions

```css
/* Default transition */
transition: all 0.2s ease;

/* Smooth color change */
transition: color 0.15s ease;

/* Transform animations */
transition: transform 0.3s cubic-bezier(0.4, 0, 0.2, 1);
```

### Keyframes

```css
/* Fade in */
@keyframes fadeIn {
  from { opacity: 0; }
  to { opacity: 1; }
}

/* Slide up */
@keyframes slideUp {
  from {
    opacity: 0;
    transform: translateY(20px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

/* Pulse */
@keyframes pulse {
  0%, 100% { opacity: 1; }
  50% { opacity: 0.5; }
}
```

## Dark Mode

This project uses dark mode by default. To support light mode:

```css
:root {
  /* Dark mode (default) */
  --color-bg: #0f0f0f;
  --color-text: #ffffff;
}

@media (prefers-color-scheme: light) {
  :root {
    --color-bg: #ffffff;
    --color-text: #1f2937;
  }
}
```
