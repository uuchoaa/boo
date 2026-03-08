# Boo — Deployment Model

**Version:** 1.0  
**Date:** 2026-03-07  
**Status:** Draft  

---

## Overview

Boo is a local-first system. All components run on the developer's machine except the LLM inference (Anthropic API) and the git remote (GitHub). There is no application server, no database, and no cloud storage.

---

## Deployment Topology

```
┌──────────────────────────────────────────────────────────────────┐
│                     Developer Machine (macOS)                     │
│                                                                    │
│  ┌─────────────────────────────────────────────────────────┐     │
│  │  Browser (Claude.ai or local HTML)                       │     │
│  │  ┌──────────────────────────────────────────────────┐   │     │
│  │  │  Boo Web UI  (React JSX artifact)                │   │     │
│  │  │  – Input: Markdown textarea                       │   │     │
│  │  │  – Output: Commit timeline + cost                 │   │     │
│  │  │  – Export: boo-commits.json / boo-commits.md      │   │     │
│  │  └──────────────────────┬───────────────────────────┘   │     │
│  └─────────────────────────┼───────────────────────────────┘     │
│                             │ HTTPS /v1/messages                  │
│  ┌──────────────────────────┼───────────────────────────────┐     │
│  │  Terminal                │                                │     │
│  │                          ▼                                │     │
│  │  post_processor.rb ◄── boo-commits.json                  │     │
│  │       │                                                   │     │
│  │       ▼                                                   │     │
│  │  commits_scheduled.json                                   │     │
│  │       │                                                   │     │
│  │       ▼                                                   │     │
│  │  deploy.sh                                                │     │
│  │       ├── git apply --index                               │     │
│  │       ├── git commit --date                               │     │
│  │       └── git push + gh pr create                        │     │
│  └───────────────────────────────────────────────────────── ┘     │
│                                                                    │
│  ┌──────────────────────────────────────────────────────────┐     │
│  │  OpenClaw (optional)                                      │     │
│  │  – Runs SKILL.md workflow                                 │     │
│  │  – Heartbeat: monitors GitHub issues                      │     │
│  │  – Triggers: post_processor.rb + deploy.sh at schedule   │     │
│  └──────────────────────────────────────────────────────────┘     │
└──────────────────────────────────────────────────────────────────┘
           │ HTTPS                              │ HTTPS + SSH
           ▼                                    ▼
  ┌─────────────────┐                  ┌────────────────┐
  │  Anthropic API  │                  │    GitHub      │
  │  claude-opus-4  │                  │  – git remote  │
  └─────────────────┘                  │  – PRs         │
                                       │  – Reviews     │
                                       └────────────────┘
```

---

## Runtime Environments

### Browser (Boo Web UI)

| Property | Value |
|---|---|
| Runtime | Any modern browser (Chrome, Safari, Firefox) |
| Hosting | Claude.ai artifact renderer or local HTML file |
| Dependencies | React (CDN), JetBrains Mono (Google Fonts CDN) |
| Persistence | None — ephemeral session state only |
| Network | Outbound HTTPS to `api.anthropic.com` only |

### Terminal (post_processor + deploy)

| Property | Value |
|---|---|
| OS | macOS (primary), Linux compatible |
| Ruby | 3.x, stdlib only (`json`, `time`, `date`) |
| Bash | 3.x+ |
| Dependencies | `jq` (JSON CLI), `git` 2.x+, `gh` (GitHub CLI) |
| Authentication | `gh auth login` required; Anthropic API key in browser proxy |

### OpenClaw (optional)

| Property | Value |
|---|---|
| Runtime | Local daemon, macOS |
| Config | `~/.openclaw/workspace/boo/SKILL.md` |
| Persistence | Markdown files in `~/.openclaw/workspace/boo/` |
| Triggers | Heartbeat (configurable interval) + manual invocation |

---

## File Artifacts & Locations

```
~/projects/<repo>/
├── boo-commits.json              ← exported from UI (input to post-processor)
├── boo-commits.md                ← exported from UI (human-readable)
├── commits_with_timestamps.json  ← post-processor output (local review)
├── commits_scheduled.json        ← post-processor output (scheduled deploy)
└── PR_BODY.md                    ← generated PR description

~/.openclaw/workspace/boo/
├── SKILL.md                      ← OpenClaw Skill definition
├── fingerprints/
│   ├── rafael_uchoa.md           ← developer profile
│   └── jordan_casey.md
└── history/
    └── <issue-id>/
        ├── commits.json
        └── benchmark.md
```

---

## Network Dependencies

| Dependency | Protocol | Required | When |
|---|---|---|---|
| `api.anthropic.com` | HTTPS | Yes | Commit generation, self-eval, review response |
| `api.github.com` | HTTPS | Yes | PR creation, review interaction |
| `github.com` | SSH or HTTPS | Yes | `git push` |
| `fonts.googleapis.com` | HTTPS | No | UI typography (degrades gracefully) |

---

## Installation

### Minimal (UI only)

No installation required. Open `boo-app.jsx` as a Claude artifact.

### Full Pipeline

```bash
# 1. Install GitHub CLI
brew install gh
gh auth login

# 2. Install jq
brew install jq

# 3. Verify Ruby
ruby --version  # 3.x required

# 4. Clone or copy scripts
cp post_processor.rb ~/bin/
cp deploy.sh ~/bin/
chmod +x ~/bin/deploy.sh

# 5. Optional: OpenClaw
# Follow OpenClaw installation docs
# Copy SKILL.md to ~/.openclaw/workspace/boo/SKILL.md
```

---

## Security Perimeter

```
TRUSTED (local machine):
  – All code, diffs, and codebase context
  – Exported JSON/MD files
  – git history (until push)

EXTERNAL (leaves machine):
  – Issue description + codebase context → Anthropic API (for generation)
  – git commits + diffs → GitHub (on push)
  – PR description → GitHub

NEVER LEAVES MACHINE:
  – Anthropic API key (handled by browser proxy)
  – Developer fingerprint profiles
  – Benchmark history
```
