# Boo — Domain Model

**Version:** 1.0  
**Date:** 2026-03-07  
**Status:** Draft  

---

## Core Entities

### DeveloperProfile

Encodes a developer's identity across code and writing dimensions.

```
DeveloperProfile
├── id: String                        # e.g. "rafael_uchoa"
├── display_name: String
├── code_fingerprint: CodeFingerprint
└── writing_fingerprint: WritingFingerprint
```

### CodeFingerprint

```
CodeFingerprint
├── commit_density: Range             # e.g. 6..10 commits per feature
├── commit_size: Enum                 # :atomic | :fat
├── files_per_commit: Range           # e.g. 1..2
├── test_ratio: Float                 # 0.0–1.0 (fraction of commits touching specs)
├── commit_order: Array<CommitType>   # e.g. [:test, :feat, :refactor, :docs]
├── refactor_frequency: Enum          # :dedicated | :inline | :never
├── docs_discipline: Enum             # :always | :pressured | :never
├── magic_numbers: Enum               # :extracted | :hardcoded
├── message_style: Enum               # :conventional | :informal
├── message_length: Range             # words after type prefix
├── comment_style: Enum               # :none | :casual_pt | :yard
├── wip_tolerance: Enum               # :never | :sometimes | :always
├── fix_after_feat_ratio: Float       # 0.0–1.0
├── delta_distribution: Distribution  # Normal or Burst
└── session_pattern: Enum             # :steady | :burst
```

### WritingFingerprint

```
WritingFingerprint
├── comment_length: Enum              # :terse | :verbose
├── emoji_usage: Enum                 # :never | :rare | :frequent
├── review_response_style: Enum       # :point_by_point | :one_liner | :defensive
├── pushback_style: Enum              # :technical | :passive | :assertive
├── acknowledgment: Enum              # :silent | :minimal | :effusive
├── pr_description_style: Enum        # :what_why_how | :one_liner | :none
└── sign_off: Enum                    # :none | :casual | :formal
```

### Distribution

```
Distribution
├── type: Enum                        # :normal | :burst
├── mean_minutes: Integer             # for Normal
├── std_minutes: Integer              # for Normal
├── min_minutes: Integer              # floor
└── message_overrides: Hash           # for Burst: regex → minutes range
```

---

### Issue

The input unit of work.

```
Issue
├── id: String                        # e.g. "#42"
├── title: String
├── body: String                      # Markdown description
└── codebase_context: Array<CodeFile>
```

### CodeFile

```
CodeFile
├── path: String                      # e.g. "app/models/opportunity.rb"
└── content: String                   # raw source
```

---

### CommitPlan

The output of a generation cycle. Immutable after export.

```
CommitPlan
├── id: UUID
├── issue: Issue
├── profile: DeveloperProfile
├── commits: Array<Commit>            # ordered
├── usage: ApiUsage
├── score: Float?                     # set after self-evaluation
├── exported_at: DateTime?
└── status: Enum                      # :draft | :evaluated | :exported | :scheduled | :deployed
```

### Commit

```
Commit
├── order: Integer                    # 1-based
├── message: String                   # full conventional commit message
├── type: CommitType                  # :test | :feat | :refactor | :fix | :docs | :ops | :misc
├── files: Array<String>              # paths touched
├── diff: String                      # unified diff
└── timestamp: DateTime?              # set by post-processor
```

### CommitType
`test | feat | refactor | fix | docs | ops | chore | misc`

---

### ApiUsage

```
ApiUsage
├── input_tokens: Integer
├── output_tokens: Integer
└── estimated_cost_usd: Float         # computed: (in × $15 + out × $75) / 1_000_000
```

---

### ScheduleWindow

```
ScheduleWindow
├── date: Date                        # must be > today
├── start_time: Time
├── end_time: Time
└── timezone: String                  # IANA tz or UTC offset
```

---

### ReviewCycle

Generated in response to PR review comments.

```
ReviewCycle
├── pr_url: String
├── original_plan: CommitPlan
├── review_comments: Array<ReviewComment>
├── replies: Array<ReviewReply>
└── fix_commits: Array<Commit>
```

### ReviewComment

```
ReviewComment
├── id: String
├── body: String
├── file: String?
├── line: Integer?
└── resolution: Enum                  # :fix | :rebuttal | :pending
```

### ReviewReply

```
ReviewReply
├── comment_id: String
├── body: String                      # in developer's writing voice
└── has_fix_commit: Boolean
```

---

## Key Relationships

```
DeveloperProfile ──has──> CodeFingerprint
DeveloperProfile ──has──> WritingFingerprint
CodeFingerprint  ──has──> Distribution

Issue            ──has──> Array<CodeFile>
CommitPlan       ──for──> Issue
CommitPlan       ──uses──> DeveloperProfile
CommitPlan       ──contains──> Array<Commit>
CommitPlan       ──tracks──> ApiUsage

Commit           ──typed-by──> CommitType

ReviewCycle      ──references──> CommitPlan
ReviewCycle      ──contains──> Array<ReviewComment>
ReviewCycle      ──generates──> Array<ReviewReply>
ReviewCycle      ──generates──> Array<Commit>      # fix commits
```

---

## State Machine: CommitPlan

```
:draft
  → [generation succeeds]    → :draft (renders in UI)
  → [self-eval runs]         → :evaluated
  → [export triggered]       → :exported  (immutable after this point)
  → [schedule applied]       → :scheduled
  → [deploy.sh runs]         → :deployed
```

---

## Invariants

1. A `CommitPlan` in `:exported` or later state cannot be regenerated
2. A `ScheduleWindow.date` must be strictly greater than `Date.today`
3. `Commit.order` values within a plan are unique and contiguous starting from 1
4. `ApiUsage.estimated_cost_usd = (input_tokens × 0.000015) + (output_tokens × 0.000075)`
5. A `ReviewReply` with `has_fix_commit: false` implies `ReviewComment.resolution = :rebuttal`
