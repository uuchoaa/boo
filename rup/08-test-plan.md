# Boo — Test Plan

**Version:** 1.0  
**Date:** 2026-03-07  
**Status:** Draft  

---

## 1. Test Strategy

Boo's primary quality concern is **fingerprint fidelity** — the degree to which generated commits authentically replicate a developer's style. This is not testable with unit tests alone; it requires a benchmark-based evaluation loop.

Three test layers:

1. **Model Benchmark** — LLM output scored against fingerprint rubric (primary)
2. **Pipeline Tests** — post-processor and deploy script behavior (automated)
3. **Smoke Tests** — end-to-end generation → git apply → PR open (manual)

---

## 2. Fingerprint Fidelity Benchmark

### 2.1 Scoring Rubric

| Dimension | Weight | Criteria |
|---|---|---|
| Commit order | 30% | Follows `test → feat → refactor → docs` strictly |
| Granularity | 20% | Atomic commits, 1–2 files, single intention |
| Commit messages | 20% | Conventional format, 5–8 descriptive words |
| Design decisions | 20% | Reuses existing scopes/methods, constants extracted, logic in correct layer |
| Tests | 10% | Written before implementation, covers edge cases |

**Weighted score:** `(order×0.3) + (granularity×0.2) + (messages×0.2) + (design×0.2) + (tests×0.1)`

### 2.2 Benchmark Issues

| Issue ID | Description | Codebase size | Status |
|---|---|---|---|
| #42 | Add "mark as ghosted" to opportunity pipeline | 3 files, ~40 LOC | ✅ Established |
| #67 | Contact timeline & smart follow-up suggestion | 5 files, ~80 LOC | ✅ Established |

### 2.3 Model Benchmark Log

| Model | Profile | Issue | Score | Notes |
|---|---|---|---|---|
| Rafael (human) | Rafael | #42 | 8.5 | Golden sample |
| Claude Opus (after self-eval loop) | Rafael | #67 | 9.5 | Best score to date |
| Claude Sonnet (Modelo A) | Rafael | #42 | 8.0 | scope in wrong place |
| Claude Sonnet (Modelo A) | Jordan | #42 | 9.0 | Best Jordan score |
| Claude (unified prompt) | Rafael | #42 | 7.5 | No-op commit padding |
| Claude (unified prompt) | Jordan | #42 | 6.5 | Tests too early |
| Claude (Modelo C) | Rafael | #42 | 8.5 | `%w[]` interpolation bug |
| Kimi K2 | Rafael | #42 | 6.0 | Wrong layer, order issues |
| Claude (Modelo B) | Rafael | #42 | 5.0 | `where` bug, noise commits |

**Baseline target:** ≥ 8.0 for Rafael profile, ≥ 8.5 for Jordan profile.  
**Regression threshold:** Any model scoring < 7.5 on an established issue triggers prompt review.

### 2.4 Self-Evaluation Quality Assessment

The self-evaluation prompt (BLOCK 6) is itself evaluated on two criteria:

| Criterion | Target |
|---|---|
| Bug detection rate | Detects runtime bugs (nil guards, wrong interfaces) in ≥ 80% of cases |
| Score calibration | Self-reported score within ±1.0 of human-assigned score |

**Observed:** Second self-eval run detected `NoMethodError` bug missed by first run → BLOCK 6 updated with explicit pre-scoring checklist.

---

## 3. Pipeline Tests

### 3.1 post_processor.rb

| Test | Input | Expected Output |
|---|---|---|
| Past mode — Rafael | `commits.json rafael` | Timestamps in past, last ≤ now, intervals Normal(90,30) |
| Past mode — Jordan | `commits.json jordan` | Burst pattern: impl commits 3–8min, tests 60–180min |
| Schedule mode — valid | `--schedule "2026-03-10 13:00/17:00 -0300"` | All timestamps within window, date > today |
| Schedule mode — today | `--schedule "2026-03-07 13:00/17:00 -0300"` | Raises "Never schedule for today" error |
| Schedule mode — past | `--schedule "2026-01-01 13:00/17:00 -0300"` | Raises "Window must be in the future" error |
| Unknown profile | `commits.json unknown` | Raises "Unknown profile" error |
| Malformed JSON | `bad.json rafael` | Raises parse error with filename |
| Jitter bounds | Schedule mode | No timestamp deviates > 5min from even distribution |

### 3.2 deploy.sh

| Test | Scenario | Expected |
|---|---|---|
| Clean apply | Valid diff on clean branch | `git apply --index` succeeds, commit created |
| Timestamp override | Scheduled timestamp in past | `git log --format="%ai"` shows scheduled date |
| Bad diff | Diff with wrong context lines | `git apply` fails, script aborts with non-zero exit |
| PR creation | `gh` authenticated | Draft PR created with correct title and body |
| Idempotency | Re-run on already-committed branch | Script detects nothing to apply, exits cleanly |

---

## 4. Smoke Tests (Manual)

### ST-01: Full Generation Cycle

1. Open Boo UI
2. Paste issue #42 Markdown
3. Click "generate commits"
4. Verify: commit timeline renders with ≥ 5 commits
5. Verify: type badges show test/feat/refactor/docs
6. Verify: cost displayed in USD
7. Expand each commit — verify diff is syntax-highlighted
8. Export `.json` — verify parseable
9. Export `.md` — verify readable

**Pass criteria:** All 9 steps complete without error.

### ST-02: Post-Processor + Git Apply

1. Run `ruby post_processor.rb boo-commits.json rafael`
2. Verify `commits_with_timestamps.json` created
3. Verify timestamps are in the past with plausible intervals
4. Run `bash apply_commits.sh commits_with_timestamps.json` on a test branch
5. Verify `git log` shows correct commit messages and timestamps
6. Run `git diff HEAD~N..HEAD` to verify diff content

**Pass criteria:** All commits applied, log shows natural-looking history.

### ST-03: Schedule + Deploy

1. Run `ruby post_processor.rb boo-commits.json rafael --schedule "FUTURE_DATE 13:00/17:00 -0300"`
2. Verify all timestamps within window
3. Run `bash deploy.sh commits_scheduled.json "feat: test deploy"`
4. Verify draft PR opened on GitHub
5. Verify commit timestamps visible in PR commit list

**Pass criteria:** PR open, timestamps in window, draft status confirmed.

---

## 5. Regression Protocol

When updating BLOCK 1, BLOCK 2, or the Boo UI model:

1. Run benchmark on issue #42 (established baseline)
2. Run benchmark on issue #67 (larger PR)
3. Run self-evaluation prompt on each output
4. Compare scores to benchmark log
5. If score drops > 1.0 point: investigate prompt change, do not merge

**Cadence:** Run on every prompt version bump or model change.
