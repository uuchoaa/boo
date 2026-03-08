# boo

Ghost developer that generates conventional commits mimicking Rafael Uchôa's commit style.

Built with React + Vite. Integrates with [Groq](https://console.groq.com) (and Anthropic) via their APIs for LLM inference.

## Setup

```bash
cp .env.local.example .env.local  # add VITE_GROQ_API_KEY (or set key in-app)
npm install
npm run dev
```

## Commands

```bash
npm run dev     # dev server at http://localhost:5173
npm run build   # production build to dist/
npm run lint    # ESLint
```
