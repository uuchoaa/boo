# Boo — Software Architecture Document (SAD)

**Version:** 1.0  
**Date:** 2026-03-07  
**Status:** Draft  

---

## 1. Architectural Overview

Boo is a local-first pipeline. There is no server, no database, and no persistent cloud state. All intelligence flows through a single LLM call per generation cycle; all execution is local Ruby + bash + git.

```
┌─────────────────────────────────────────────────────────────┐
│                        Developer Machine                      │
│                                                               │
│  ┌──────────────┐    ┌─────────────────┐                     │
│  │  Boo Web UI  │───>│  Anthropic API  │ (Claude Opus)       │
│  │  (React JSX) │<───│  /v1/messages   │                     │
│  └──────┬───────┘    └─────────────────┘                     │
│         │ export JSON/MD                                      │
│         ▼                                                     │
│  ┌──────────────────┐                                        │
│  │  post_processor  │ (Ruby CLI)                             │
│  │  .rb             │                                        │
│  └──────┬───────────┘                                        │
│         │ commits_scheduled.json                             │
│         ▼                                                     │
│  ┌──────────────────┐    ┌─────────────┐                     │
│  │  deploy.sh       │───>│  git + gh   │                     │
│  │  (bash)          │    │  (local)    │                     │
│  └──────────────────┘    └──────┬──────┘                     │
│                                 │ push + PR                  │
└─────────────────────────────────┼─────────────────────────── ┘
                                  ▼
                           ┌─────────────┐
                           │   GitHub    │
                           └─────────────┘
```

---

## 2. Components

### 2.1 Boo Web UI

**Technology:** React (JSX), single-file artifact  
**Responsibility:** Input collection, API orchestration, commit visualization, export

**Key decisions:**
- Single-file artifact — no build step, no dependencies beyond React + fetch
- State is ephemeral — no localStorage, no persistence between sessions
- Export is the persistence boundary — once exported, state lives in files

**Internal structure:**
```
BooApp
├── InputPhase      — Markdown textarea + generate button
├── ResultPhase
│   ├── Sidebar     — commit count, type breakdown, cost
│   └── CommitList
│       └── CommitCard (×N) — expandable, diff viewer
└── Header          — export buttons, "← new" reset
```

### 2.2 Claude Opus (LLM)

**Technology:** Anthropic API, `claude-opus-4-5` model  
**Responsibility:** Transform (issue + codebase context + fingerprint) → ordered commit sequence

**Prompt architecture:**
```
System prompt (BLOCK 1/2)
├── Developer identity declaration
├── 14 code fingerprint dimensions
├── Pre-generation checklist (re-read, reuse, nil-check)
└── JSON schema specification

User prompt (BLOCK 5)
├── Issue description
└── Codebase context (relevant files)
```

**Output contract:**
```json
{
  "commits": [
    {
      "order": Integer,
      "message": String,
      "files": Array<String>,
      "diff": String
    }
  ]
}
```

### 2.3 Post-Processor

**Technology:** Ruby (stdlib only — `json`, `time`)  
**Responsibility:** Inject timestamps into commit plan using profile-aware distributions

**Two modes:**
- **Past mode** (default): anchors in past, last commit ≤ now. For local review.
- **Schedule mode** (`--schedule`): distributes into future window. For deploy.

**Profile dispatch:**
```ruby
PROFILES = {
  rafael: { delta: Normal(μ=90, σ=30, min=20) },
  jordan: { delta: Burst(message-aware ranges) }
}
```

### 2.4 Deploy Script

**Technology:** Bash + `jq` + `git` + `gh`  
**Responsibility:** Apply diffs, commit with historical dates, push, open draft PR

**Critical operations:**
- `git apply --index` — applies diff to index without touching working tree
- `GIT_AUTHOR_DATE` + `GIT_COMMITTER_DATE` — overrides both timestamp fields
- `gh pr create --draft` — opens PR without triggering CI merge requirements

### 2.5 OpenClaw (Optional)

**Technology:** OpenClaw local agent runtime  
**Responsibility:** Cron-based scheduling of deploy.sh execution; persistent state in Markdown files

**Integration point:** OpenClaw Skill (SKILL.md) wraps the full pipeline as a named workflow, triggerable by natural language.

---

## 3. Key Architectural Decisions

### ADR-01: Single LLM Call Per Generation

**Decision:** Generate all commits in a single API call, not iteratively per commit.

**Rationale:** Iterative generation loses global coherence — the model can't see commit 5 while writing commit 1. A single call with full context produces better ordering and avoids contradictions between commits.

**Trade-off:** Higher token usage per call (~$0.05–0.15 per issue). Acceptable given low call frequency.

### ADR-02: JSON as Pipeline Boundary

**Decision:** The UI exports JSON; the post-processor and deploy script consume JSON. No direct UI → git integration.

**Rationale:** Separates concerns cleanly. The UI is a browser artifact with no filesystem access. JSON is the contract between the human-approval step and the machine-execution step.

### ADR-03: Timestamp Distribution as Post-Processing

**Decision:** LLM generates commit content only; timestamps are injected by a separate Ruby script.

**Rationale:** Timestamp distribution is deterministic math, not reasoning. Using LLM tokens for random number generation is wasteful and less controllable than a dedicated script with explicit profile parameters.

### ADR-04: Immutability After Export

**Decision:** Once a CommitPlan is exported, it cannot be regenerated via the UI.

**Rationale:** Regeneration after export risks desync between what the developer reviewed and what gets applied to git. The approved plan is the contract.

### ADR-05: No Regeneration Button in UI

**Decision:** The UI has no "regenerate" button. Iteration happens in the LLM conversation (self-eval → targeted fix), not in the UI.

**Rationale:** The UI is a visualization and export tool, not a chat interface. Keeping iteration in the LLM conversation preserves full context for the self-evaluation loop.

---

## 4. Data Flow

### Generation Flow

```
1. Developer pastes Markdown → Boo UI
2. UI POSTs to /v1/messages with system + user prompts
3. Opus returns JSON string in content[0].text
4. UI strips markdown fences, JSON.parse()
5. UI renders CommitPlan
6. Developer reviews → exports boo-commits.json
```

### Scheduling Flow

```
1. ruby post_processor.rb boo-commits.json rafael --schedule "DATE WINDOW TZ"
2. Script validates: future date, not today
3. Distributes timestamps with jitter
4. Writes commits_scheduled.json
```

### Deploy Flow

```
1. bash deploy.sh commits_scheduled.json
2. For each commit:
   a. echo "$diff" | git apply --index -
   b. GIT_AUTHOR_DATE=... GIT_COMMITTER_DATE=... git commit -m "$message"
3. git push origin HEAD
4. gh pr create --draft --title "..." --body "$(cat PR_BODY.md)"
```

---

## 5. Security Considerations

- API key is handled by the browser's Anthropic API proxy — never embedded in exported files
- No code leaves the machine until `git push` in deploy step
- `git apply --check` recommended before `git apply --index` in production use
- OpenClaw Skill should not auto-approve plans — developer review is a required gate

---

## 6. Extension Points

| Extension | Mechanism |
|---|---|
| New developer profile | Add entry to `PROFILES` in post_processor.rb + new BLOCK 1/2 variant |
| New LLM model | Change `MODEL` constant in Boo UI |
| Review response automation | Implement BLOCK 9 as OpenClaw Skill step |
| Multi-profile benchmark | Parameterize Boo UI with profile selector dropdown |
| Fingerprint learning | Future: ingest `git log` + `git show` to auto-generate BLOCK 1 |
