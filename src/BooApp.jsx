import Groq from "groq-sdk";
import { useState, useRef, useEffect } from "react";

const PROVIDERS = {
  anthropic: {
    id: "anthropic",
    label: "Anthropic",
    apiUrl: "https://api.anthropic.com/v1/messages",
    models: {
      opus46: {
        key: "opus46",
        label: "Claude Opus 4.6",
        modelId: "claude-4.6-opus",
        pricing: { inputPerMTok: 15, outputPerMTok: 75 },
      },
      sonnet46: {
        key: "sonnet46",
        label: "Claude Sonnet 4.6",
        modelId: "claude-4.6-sonnet",
        pricing: { inputPerMTok: 5, outputPerMTok: 25 },
      },
    },
  },
  groq: {
    id: "groq",
    label: "Groq",
    models: {
      compoundMini: {
        key: "compoundMini",
        label: "Groq Compound Mini",
        modelId: "groq/compound-mini",
        pricing: null,
      },
      compound: {
        key: "compound",
        label: "Groq Compound",
        modelId: "groq/compound",
        pricing: null,
      },
    },
  },
  mock: {
    id: "mock",
    label: "Mock",
    models: {
      mock: {
        key: "mock",
        label: "Mock",
        modelId: "mock/mock",
        pricing: null,
      },
    },
  },
};

const MOCK_COMMITS = [
  {
    order: 1,
    message: "test: add spec for Opportunity GHOSTED status and 7-day stale flag",
    files: ["spec/models/opportunity_spec.rb", "spec/services/daily_briefing_spec.rb"],
    diff: "diff --git a/spec/models/opportunity_spec.rb b/spec/models/opportunity_spec.rb\\nindex 0000000..abc1234 100644\\n--- /dev/null\\n+++ b/spec/models/opportunity_spec.rb\\n@@ -0,0 +1,18 @@\\n+require 'rails_helper'\\n+\\n+RSpec.describe Opportunity do\\n+  describe 'validations' do\\n+    it 'allows ghosted status' do\\n+      expect(build(:opportunity, status: 'ghosted')).to be_valid\\n+    end\\n+  end\\n+\\n+  describe '.ghosted_stale' do\\n+    it 'returns opportunities ghosted for more than 7 days' do\\n+      stale  = create(:opportunity, status: 'ghosted', updated_at: 8.days.ago)\\n+      recent = create(:opportunity, status: 'ghosted', updated_at: 3.days.ago)\\n+      expect(Opportunity.ghosted_stale).to     include(stale)\\n+      expect(Opportunity.ghosted_stale).not_to include(recent)\\n+    end\\n+  end\\n+end",
    issues: [],
  },
  {
    order: 2,
    message: "feat: add GHOSTED to Opportunity statuses with ghosted_stale scope",
    files: ["app/models/opportunity.rb"],
    diff: "diff --git a/app/models/opportunity.rb b/app/models/opportunity.rb\\nindex def0001..def0002 100644\\n--- a/app/models/opportunity.rb\\n+++ b/app/models/opportunity.rb\\n@@ -1,7 +1,10 @@\\n class Opportunity < ApplicationRecord\\n-  STATUSES = %w[prospect applied screening interview offer rejected closed].freeze\\n+  STATUSES = %w[prospect applied screening interview offer rejected closed ghosted].freeze\\n+  GHOSTED_STALE_DAYS = 7\\n+\\n   belongs_to :contact, optional: true\\n   validates :company, :role, presence: true\\n   validates :status, inclusion: { in: STATUSES }\\n-  scope :active, -> { where.not(status: %w[rejected closed]) }\\n+  scope :active,        -> { where.not(status: %w[rejected closed ghosted]) }\\n+  scope :ghosted_stale, -> { where(status: 'ghosted').where('updated_at < ?', GHOSTED_STALE_DAYS.days.ago) }\\n end",
    issues: [
      "No data migration: existing records with status in %w[rejected closed] won't have ghosted — but records already marked ghosted before this deploy will fail the updated :active scope silently",
      "ghosted_stale scope calls GHOSTED_STALE_DAYS.days.ago at query time (correct), but GHOSTED_STALE_DAYS is an Integer — ensure ActiveSupport is loaded before this constant is referenced in tests",
    ],
  },
  {
    order: 3,
    message: "feat: expose ghosted key in DailyBriefing",
    files: ["app/services/daily_briefing.rb"],
    diff: "diff --git a/app/services/daily_briefing.rb b/app/services/daily_briefing.rb\\nindex aaa0001..aaa0002 100644\\n--- a/app/services/daily_briefing.rb\\n+++ b/app/services/daily_briefing.rb\\n@@ -2,7 +2,8 @@ class DailyBriefing\\n   def call\\n     stale    = Opportunity.active.where('updated_at < ?', 5.days.ago)\\n     upcoming = Opportunity.where(status: %w[screening interview])\\n-    { stale: stale, upcoming: upcoming }\\n+    ghosted  = Opportunity.ghosted_stale\\n+    { stale: stale, upcoming: upcoming, ghosted: ghosted }\\n   end\\n end",
    issues: [],
  },
  {
    order: 4,
    message: "docs: document GHOSTED status and daily briefing ghosted key",
    files: ["docs/opportunity_statuses.md"],
    diff: "diff --git a/docs/opportunity_statuses.md b/docs/opportunity_statuses.md\\nnew file mode 100644\\nindex 0000000..bbb0001\\n--- /dev/null\\n+++ b/docs/opportunity_statuses.md\\n@@ -0,0 +1,9 @@\\n+# Opportunity Statuses\\n+\\n+| Status  | Description                                 |\\n+|---------|---------------------------------------------|\\n+| ghosted | Recruiter went silent; set manually by user |\\n+\\n+## Daily Briefing\\n+\\n+- `ghosted`: opportunities in GHOSTED status for more than 7 days (`Opportunity.ghosted_stale`).",
    issues: [],
  },
];

