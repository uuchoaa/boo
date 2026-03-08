# Boo — Use Cases

**Version:** 1.0  
**Date:** 2026-03-07  
**Status:** Draft  

---

## Actors

| Actor | Description |
|---|---|
| **Developer** | Rafael Uchôa — primary user, approves all plans before execution |
| **Boo UI** | Web interface (React artifact) for input and visualization |
| **Claude Opus** | LLM backend — generates commits and review responses |
| **Post-Processor** | Ruby script — distributes timestamps |
| **OpenClaw** | Local agent — schedules and executes git operations |
| **GitHub** | Remote — receives PRs and review interactions |

---

## UC-01: Generate Commit Plan

**Actor:** Developer  
**Precondition:** Developer has an issue and relevant codebase context in Markdown.  
**Trigger:** Developer pastes Markdown into Boo UI and clicks "generate commits".

**Main Flow:**
1. Developer composes Markdown with issue description and codebase context
2. Developer submits input to Boo UI
3. Boo UI sends request to Claude Opus with fingerprint system prompt
4. Claude Opus returns structured JSON with ordered commits and unified diffs
5. Boo UI renders commit timeline with type badges, file list, and diff viewer
6. Developer reviews each commit by expanding cards
7. Developer approves the plan

**Alternative Flow — Parse Error:**
- 4a. JSON parsing fails → UI displays error message → Developer adjusts input and retries

**Postcondition:** Commit plan is rendered and ready for export or scheduling.

---

## UC-02: Self-Evaluate Commit Plan

**Actor:** Developer  
**Precondition:** UC-01 completed; commits rendered in UI.  
**Trigger:** Developer pastes self-evaluation prompt into the same LLM conversation.

**Main Flow:**
1. Developer copies BLOCK 6 (self-evaluation prompt) from docs
2. Developer pastes into active LLM session (outside Boo UI)
3. Claude Opus scores each fingerprint dimension 0–10
4. Claude Opus calculates weighted score and lists top 3 issues
5. Developer decides: accept score or request targeted regeneration

**Alternative Flow — Low Score:**
- 5a. Score < 7.0 → Developer pastes regeneration prompt (targeted fixes only)
- 5b. Model regenerates only failing commits
- 5c. Developer re-evaluates

**Postcondition:** Commit plan has a quality score ≥ 7.0 before proceeding.

---

## UC-03: Export Commit Plan

**Actor:** Developer  
**Precondition:** UC-01 completed; plan approved.  
**Trigger:** Developer clicks "export .json" or "export .md".

**Main Flow:**
1. Developer selects export format (JSON or Markdown)
2. Boo UI generates file and triggers browser download
3. Developer saves file locally as input to post-processor

**Constraint:** Export is final — no regeneration after export.

**Postcondition:** `boo-commits.json` or `boo-commits.md` saved locally.

---

## UC-04: Distribute Timestamps (Local Review)

**Actor:** Developer  
**Precondition:** `boo-commits.json` exported from UC-03.  
**Trigger:** Developer runs post-processor without `--schedule` flag.

**Main Flow:**
1. Developer runs `ruby post_processor.rb boo-commits.json rafael`
2. Post-processor applies Normal distribution (μ=90min, σ=30min) to deltas
3. Commits anchored in the past — last commit ≤ now
4. Output: `commits_with_timestamps.json`
5. Developer runs `bash apply_commits.sh commits_with_timestamps.json`
6. Git log shows realistic-looking commit history
7. Developer inspects diffs locally and approves plan

**Postcondition:** Branch created locally with full commit history for review.

---

## UC-05: Schedule Deploy

**Actor:** Developer  
**Precondition:** Local review approved (UC-04). Target date and timezone window defined.  
**Trigger:** Developer runs post-processor with `--schedule` flag.

**Main Flow:**
1. Developer identifies target timezone overlap window (e.g., EST 10:00–14:00)
2. Developer selects deploy date: minimum D+1, never same day
3. Developer runs: `ruby post_processor.rb boo-commits.json rafael --schedule "2026-03-10 13:00/17:00 -0300"`
4. Post-processor validates: date is in future, not today
5. Commits redistributed evenly within window with ±5min jitter
6. Output: `commits_scheduled.json`

**Alternative Flow — Invalid Schedule:**
- 4a. Date is today → raises "Never schedule for today" error → Developer picks D+1

**Postcondition:** `commits_scheduled.json` ready for deploy.

---

## UC-06: Deploy Draft PR

**Actor:** OpenClaw / Developer  
**Precondition:** `commits_scheduled.json` prepared (UC-05).  
**Trigger:** Scheduled time reached (cron) or manual execution.

**Main Flow:**
1. `deploy.sh` reads commits from JSON
2. For each commit: applies diff via `git apply --index`, commits with `--date`
3. Pushes branch to GitHub
4. Opens draft PR via `gh pr create --draft`
5. PR description generated from BLOCK 10 prompt

**Postcondition:** Draft PR open on GitHub with authentic commit history and timestamps.

---

## UC-07: Respond to Review

**Actor:** Developer  
**Precondition:** PR has review comments requesting changes.  
**Trigger:** Developer feeds review comments into LLM with BLOCK 9 system prompt.

**Main Flow:**
1. Developer collects review comments (text)
2. Developer sends comments + original PR diff to Claude Opus (BLOCK 9 prompt)
3. Claude Opus generates per-comment inline replies and atomic fix commits
4. Developer reviews replies and fix commits
5. Developer approves and runs fix commits through post-processor (D+1 window)
6. Developer pushes fixes and replies to GitHub

**Alternative Flow — Disagreement:**
- 3a. Developer disagrees with a comment → Claude generates technical rebuttal reply only, no fix commit

**Postcondition:** PR updated with fix commits; review comments replied to in developer's voice.

---

## UC-08: Generate PR Description

**Actor:** Developer  
**Precondition:** Commit plan finalized; issue context available.  
**Trigger:** Developer requests PR description before opening PR.

**Main Flow:**
1. Developer sends issue + commit list to Claude Opus (BLOCK 10 prompt)
2. Claude generates What/Why/How PR body in Rafael's writing voice
3. Developer reviews and saves as `PR_BODY.md`
4. `deploy.sh` reads `PR_BODY.md` when opening PR

**Postcondition:** `PR_BODY.md` ready for deploy step.
