# Boo — Iteration Plan

**Version:** 1.0  
**Date:** 2026-03-07  
**Status:** Draft  

---

## Release Strategy

Boo follows an incremental release model aligned with the RUP phases. Each iteration produces a working, usable increment — not a partial system.

---

## Iteration 1 — Inception (Core Loop)

**Goal:** Prove that a fingerprint prompt + Claude Opus can produce commit sequences scoring ≥ 8.0/10 on the rubric. Establish baseline.

**Deliverables:**
- BLOCK 1 (Rafael fingerprint system prompt) — v1
- BLOCK 2 (Jordan fingerprint system prompt) — v1
- BLOCK 5 (user prompt template) — v1
- BLOCK 6 (self-evaluation prompt) — v1
- Model benchmark log with ≥ 5 model comparisons
- Scoring rubric defined and validated against human reference (Rafael's own output)

**Acceptance criteria:**
- At least one model scores ≥ 8.0/10 on Rafael profile (issue #42)
- Self-evaluation prompt detects real bugs (nil guard, scope reuse)
- Jordan profile output is qualitatively distinguishable from Rafael profile output

**Status:** ✅ Complete (Opus scored 9.5/10 on issue #67 after self-eval loop)

---

## Iteration 2 — Elaboration (Structured Output + Post-Processor)

**Goal:** Make the pipeline machine-executable. Output becomes JSON; timestamps become real.

**Deliverables:**
- BLOCK 7 (structured JSON output prompt)
- `post_processor.rb` — past mode
- `apply_commits.sh`
- Validated: `git apply --check` passes on generated diffs
- Validated: commit timestamps appear natural in `git log`

**Acceptance criteria:**
- `post_processor.rb rafael` produces valid `commits_with_timestamps.json`
- `apply_commits.sh` applies all commits without error on a clean branch
- `git log --format="%ai %s"` shows believable inter-commit intervals for Rafael profile
- Jordan profile shows burst pattern in log

**Status:** 🔄 In Progress

---

## Iteration 3 — Construction (Deploy + Scheduling)

**Goal:** Full automated deployment. Developer approves → scheduled PR opens without manual intervention.

**Deliverables:**
- `post_processor.rb` — schedule mode (`--schedule` flag)
- `deploy.sh` — git apply + commit + push + gh pr create
- `PR_BODY.md` generation via BLOCK 10
- Schedule validation: rejects today, rejects past dates
- Timezone overlap logic validated against EST, BRT, CET

**Acceptance criteria:**
- `--schedule "2026-03-10 13:00/17:00 -0300"` produces commits within window
- `deploy.sh` opens draft PR with correct author dates
- PR commit history on GitHub shows natural-looking timestamps
- No commits land outside the specified window

**Status:** 📋 Planned

---

## Iteration 4 — Construction (Review Response)

**Goal:** Close the PR lifecycle loop. Boo can respond to reviews in the developer's voice.

**Deliverables:**
- BLOCK 9 (review response system prompt)
- Review response output schema (replies + fix commits JSON)
- Fix commits applied via same deploy pipeline
- Validated: fix commit messages reference specific changes (not "address feedback")

**Acceptance criteria:**
- Given 3 review comments: generates 3 separate replies + ≤3 fix commits
- Rebuttal path: generates reply only, no fix commit
- Fix commits score ≥ 7.5/10 on rubric
- Writing voice matches Rafael fingerprint (no emoji, terse, technical)

**Status:** 📋 Planned

---

## Iteration 5 — Transition (OpenClaw Integration)

**Goal:** Run the full pipeline as an OpenClaw Skill — natural language trigger to deployed PR.

**Deliverables:**
- `SKILL.md` for Boo in OpenClaw format
- Heartbeat: monitors GitHub for new issues assigned to developer
- Full workflow: issue detected → generation → developer approval gate → schedule → deploy
- Developer approval via WhatsApp/Telegram notification

**Acceptance criteria:**
- OpenClaw Skill triggers generation on new GitHub issue
- Developer receives notification with commit plan summary
- After approval: schedule and deploy execute without developer intervention
- Full cycle time (issue → draft PR): < 5 minutes excluding developer review

**Status:** 📋 Planned

---

## Iteration 6 — Transition (Fingerprint Learning)

**Goal:** Replace hand-crafted fingerprint profiles with auto-generated profiles from real git history.

**Deliverables:**
- `fingerprint_extractor.rb` — ingests `git log` + `git show` for a developer
- Extracts: commit density, delta_time distribution, test_ratio, message patterns
- Auto-generates BLOCK 1 system prompt from extracted profile
- Validates: auto-generated profile scores ≥ 7.5/10 vs hand-crafted baseline

**Acceptance criteria:**
- Given 50+ commits from any developer, generates a profile in < 30 seconds
- Auto-generated Rafael profile scores within 1.0 point of hand-crafted profile on benchmark
- Profile is human-readable and editable Markdown

**Status:** 📋 Planned

---

## Milestone Summary

| Iteration | Theme | Status | Key Metric |
|---|---|---|---|
| 1 | Fingerprint + benchmark | ✅ Done | Opus 9.5/10 on issue #67 |
| 2 | Structured output + git apply | 🔄 In progress | 100% `git apply --check` pass |
| 3 | Deploy + scheduling | 📋 Planned | Commits within timezone window |
| 4 | Review response | 📋 Planned | Fix commits ≥ 7.5/10 |
| 5 | OpenClaw integration | 📋 Planned | End-to-end < 5min |
| 6 | Fingerprint learning | 📋 Planned | Auto-profile within 1.0pt of hand-crafted |