function safeGetLocalStorageItem(key) {
  if (typeof window === "undefined") return null;
  try {
    return window.localStorage.getItem(key);
  } catch {
    return null;
  }
}

function safeSetLocalStorageItem(key, value) {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(key, value);
  } catch {
    // ignore
  }
}

const SYSTEM = `You are Boo, a ghost developer mimicking Rafael Uchôa's commit style.

Rules:
- Conventional commits only: feat | refactor | test | ops | docs
- Order is always: test → feat → refactor → docs
- Each commit has exactly one intention — never mix concerns
- Refactors are small, frequent, and always in dedicated commits
- Tests come before features, never after
- Magic numbers extracted into named constants
- No inline comments — code is self-documenting
- Docs always close the sequence

Before generating any commit:
1. Re-read all codebase context
2. Identify all existing scopes, methods, and constants
3. Reuse them — never duplicate query logic that already exists
4. Check for runtime errors: nil guards, missing interfaces, wrong method signatures

Return ONLY a valid JSON object — no markdown, no preamble, no backticks.

Schema:
{
  "commits": [
    {
      "order": 1,
      "message": "test: add spec for ...",
      "files": ["spec/..."],
      "diff": "diff --git a/...(full unified diff, newlines as \\n)"
    }
  ]
}`;

const REVIEW_SYSTEM = `You are a senior developer reviewing generated git diffs for correctness.

For each commit, identify concrete issues in the diff:
- Nil/null dereferences or missing guards
- Wrong method signatures or missing arguments
- Logic errors (wrong conditions, off-by-one, incorrect operators)
- Missing validations or edge case handling

Be terse. Only flag real issues — empty arrays are valid and expected.
Return ONLY valid JSON — no markdown, no preamble, no backticks.

Schema:
{
  "reviews": [
    { "order": 1, "issues": ["concise description of issue"] }
  ]
}`;

const PLACEHOLDER = `## Issue
**#42 — Add "mark as ghosted" to opportunity pipeline**
When a recruiter stops responding, the user should be able to mark an
opportunity as GHOSTED. Opportunities ghosted for more than 7 days should
be flagged in the daily briefing under a dedicated key.

## Codebase context

### app/models/opportunity.rb
\`\`\`ruby
class Opportunity < ApplicationRecord
  STATUSES = %w[prospect applied screening interview offer rejected closed].freeze
  belongs_to :contact, optional: true
  validates :company, :role, presence: true
  validates :status, inclusion: { in: STATUSES }
  scope :active, -> { where.not(status: %w[rejected closed]) }
end
\`\`\`

### app/services/daily_briefing.rb
\`\`\`ruby
class DailyBriefing
  def call
    stale = Opportunity.active.where('updated_at < ?', 5.days.ago)
    upcoming = Opportunity.where(status: %w[screening interview])
    { stale: stale, upcoming: upcoming }
  end
end
\`\`\``;

function typeLabel(msg) {
  const m = msg.match(/^(feat|test|refactor|fix|docs|ops|chore):/);
  return m ? m[1] : "misc";
}

const TYPE_COLORS = {
  test: { bg: "#0d2010", border: "#1a5c28", text: "#4ade80" },
  feat: { bg: "#0d1a30", border: "#1a3a7a", text: "#60a5fa" },
  refactor: { bg: "#1a1a0d", border: "#4a4010", text: "#facc15" },
  docs: { bg: "#1a0d1a", border: "#4a1a4a", text: "#c084fc" },
  fix: { bg: "#1a0d0d", border: "#5a1a1a", text: "#f87171" },
  ops: { bg: "#0d1a1a", border: "#1a4a4a", text: "#22d3ee" },
  misc: { bg: "#111", border: "#333", text: "#888" },
};

