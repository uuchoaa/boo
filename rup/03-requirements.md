# Boo — Requirements

**Version:** 1.0  
**Date:** 2026-03-07  
**Status:** Draft  

---

## Functional Requirements

### Input & Generation

| ID | Requirement | Priority |
|---|---|---|
| RF-01 | The system shall accept a Markdown document containing an issue description and codebase context as input | High |
| RF-02 | The system shall send the input to Claude Opus with the developer's fingerprint encoded in the system prompt | High |
| RF-03 | The system shall request structured JSON output matching the commit schema (order, message, files, diff) | High |
| RF-04 | The system shall parse and validate the JSON response before rendering | High |
| RF-05 | The system shall display a parse error and allow retry if the JSON is malformed | Medium |
| RF-06 | The system shall not allow regeneration after a plan has been exported | High |

### Commit Visualization

| ID | Requirement | Priority |
|---|---|---|
| RF-07 | The system shall render commits as an expandable timeline ordered by commit sequence | High |
| RF-08 | Each commit card shall display: order number, type badge, message, file count | High |
| RF-09 | Expanding a commit card shall reveal the list of touched files and the full unified diff | High |
| RF-10 | Diff lines shall be syntax-highlighted: green for additions, red for deletions, blue for hunks | Medium |
| RF-11 | The system shall display a type breakdown summary (test, feat, refactor, docs, fix counts) | Medium |

### Cost Tracking

| ID | Requirement | Priority |
|---|---|---|
| RF-12 | The system shall display input and output token counts from the API response | High |
| RF-13 | The system shall calculate and display the estimated cost in USD using Opus pricing ($15/MTk input, $75/MTk output) | High |
| RF-14 | Cost shall be displayed in the sidebar and in the header after generation | Medium |

### Export

| ID | Requirement | Priority |
|---|---|---|
| RF-15 | The system shall export the commit plan as a `.json` file consumable by the post-processor | High |
| RF-16 | The system shall export the commit plan as a `.md` file with formatted diffs | High |
| RF-17 | Exported JSON shall include commits array and usage metadata | Medium |
| RF-18 | Exported Markdown shall include cost summary as a footer note | Low |

### Timestamp Post-Processor

| ID | Requirement | Priority |
|---|---|---|
| RF-19 | The post-processor shall accept a profile key (rafael, jordan) as a CLI argument | High |
| RF-20 | Without `--schedule`: the post-processor shall anchor timestamps in the past, with the last commit ≤ current time | High |
| RF-21 | With `--schedule`: the post-processor shall distribute commits within the specified future time window | High |
| RF-22 | The post-processor shall reject schedule dates that fall on the current calendar day | High |
| RF-23 | The post-processor shall reject schedule dates in the past | High |
| RF-24 | The post-processor shall apply ±5 minute jitter to scheduled commit times | Medium |
| RF-25 | Rafael profile shall use Normal distribution (μ=90min, σ=30min, min=20min) for inter-commit deltas | High |
| RF-26 | Jordan profile shall use message-aware gaps: tests=60–180min, cleanup=2–5min, ok-now=1–3min, else=3–8min | High |

### Git & Deploy

| ID | Requirement | Priority |
|---|---|---|
| RF-27 | The deploy script shall apply each diff via `git apply --index` | High |
| RF-28 | The deploy script shall commit each diff with `GIT_AUTHOR_DATE` and `GIT_COMMITTER_DATE` set to the scheduled timestamp | High |
| RF-29 | The deploy script shall push the branch and open a GitHub draft PR via `gh pr create --draft` | High |
| RF-30 | The deploy script shall use `PR_BODY.md` as the PR description if present | Medium |

### Review Response

| ID | Requirement | Priority |
|---|---|---|
| RF-31 | The system shall generate per-comment inline replies in the developer's writing voice | High |
| RF-32 | Fix commits generated from review feedback shall be atomic — one commit per addressed comment | High |
| RF-33 | Fix commits shall not use "address review feedback" as a message — each message shall reference the specific change | High |
| RF-34 | When the developer disagrees with a comment, the system shall generate a technical rebuttal reply only, with no corresponding fix commit | Medium |

### Self-Evaluation

| ID | Requirement | Priority |
|---|---|---|
| RF-35 | The self-evaluation prompt shall instruct the model to re-read all diffs before scoring | High |
| RF-36 | The self-evaluation shall score 5 dimensions: commit order (30%), granularity (20%), messages (20%), design (20%), tests (10%) | High |
| RF-37 | The self-evaluation shall produce a weighted numeric score out of 10 | High |
| RF-38 | The self-evaluation shall list the top 3 issues and top 2 strengths | Medium |

---

## Non-Functional Requirements

### Performance

| ID | Requirement |
|---|---|
| RNF-01 | API response time for commit generation shall be ≤ 60 seconds for issues with up to 500 lines of codebase context |
| RNF-02 | Post-processor execution shall complete in < 1 second for plans with up to 20 commits |
| RNF-03 | UI shall render commit timeline within 200ms of receiving API response |

### Security & Privacy

| ID | Requirement |
|---|---|
| RNF-04 | No code, diffs, or codebase context shall be stored outside the local machine |
| RNF-05 | API key shall never be embedded in exported files |
| RNF-06 | All git operations shall be local until explicit push in deploy step |

### Reliability

| ID | Requirement |
|---|---|
| RNF-07 | The system shall validate `git apply --check` before applying any diff; failed diffs shall abort the deploy |
| RNF-08 | The post-processor shall validate JSON schema before writing output files |
| RNF-09 | The deploy script shall be idempotent — re-running shall not create duplicate commits |

### Usability

| ID | Requirement |
|---|---|
| RNF-10 | The UI shall require no configuration beyond pasting Markdown input |
| RNF-11 | The post-processor shall be runnable as a single CLI command with no dependency installation beyond Ruby stdlib |
| RNF-12 | All exported files shall be human-readable without tooling |

### Fingerprint Fidelity

| ID | Requirement |
|---|---|
| RNF-13 | Generated commit sequences shall score ≥ 8.0/10 on the benchmark rubric for the Rafael profile |
| RNF-14 | Generated commit sequences shall score ≥ 8.5/10 on the benchmark rubric for the Jordan profile |
| RNF-15 | The system shall maintain a model benchmark log to track regression across model versions |

### Maintainability

| ID | Requirement |
|---|---|
| RNF-16 | Fingerprint profiles shall be defined in a single configuration block in the post-processor |
| RNF-17 | Adding a new developer profile shall require changes only to the PROFILES constant |
| RNF-18 | System prompt blocks shall be versioned in the prompt simulation document |
