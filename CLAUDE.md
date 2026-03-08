# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
npm run dev       # Start dev server with HMR at http://localhost:5173
npm run build     # Production build to dist/
npm run preview   # Preview production build locally
npm run lint      # Run ESLint
```

No test runner is configured. There is no TypeScript — the project uses plain `.jsx` and `.js` files.

## Architecture

Single-page React app built with Vite. All application logic lives in `src/App.jsx`. The app (called "BooApp") integrates with the [Groq API](https://console.groq.com) via `groq-sdk` for LLM inference.

Key features built into this app:
- **Model selection**: user can switch between Groq-hosted models
- **Performance tracking**: measures and displays inference timing
- **Export**: saves responses as JSON and Markdown files, with model-specific filenames
- **JSON parsing**: handles and recovers from malformed JSON in LLM responses

The Groq client is instantiated in the browser using a `GROQ_API_KEY` (typically from a `.local` env file, which is gitignored). Vite exposes env vars prefixed with `VITE_` to the client bundle.

## ESLint

Config is in `eslint.config.js` using the flat config format. Rule of note: `no-unused-vars` ignores variables matching `^[A-Z_]` (all-caps constants).