function CommitCard({ commit, index, total }) {
  const [expanded, setExpanded] = useState(false);
  const type = typeLabel(commit.message);
  const colors = TYPE_COLORS[type] || TYPE_COLORS.misc;
  const isLast = index === total - 1;

  return (
    <div
      style={{
        display: "flex",
        gap: "0",
        position: "relative",
      }}
    >
      {/* Timeline spine */}
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          width: "32px",
          flexShrink: 0,
        }}
      >
        <div
          style={{
            width: "10px",
            height: "10px",
            borderRadius: "50%",
            background: colors.text,
            flexShrink: 0,
            marginTop: "14px",
            boxShadow: `0 0 8px ${colors.text}55`,
          }}
        />
        {!isLast && (
          <div
            style={{
              width: "1px",
              flex: 1,
              background: "#1e1e1e",
              marginTop: "4px",
            }}
          />
        )}
      </div>

      {/* Card */}
      <div
        style={{
          flex: 1,
          marginBottom: isLast ? 0 : "8px",
          border: `1px solid ${expanded ? colors.border : "#1e1e1e"}`,
          borderRadius: "8px",
          overflow: "hidden",
          transition: "border-color 0.15s",
          background: expanded ? colors.bg : "#0d0d0d",
        }}
      >
        <button
          onClick={() => setExpanded((e) => !e)}
          style={{
            width: "100%",
            background: "none",
            border: "none",
            cursor: "pointer",
            padding: "10px 14px",
            display: "flex",
            alignItems: "center",
            gap: "10px",
            textAlign: "left",
          }}
        >
          {/* Order */}
          <span
            style={{
              fontSize: "11px",
              color: "#555",
              fontFamily: "monospace",
              width: "18px",
              flexShrink: 0,
            }}
          >
            {String(commit.order).padStart(2, "0")}
          </span>

          {/* Type badge */}
          <span
            style={{
              fontSize: "11px",
              padding: "2px 7px",
              borderRadius: "3px",
              background: colors.bg,
              border: `1px solid ${colors.border}`,
              color: colors.text,
              fontFamily: "monospace",
              flexShrink: 0,
              letterSpacing: "0.05em",
            }}
          >
            {type}
          </span>

          {/* Message */}
          <span
            style={{
              fontSize: "13px",
              color: "#d8dfe8",
              fontFamily: "monospace",
              flex: 1,
              overflow: "hidden",
              textOverflow: "ellipsis",
              whiteSpace: "nowrap",
            }}
          >
            {commit.message.replace(
              /^(feat|test|refactor|fix|docs|ops|chore):\s*/,
              "",
            )}
          </span>

          {/* Files count */}
          <span
            style={{
              fontSize: "11px",
              color: "#555",
              fontFamily: "monospace",
              flexShrink: 0,
            }}
          >
            {commit.files?.length || 0} files
          </span>

          {/* Chevron */}
          <span
            style={{
              color: "#444",
              fontSize: "10px",
              flexShrink: 0,
              transform: expanded ? "rotate(180deg)" : "none",
              transition: "transform 0.15s",
            }}
          >
            ▾
          </span>
        </button>

        {expanded && (
          <div style={{ borderTop: `1px solid ${colors.border}` }}>
            {/* Files */}
            {commit.files?.length > 0 && (
              <div
                style={{
                  padding: "8px 14px",
                  borderBottom: `1px solid ${colors.border}30`,
                }}
              >
                {commit.files.map((f, i) => (
                  <div
                    key={i}
                    style={{
                      fontSize: "12px",
                      color: "#888",
                      fontFamily: "monospace",
                      padding: "2px 0",
                    }}
                  >
                    <span style={{ color: "#555" }}>📄 </span>
                    {f}
                  </div>
                ))}
              </div>
            )}

            {/* Issues */}
            {commit.issues?.length > 0 && (
              <div
                style={{
                  padding: "8px 14px",
                  borderBottom: `1px solid ${colors.border}30`,
                  background: "#1a0e00",
                }}
              >
                {commit.issues.map((issue, i) => (
                  <div
                    key={i}
                    style={{
                      display: "flex",
                      gap: "7px",
                      fontSize: "11px",
                      color: "#f59e0b",
                      fontFamily: "monospace",
                      lineHeight: "1.6",
                      padding: "2px 0",
                    }}
                  >
                    <span style={{ flexShrink: 0 }}>⚠</span>
                    <span>{issue}</span>
                  </div>
                ))}
              </div>
            )}

            {/* Diff */}
            {commit.diff && (
              <div
                style={{
                  margin: 0,
                  fontSize: "12px",
                  lineHeight: "1.6",
                  fontFamily: "monospace",
                  overflowX: "auto",
                  maxHeight: "320px",
                  overflowY: "auto",
                }}
              >
                {commit.diff.split("\\n").map((line, i) => {
                  const isAdded = line.startsWith("+") && !line.startsWith("+++");
                  const isRemoved = line.startsWith("-") && !line.startsWith("---");
                  const isHunk = line.startsWith("@@");
                  const isHeader =
                    line.startsWith("diff ") ||
                    line.startsWith("index ") ||
                    line.startsWith("---") ||
                    line.startsWith("+++");

                  let style = {
                    display: "block",
                    padding: "1px 16px",
                    whiteSpace: "pre",
                    color: "#666",
                  };
                  if (isAdded) {
                    style = { ...style, color: "#aff5b4", background: "#0d2818", borderLeft: "3px solid #238636", paddingLeft: "13px" };
                  } else if (isRemoved) {
                    style = { ...style, color: "#ffa198", background: "#2d0f0f", borderLeft: "3px solid #da3633", paddingLeft: "13px" };
                  } else if (isHunk) {
                    style = { ...style, color: "#79c0ff", background: "#0d1a2e" };
                  } else if (isHeader) {
                    style = { ...style, color: "#555" };
                  } else {
                    style = { ...style, color: "#8b949e" };
                  }

                  return <span key={i} style={style}>{line || " "}</span>;
                })}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

function repairTruncatedJSON(text) {
  const closers = [];
  let inString = false;
  let escaped = false;
  for (let i = 0; i < text.length; i++) {
    const ch = text[i];
    if (escaped) { escaped = false; continue; }
    if (ch === "\\" && inString) { escaped = true; continue; }
    if (ch === '"') { inString = !inString; continue; }
    if (inString) continue;
    if (ch === "{" || ch === "[") closers.push(ch === "{" ? "}" : "]");
    else if (ch === "}" || ch === "]") closers.pop();
  }
  if (!inString && closers.length === 0) return null;
  const base = escaped ? text.slice(0, -1) : text;
  const suffix = (inString ? '"' : "") + closers.reverse().join("");
  try {
    return JSON.parse(base + suffix);
  } catch {
    return null;
  }
}

function normalizeTokens(usage) {
  const inputTokens =
    usage.input_tokens ?? usage.prompt_tokens ?? usage.total_tokens ?? 0;
  const outputTokens =
    usage.output_tokens ??
    usage.completion_tokens ??
    (usage.total_tokens != null
      ? Math.max(usage.total_tokens - inputTokens, 0)
      : 0);
  const hasCost = typeof usage.cost === "number" && !Number.isNaN(usage.cost);
  return { inputTokens, outputTokens, hasCost };
}

function CostBadge({ usage }) {
  if (!usage) return null;
  const { inputTokens, outputTokens, hasCost } = normalizeTokens(usage);
  return (
    <div
      style={{
        display: "flex",
        gap: "16px",
        alignItems: "center",
        fontSize: "12px",
        color: "#777",
        fontFamily: "monospace",
      }}
    >
      <span>↑{inputTokens.toLocaleString()} tkn</span>
      <span>↓{outputTokens.toLocaleString()} tkn</span>
      <span
        style={{
          color: "#e6a817",
          background: "#1a1a0a",
          border: "1px solid #3a3010",
          borderRadius: "4px",
          padding: "2px 8px",
        }}
      >
        {hasCost ? `~$${usage.cost.toFixed(4)}` : "cost N/A"}
      </span>
    </div>
  );
}

export default function BooApp() {
  const [input, setInput] = useState(PLACEHOLDER);
  const [commits, setCommits] = useState(null);
  const [usage, setUsage] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [phase, setPhase] = useState("input"); // input | result
  const textareaRef = useRef(null);
  const [lastDurationMs, setLastDurationMs] = useState(null);

  const [selectedModelKey, setSelectedModelKey] = useState(() => {
    const stored = safeGetLocalStorageItem("boo-selected-model");
    return stored || "mock:mock";
  });

  const [openaiApiKey, setOpenaiApiKey] = useState(() => {
    const stored = safeGetLocalStorageItem("boo-openai-api-key");
    return stored || "";
  });
  const [showOpenAIConfig, setShowOpenAIConfig] = useState(false);

  useEffect(() => {
    safeSetLocalStorageItem("boo-selected-model", selectedModelKey);
  }, [selectedModelKey]);

  const allModels = (() => {
    const models = [];
    Object.entries(PROVIDERS).forEach(([providerId, provider]) => {
      Object.entries(provider.models).forEach(([key, model]) => {
        models.push({
          providerId,
          modelKey: `${providerId}:${key}`,
          label: model.label,
          modelId: model.modelId,
          pricing: model.pricing || null,
        });
      });
    });
    return models;
  })();

  const currentModel =
    allModels.find((m) => m.modelKey === selectedModelKey) ||
    allModels[0] ||
    null;
  const isGroqProvider = currentModel?.providerId === "groq";
  const isMockProvider = currentModel?.providerId === "mock";

  const handleModelChange = (e) => {
    setSelectedModelKey(e.target.value);
  };

  const normalizedUsage = usage ? normalizeTokens(usage) : null;

  const generate = async () => {
    if (!input.trim() || loading) return;
    if (!currentModel) {
      setError("No model configured.");
      return;
    }
    if (isGroqProvider && !isMockProvider) {
      if (!openaiApiKey.trim()) {
        setError("Groq API key is required.");
        return;
      }
    }

    const startedAt =
      typeof performance !== "undefined" && performance.now
        ? performance.now()
        : Date.now();
    setLoading(true);
    setError(null);

    try {
      if (isMockProvider) {
        await new Promise((r) => setTimeout(r, 1800));
        setCommits(MOCK_COMMITS);
        setUsage(null);
        setPhase("result");
        return;
      }

      let data;
      let rawText = "";

      if (isGroqProvider) {
        try {
          const groq = new Groq({
            apiKey: openaiApiKey.trim(),
            dangerouslyAllowBrowser: true,
          });
          data = await groq.chat.completions.create({
            model: currentModel.modelId,
            max_tokens: 8192,
            messages: [
              { role: "system", content: SYSTEM },
              { role: "user", content: input.trim() },
            ],
          });
        } catch (err) {
          const message =
            (err &&
              typeof err === "object" &&
              "message" in err &&
              err.message) ||
            "Groq API error";
          setError(String(message));
          return;
        }

        const choice = data.choices?.[0];
        if (!choice) {
          setError("Empty response from model API");
          return;
        }
        rawText =
          typeof choice.message?.content === "string"
            ? choice.message.content
            : Array.isArray(choice.message?.content)
              ? choice.message.content
                  .map((part) => part.text || part)
                  .join("")
              : "";
      } else {
        const res = await fetch(PROVIDERS.anthropic.apiUrl, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            model: currentModel.modelId,
            max_tokens: 8192,
            system: SYSTEM,
            messages: [{ role: "user", content: input.trim() }],
          }),
        });
        data = await res.json();
        if (data.error) {
          setError(data.error.message);
          return;
        }
        rawText = data.content?.map((b) => b.text || "").join("") || "";
      }

      let clean = rawText.replace(/```json|```/gi, "").trim();
      const firstBrace = clean.indexOf("{");
      const lastBrace = clean.lastIndexOf("}");
      if (firstBrace !== -1 && lastBrace !== -1 && lastBrace > firstBrace) {
        clean = clean.slice(firstBrace, lastBrace + 1);
      }

      let parsed;
      try {
        parsed = JSON.parse(clean);
      } catch {
        const repaired = repairTruncatedJSON(clean);
        if (repaired) {
          parsed = repaired;
        } else {
          setError("Parse error: response was truncated and could not be recovered");
          return;
        }
      }

      // Second pass: review each diff for issues (silent failure — never blocks result)
      let reviewedCommits = parsed.commits || [];
      try {
        const reviewPrompt = JSON.stringify(
          reviewedCommits.map((c) => ({ order: c.order, message: c.message, diff: c.diff })),
        );
        let reviewText = "";
        if (isGroqProvider) {
          const groq = new Groq({ apiKey: openaiApiKey.trim(), dangerouslyAllowBrowser: true });
          const rd = await groq.chat.completions.create({
            model: currentModel.modelId,
            max_tokens: 2048,
            messages: [
              { role: "system", content: REVIEW_SYSTEM },
              { role: "user", content: reviewPrompt },
            ],
          });
          reviewText = rd.choices?.[0]?.message?.content || "";
        } else {
          const res = await fetch(PROVIDERS.anthropic.apiUrl, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              model: currentModel.modelId,
              max_tokens: 2048,
              system: REVIEW_SYSTEM,
              messages: [{ role: "user", content: reviewPrompt }],
            }),
          });
          const rd = await res.json();
          reviewText = rd.content?.map((b) => b.text || "").join("") || "";
        }
        let rc = reviewText.replace(/```json|```/gi, "").trim();
        const rf = rc.indexOf("{"), rl = rc.lastIndexOf("}");
        if (rf !== -1 && rl !== -1) rc = rc.slice(rf, rl + 1);
        const rp = JSON.parse(rc);
        const reviewMap = Object.fromEntries((rp.reviews || []).map((r) => [r.order, r.issues || []]));
        reviewedCommits = reviewedCommits.map((c) => ({ ...c, issues: reviewMap[c.order] ?? [] }));
      } catch {
        // review failed — show commits without issues
      }

      setCommits(reviewedCommits);

      const rawUsage = data.usage || null;
      if (rawUsage) {
        const { inputTokens, outputTokens } = normalizeTokens(rawUsage);

        const baseUsage = {
          ...rawUsage,
          input_tokens: inputTokens,
          output_tokens: outputTokens,
        };

        let cost = null;
        if (currentModel.pricing) {
          const rateIn = currentModel.pricing.inputPerMTok || 0;
          const rateOut = currentModel.pricing.outputPerMTok || 0;
          cost =
            ((inputTokens * rateIn + outputTokens * rateOut) / 1_000_000) || 0;
        }

        setUsage({
          ...baseUsage,
          cost,
          providerId: currentModel.providerId,
          modelKey: currentModel.modelKey,
          modelLabel: currentModel.label,
        });
      } else {
        setUsage(null);
      }

      setPhase("result");
    } catch (e) {
      setError("Parse error: " + e.message);
    } finally {
      const endedAt =
        typeof performance !== "undefined" && performance.now
          ? performance.now()
          : Date.now();
      const duration = Math.max(endedAt - startedAt, 0);
      setLastDurationMs(duration);
      setLoading(false);
    }
  };

  const exportJSON = () => {
    const modelSlug = usage?.modelKey
      ? String(usage.modelKey).replace(/[^a-z0-9]+/gi, "-").toLowerCase()
      : String(currentModel?.modelKey || "unknown").replace(/[^a-z0-9]+/gi, "-").toLowerCase();
    const blob = new Blob([JSON.stringify({ commits, usage }, null, 2)], {
      type: "application/json",
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `boo-commits-${modelSlug}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const exportMarkdown = () => {
    const lines = ["# Boo — Generated Commits\n"];
    commits.forEach((c) => {
      lines.push(`## ${c.order}. ${c.message}\n`);
      if (c.files?.length) {
        lines.push("**Files:** " + c.files.join(", ") + "\n");
      }
      if (c.diff) {
        lines.push("```diff\n" + c.diff.replace(/\\n/g, "\n") + "\n```\n");
      }
    });
    if (usage) {
      const { inputTokens, outputTokens, hasCost } = normalizeTokens(usage);
      const costText = hasCost ? `~$${usage.cost.toFixed(4)}` : "N/A";
      lines.push(
        `---\n_Cost: ${costText} | ${inputTokens} in / ${outputTokens} out tokens_`,
      );
    }
    const modelSlug = usage?.modelKey
      ? String(usage.modelKey).replace(/[^a-z0-9]+/gi, "-").toLowerCase()
      : String(currentModel?.modelKey || "unknown").replace(/[^a-z0-9]+/gi, "-").toLowerCase();
    const blob = new Blob([lines.join("\n")], { type: "text/markdown" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `boo-commits-${modelSlug}.md`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const typeStats = commits
    ? commits.reduce((acc, c) => {
        const t = typeLabel(c.message);
        acc[t] = (acc[t] || 0) + 1;
        return acc;
      }, {})
    : {};

  return (
    <div
      style={{
        minHeight: "100vh",
        background: "#080808",
        fontFamily: "'JetBrains Mono', 'Fira Code', 'Cascadia Code', monospace",
        color: "#e6edf3",
        display: "flex",
        flexDirection: "column",
      }}
    >
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=JetBrains+Mono:wght@400;500;600&display=swap');
        * { box-sizing: border-box; }
        ::-webkit-scrollbar { width: 5px; height: 5px; }
        ::-webkit-scrollbar-track { background: #080808; }
        ::-webkit-scrollbar-thumb { background: #222; border-radius: 3px; }
        textarea { outline: none; }
        button { outline: none; }
      `}</style>

      {/* Header */}
      <div
        style={{
          borderBottom: "1px solid #151515",
          padding: "12px 20px",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          background: "#0a0a0a",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
          <span
            style={{
              fontSize: "14px",
              fontWeight: 600,
              letterSpacing: "0.1em",
              color: "#e6a817",
            }}
          >
            boo
          </span>
          <span style={{ color: "#333", fontSize: "12px" }}>/</span>
          <span style={{ fontSize: "11px", color: "#666" }}>ghost dev</span>
        </div>

        {phase === "result" && (
          <div style={{ display: "flex", gap: "8px", alignItems: "center" }}>
            <CostBadge usage={usage} />
            {lastDurationMs != null && (
              <span
                style={{
                  fontSize: "11px",
                  color: "#666",
                  fontFamily: "monospace",
                }}
              >
                {`~${(lastDurationMs / 1000).toFixed(2)}s`}
              </span>
            )}
            <button
              onClick={exportMarkdown}
              style={{
                background: "none",
                border: "1px solid #222",
                borderRadius: "5px",
                color: "#666",
                cursor: "pointer",
                padding: "4px 10px",
                fontSize: "11px",
                transition: "all 0.15s",
              }}
              onMouseEnter={(e) => {
                e.target.style.borderColor = "#e6a817";
                e.target.style.color = "#e6a817";
              }}
              onMouseLeave={(e) => {
                e.target.style.borderColor = "#222";
                e.target.style.color = "#666";
              }}
            >
              export .md
            </button>
            <button
              onClick={exportJSON}
              style={{
                background: "none",
                border: "1px solid #222",
                borderRadius: "5px",
                color: "#666",
                cursor: "pointer",
                padding: "4px 10px",
                fontSize: "11px",
                transition: "all 0.15s",
              }}
              onMouseEnter={(e) => {
                e.target.style.borderColor = "#e6a817";
                e.target.style.color = "#e6a817";
              }}
              onMouseLeave={(e) => {
                e.target.style.borderColor = "#222";
                e.target.style.color = "#666";
              }}
            >
              export .json
            </button>
            <button
              onClick={() => {
                setPhase("input");
                setCommits(null);
                setUsage(null);
              }}
              style={{
                background: "none",
                border: "1px solid #222",
                borderRadius: "5px",
                color: "#666",
                cursor: "pointer",
                padding: "4px 10px",
                fontSize: "11px",
                transition: "all 0.15s",
              }}
              onMouseEnter={(e) => {
                e.target.style.borderColor = "#555";
                e.target.style.color = "#aaa";
              }}
              onMouseLeave={(e) => {
                e.target.style.borderColor = "#222";
                e.target.style.color = "#666";
              }}
            >
              ← new
            </button>
          </div>
        )}
      </div>

      {/* Main */}
      <div style={{ flex: 1, display: "flex", overflow: "hidden" }}>
        {/* INPUT PHASE */}
        {phase === "input" && (
          <div
            style={{
              flex: 1,
              display: "flex",
              flexDirection: "column",
              padding: "24px",
              maxWidth: "800px",
              margin: "0 auto",
              width: "100%",
            }}
          >
            <div
              style={{
                marginBottom: "12px",
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                gap: "12px",
              }}
            >
              <div>
                <span
                  style={{
                    fontSize: "11px",
                    color: "#666",
                    letterSpacing: "0.08em",
                    textTransform: "uppercase",
                  }}
                >
                  issue + codebase context
                </span>
                <span
                  style={{
                    marginLeft: "8px",
                    fontSize: "10px",
                    color: "#555",
                  }}
                >
                  markdown
                </span>
                <span
                  style={{
                    marginLeft: "12px",
                    fontSize: "10px",
                    color: "#444",
                    fontFamily: "monospace",
                  }}
                >
                  ~{Math.round(input.length / 4).toLocaleString()} tkn
                </span>
              </div>

              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "8px",
                  fontSize: "11px",
                  color: "#666",
                }}
              >
                <span
                  style={{
                    textTransform: "uppercase",
                    letterSpacing: "0.08em",
                  }}
                >
                  model
                </span>
                <select
                  value={currentModel ? selectedModelKey : ""}
                  onChange={handleModelChange}
                  style={{
                    background: "#0d0d0d",
                    border: "1px solid #252525",
                    borderRadius: "4px",
                    color: "#d8dfe8",
                    fontSize: "12px",
                    padding: "4px 8px",
                    fontFamily: "monospace",
                  }}
                >
                  {allModels.length === 0 && (
                    <option value="">no models configured</option>
                  )}
                  {allModels.map((m) => (
                    <option key={m.modelKey} value={m.modelKey}>
                      {m.label}
                    </option>
                  ))}
                </select>
                <button
                  type="button"
                  onClick={() => setShowOpenAIConfig((v) => !v)}
                  style={{
                    background: "none",
                    border: "1px solid #252525",
                    borderRadius: "4px",
                    color: "#666",
                    cursor: "pointer",
                    padding: "3px 8px",
                    fontSize: "11px",
                    fontFamily: "monospace",
                  }}
                >
                  openai-compatible
                  <span style={{ marginLeft: 4 }}>
                    {showOpenAIConfig ? "▴" : "▾"}
                  </span>
                </button>
              </div>
            </div>

            {showOpenAIConfig && (
              <div
                style={{
                  marginBottom: "12px",
                  padding: "10px 12px",
                  borderRadius: "6px",
                  border: "1px solid #1a1a1a",
                  background: "#050505",
                }}
              >
                <div
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                    marginBottom: "8px",
                  }}
                >
                  <span
                    style={{
                      fontSize: "11px",
                      color: "#666",
                      letterSpacing: "0.08em",
                      textTransform: "uppercase",
                    }}
                  >
                    groq api key
                  </span>
                </div>

                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: "8px",
                  }}
                >
                  <input
                    type="password"
                    value={openaiApiKey}
                    onChange={(e) => {
                      const next = e.target.value;
                      setOpenaiApiKey(next);
                      safeSetLocalStorageItem("boo-openai-api-key", next);
                    }}
                    style={{
                      background: "#0d0d0d",
                      border: "1px solid #1a1a1a",
                      borderRadius: "4px",
                      color: "#c9d1d9",
                      fontSize: "11px",
                      padding: "4px 8px",
                      fontFamily: "monospace",
                      flex: 1,
                    }}
                  />
                </div>
              </div>
            )}

            <textarea
              ref={textareaRef}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder={PLACEHOLDER}
              style={{
                flex: 1,
                minHeight: "420px",
                background: "#0f0f0f",
                border: "1px solid #222",
                borderRadius: "8px",
                padding: "20px",
                color: "#dbe3ec",
                fontSize: "14px",
                lineHeight: "1.8",
                fontFamily: "monospace",
                resize: "none",
                transition: "border-color 0.15s",
              }}
              onFocus={(e) => (e.target.style.borderColor = "#333")}
              onBlur={(e) => (e.target.style.borderColor = "#222")}
            />

            {error && (
              <div
                style={{
                  marginTop: "12px",
                  padding: "10px 14px",
                  background: "#1a0808",
                  border: "1px solid #5a1515",
                  borderRadius: "6px",
                  color: "#f87171",
                  fontSize: "11px",
                }}
              >
                ⚠ {error}
              </div>
            )}

            <div
              style={{
                marginTop: "16px",
                display: "flex",
                justifyContent: "flex-end",
              }}
            >
              <button
                onClick={generate}
                disabled={!input.trim() || loading}
                style={{
                  background: loading
                    ? "#1a1a0a"
                    : input.trim()
                      ? "#e6a817"
                      : "#1a1a1a",
                  border: "none",
                  borderRadius: "7px",
                  padding: "10px 24px",
                  cursor: input.trim() && !loading ? "pointer" : "not-allowed",
                  color: input.trim() && !loading ? "#000" : "#555",
                  fontSize: "13px",
                  fontWeight: 600,
                  fontFamily: "monospace",
                  letterSpacing: "0.05em",
                  transition: "all 0.15s",
                  display: "flex",
                  alignItems: "center",
                  gap: "8px",
                }}
              >
                {loading ? (
                  <>
                    <span
                      style={{
                        animation: "spin 1s linear infinite",
                        display: "inline-block",
                      }}
                    >
                      ◌
                    </span>
                    generating...
                  </>
                ) : (
                  "generate commits →"
                )}
              </button>
            </div>

            <style>{`@keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }`}</style>
          </div>
        )}

        {/* RESULT PHASE */}
        {phase === "result" && commits && (
          <div style={{ flex: 1, display: "flex", overflow: "hidden" }}>
            {/* Sidebar — stats */}
            <div
              style={{
                width: "200px",
                flexShrink: 0,
                borderRight: "1px solid #151515",
                padding: "20px 16px",
                background: "#0a0a0a",
              }}
            >
              <div
                style={{
                  fontSize: "10px",
                  color: "#555",
                  letterSpacing: "0.1em",
                  textTransform: "uppercase",
                  marginBottom: "16px",
                }}
              >
                summary
              </div>

              <div style={{ marginBottom: "20px" }}>
                <div
                  style={{
                    fontSize: "28px",
                    fontWeight: 600,
                    color: "#e6a817",
                    lineHeight: 1,
                  }}
                >
                  {commits.length}
                </div>
                <div
                  style={{ fontSize: "11px", color: "#666", marginTop: "4px" }}
                >
                  commits
                </div>
              </div>

              <div style={{ marginBottom: "20px" }}>
                {Object.entries(typeStats)
                  .sort((a, b) => b[1] - a[1])
                  .map(([type, count]) => {
                    const colors = TYPE_COLORS[type] || TYPE_COLORS.misc;
                    return (
                      <div
                        key={type}
                        style={{
                          display: "flex",
                          justifyContent: "space-between",
                          alignItems: "center",
                          padding: "4px 0",
                          borderBottom: "1px solid #111",
                        }}
                      >
                        <span
                          style={{
                            fontSize: "11px",
                            color: colors.text,
                            fontFamily: "monospace",
                          }}
                        >
                          {type}
                        </span>
                        <span
                          style={{
                            fontSize: "12px",
                            color: "#666",
                            fontFamily: "monospace",
                          }}
                        >
                          {count}
                        </span>
                      </div>
                    );
                  })}
              </div>

              {usage && (
                <div
                  style={{ borderTop: "1px solid #151515", paddingTop: "16px" }}
                >
                  <div
                    style={{
                      fontSize: "10px",
                      color: "#555",
                      letterSpacing: "0.1em",
                      textTransform: "uppercase",
                      marginBottom: "10px",
                    }}
                  >
                    cost
                  </div>
                  <div
                    style={{
                      fontSize: "12px",
                      color: "#777",
                      lineHeight: "1.8",
                    }}
                  >
                    {normalizedUsage && (
                      <>
                        <div>
                          in: {normalizedUsage.inputTokens.toLocaleString()}
                        </div>
                        <div>
                          out: {normalizedUsage.outputTokens.toLocaleString()}
                        </div>
                      </>
                    )}
                  </div>
                  <div
                    style={{
                      marginTop: "8px",
                      fontSize: "14px",
                      fontWeight: 600,
                      color: "#e6a817",
                    }}
                  >
                    {normalizedUsage?.hasCost && typeof usage.cost === "number"
                      ? `$${usage.cost.toFixed(4)}`
                      : "N/A"}
                  </div>
                </div>
              )}
            </div>

            {/* Commit list */}
            <div style={{ flex: 1, overflowY: "auto", padding: "20px 24px" }}>
              <div style={{ maxWidth: "720px" }}>
                {/* Prompt reminder */}
                <div
                  style={{
                    marginBottom: "24px",
                    padding: "12px 16px",
                    background: "#0a0a0a",
                    border: "1px solid #1a1a1a",
                    borderRadius: "8px",
                  }}
                >
                  <div
                    style={{
                      fontSize: "10px",
                      color: "#444",
                      letterSpacing: "0.08em",
                      textTransform: "uppercase",
                      marginBottom: "8px",
                    }}
                  >
                    prompt
                  </div>
                  <pre
                    style={{
                      margin: 0,
                      fontSize: "12px",
                      lineHeight: "1.7",
                      color: "#666",
                      fontFamily: "monospace",
                      whiteSpace: "pre-wrap",
                      wordBreak: "break-word",
                      maxHeight: "160px",
                      overflowY: "auto",
                    }}
                  >
                    {input}
                  </pre>
                </div>

                {commits.map((commit, i) => (
                  <CommitCard
                    key={i}
                    commit={commit}
                    index={i}
                    total={commits.length}
                  />
                ))}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
