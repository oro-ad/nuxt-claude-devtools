# nuxt-claude-devtools

Nuxt DevTools integration for Claude Code AI assistant.

## Description

`@oro.ad/nuxt-claude-devtools` is a Nuxt module that integrates Claude Code AI assistant into Nuxt DevTools. This module allows developers to interact with Claude AI directly from the Nuxt development environment.

## Features

- Integration with Nuxt DevTools
- Real-time communication via Socket.IO
- Support for Claude Code AI assistant
- Markdown rendering support

## Installation

```bash
npm install @oro.ad/nuxt-claude-devtools
```

## Usage

Add the module to your `nuxt.config.ts`:

```typescript
export default defineNuxtConfig({
  modules: ['@oro.ad/nuxt-claude-devtools']
})
```

## Development

```bash
# Install dependencies
npm install

# Start development server
npm run dev

# Build the module
npm run prepack
```

## Playground

This directory contains a playground application for testing and developing the module.

## License

GPL-3.0-only

## Author

Simon Bystrov <jobsbystr@gmail.com> (https://sbystr.com/)

## Repository

https://github.com/oro-ad/nuxt-claude-devtools
