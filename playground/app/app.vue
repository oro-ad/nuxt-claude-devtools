<template>
  <NuxtPage />
</template>

<style>
:root {
  --color-primary: #FE9A00;
  --color-primary-dark: #e58a00;
  --color-primary-rgb: 254, 154, 0;
  --color-nuxt: #00dc82;
  --color-nuxt-rgb: 0, 220, 130;
  --color-claude: #FE9A00;
  --radius: 16px;
  --radius-sm: 10px;

  /* Glassmorphism */
  --glass-blur: 20px;
  --glass-border: 1px solid rgba(255, 255, 255, 0.1);
}

/* Dark mode (default) */
:root,
.dark {
  --color-bg: #0c0c0c;
  --color-bg-elevated: rgba(25, 25, 25, 0.8);
  --color-bg-card: rgba(35, 35, 35, 0.7);
  --color-bg-solid: #161616;
  --color-text: #ffffff;
  --color-text-muted: #a1a1aa;
  --color-border: rgba(255, 255, 255, 0.08);
  --color-border-strong: rgba(255, 255, 255, 0.15);

  /* Gradient backgrounds */
  --gradient-bg: radial-gradient(ellipse 80% 50% at 50% -20%, rgba(254, 154, 0, 0.12), transparent),
  radial-gradient(ellipse 50% 50% at 20% 80%, rgba(254, 154, 0, 0.06), transparent);

  /* Shadows */
  --shadow-sm: 0 2px 8px rgba(0, 0, 0, 0.3);
  --shadow-md: 0 8px 32px rgba(0, 0, 0, 0.4);
  --shadow-lg: 0 16px 64px rgba(0, 0, 0, 0.5);
  --shadow-glow: 0 0 40px rgba(254, 154, 0, 0.25);
}

/* Light mode */
.light {
  --color-bg: #fafafa;
  --color-bg-elevated: rgba(255, 255, 255, 0.8);
  --color-bg-card: rgba(255, 255, 255, 0.9);
  --color-bg-solid: #ffffff;
  --color-text: #18181b;
  --color-text-muted: #71717a;
  --color-border: rgba(0, 0, 0, 0.06);
  --color-border-strong: rgba(0, 0, 0, 0.12);

  /* More contrasting orange for light theme */
  --color-primary: #FF6900;
  --color-primary-dark: #e55f00;
  --color-primary-rgb: 255, 105, 0;
  --color-claude: #FF6900;

  /* Gradient backgrounds */
  --gradient-bg: radial-gradient(ellipse 80% 50% at 50% -20%, rgba(255, 105, 0, 0.1), transparent),
  radial-gradient(ellipse 50% 50% at 20% 80%, rgba(255, 105, 0, 0.05), transparent);

  /* Shadows */
  --shadow-sm: 0 2px 8px rgba(0, 0, 0, 0.04);
  --shadow-md: 0 8px 32px rgba(0, 0, 0, 0.06);
  --shadow-lg: 0 16px 64px rgba(0, 0, 0, 0.1);
  --shadow-glow: 0 0 40px rgba(255, 105, 0, 0.2);
}

* {
  box-sizing: border-box;
  margin: 0;
  padding: 0;
}

body {
  font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
  background: var(--color-bg);
  color: var(--color-text);
  line-height: 1.6;
  transition: background-color 0.3s ease, color 0.3s ease;
  min-height: 100vh;
}

/* Utility: Glass card */
.glass {
  background: var(--color-bg-elevated);
  backdrop-filter: blur(var(--glass-blur));
  -webkit-backdrop-filter: blur(var(--glass-blur));
  border: var(--glass-border);
  box-shadow: var(--shadow-md);
}

.glass-strong {
  background: var(--color-bg-card);
  backdrop-filter: blur(calc(var(--glass-blur) * 1.5));
  -webkit-backdrop-filter: blur(calc(var(--glass-blur) * 1.5));
  border: 1px solid var(--color-border-strong);
  box-shadow: var(--shadow-lg);
}
</style>
