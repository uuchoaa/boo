import { useState, useRef } from "react";

const MODEL = "claude-opus-4-5-20251101";
const INPUT_COST_PER_MTK  = 15.00 / 1_000_000;
const OUTPUT_COST_PER_MTK =  75.00 / 1_000_000;

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
  test:     { bg: "#0d2010", border: "#1a5c28", text: "#4ade80" },
  feat:     { bg: "#0d1a30", border: "#1a3a7a", text: "#60a5fa" },
  refactor: { bg: "#1a1a0d", border: "#4a4010", text: "#facc15" },
  docs:     { bg: "#1a0d1a", border: "#4a1a4a", text: "#c084fc" },
  fix:      { bg: "#1a0d0d", border: "#5a1a1a", text: "#f87171" },
  ops:      { bg: "#0d1a1a", border: "#1a4a4a", text: "#22d3ee" },
  misc:     { bg: "#111",    border: "#333",    text: "#888"    },
};

function CommitCard({ commit, index, total }) {
  const [expanded, setExpanded] = useState(false);
  const type = typeLabel(commit.message);
  const colors = TYPE_COLORS[type] || TYPE_COLORS.misc;
  const isLast = index === total - 1;

  return (
    <div style={{ display: "flex", gap: "0", position: "relative" }}>
      {/* Timeline spine */}
      <div style={{ display: "flex", flexDirection: "column", alignItems: "center", width: "32px", flexShrink: 0 }}>
        <div style={{
          width: "10px", height: "10px", borderRadius: "50%",
          background: colors.text, flexShrink: 0, marginTop: "14px",
          boxShadow: `0 0 8px ${colors.text}55`,
        }} />
        {!isLast && (
          <div style={{ width: "1px", flex: 1, background: "#1e1e1e", marginTop: "4px" }} />
        )}
      </div>

      {/* Card */}
      <div style={{
        flex: 1, marginBottom: isLast ? 0 : "8px",
        border: `1px solid ${expanded ? colors.border : "#1e1e1e"}`,
        borderRadius: "8px", overflow: "hidden",
        transition: "border-color 0.15s",
        background: expanded ? colors.bg : "#0d0d0d",
      }}>
        <button
          onClick={() => setExpanded(e => !e)}
          style={{
            width: "100%", background: "none", border: "none",
            cursor: "pointer", padding: "10px 14px",
            display: "flex", alignItems: "center", gap: "10px",
            textAlign: "left",
          }}
        >
          {/* Order */}
          <span style={{
            fontSize: "10px", color: "#333", fontFamily: "monospace",
            width: "18px", flexShrink: 0,
          }}>
            {String(commit.order).padStart(2, "0")}
          </span>

          {/* Type badge */}
          <span style={{
            fontSize: "10px", padding: "2px 6px", borderRadius: "3px",
            background: colors.bg, border: `1px solid ${colors.border}`,
            color: colors.text, fontFamily: "monospace", flexShrink: 0,
            letterSpacing: "0.05em",
          }}>
            {type}
          </span>

          {/* Message */}
          <span style={{
            fontSize: "12px", color: "#c9d1d9", fontFamily: "monospace",
            flex: 1, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
          }}>
            {commit.message.replace(/^(feat|test|refactor|fix|docs|ops|chore):\s*/, "")}
          </span>

          {/* Files count */}
          <span style={{ fontSize: "10px", color: "#444", fontFamily: "monospace", flexShrink: 0 }}>
            {commit.files?.length || 0}f
          </span>

          {/* Chevron */}
          <span style={{
            color: "#444", fontSize: "10px", flexShrink: 0,
            transform: expanded ? "rotate(180deg)" : "none",
            transition: "transform 0.15s",
          }}>▾</span>
        </button>

        {expanded && (
          <div style={{ borderTop: `1px solid ${colors.border}` }}>
            {/* Files */}
            {commit.files?.length > 0 && (
              <div style={{ padding: "8px 14px", borderBottom: `1px solid ${colors.border}30` }}>
                {commit.files.map((f, i) => (
                  <div key={i} style={{
                    fontSize: "11px", color: "#666", fontFamily: "monospace",
                    padding: "1px 0",
                  }}>
                    <span style={{ color: "#555" }}>📄 </span>{f}
                  </div>
                ))}
              </div>
            )}

            {/* Diff */}
            {commit.diff && (
              <pre style={{
                margin: 0, padding: "12px 14px",
                fontSize: "11px", lineHeight: "1.6",
                fontFamily: "monospace", overflowX: "auto",
                maxHeight: "320px", overflowY: "auto",
                color: "#888",
              }}>
                {commit.diff.split("\\n").map((line, i) => {
                  let color = "#666";
                  if (line.startsWith("+") && !line.startsWith("+++")) color = "#4ade80";
                  else if (line.startsWith("-") && !line.startsWith("---")) color = "#f87171";
                  else if (line.startsWith("@@")) color = "#60a5fa";
                  else if (line.startsWith("diff ") || line.startsWith("index ")) color = "#888";
                  return (
                    <span key={i} style={{ color, display: "block" }}>{line}</span>
                  );
                })}
              </pre>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

function CostBadge({ usage }) {
  if (!usage) return null;
  const cost = (usage.input_tokens * INPUT_COST_PER_MTK + usage.output_tokens * OUTPUT_COST_PER_MTK);
  return (
    <div style={{
      display: "flex", gap: "16px", alignItems: "center",
      fontSize: "11px", color: "#555", fontFamily: "monospace",
    }}>
      <span>↑{usage.input_tokens.toLocaleString()} tkn</span>
      <span>↓{usage.output_tokens.toLocaleString()} tkn</span>
      <span style={{
        color: "#e6a817", background: "#1a1a0a",
        border: "1px solid #3a3010", borderRadius: "4px",
        padding: "2px 8px",
      }}>
        ~${cost.toFixed(4)}
      </span>
    </div>
  );
}

export default function BooApp() {
  const [input, setInput] = useState("");
  const [commits, setCommits] = useState(null);
  const [usage, setUsage] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [phase, setPhase] = useState("input"); // input | result
  const textareaRef = useRef(null);

  const generate = async () => {
    if (!input.trim() || loading) return;
    setLoading(true);
    setError(null);

    try {
      const res = await fetch("https://api.anthropic.com/v1/messages", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          model: MODEL,
          max_tokens: 4096,
          system: SYSTEM,
          messages: [{ role: "user", content: input.trim() }],
        }),
      });

      const data = await res.json();
      if (data.error) { setError(data.error.message); return; }

      const raw = data.content?.map(b => b.text || "").join("") || "";
      const clean = raw.replace(/```json|```/g, "").trim();
      const parsed = JSON.parse(clean);

      setCommits(parsed.commits || []);
      setUsage(data.usage);
      setPhase("result");
    } catch (e) {
      setError("Parse error: " + e.message);
    } finally {
      setLoading(false);
    }
  };

  const exportJSON = () => {
    const blob = new Blob([JSON.stringify({ commits, usage }, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "boo-commits.json";
    a.click();
    URL.revokeObjectURL(url);
  };

  const exportMarkdown = () => {
    const lines = ["# Boo — Generated Commits\n"];
    commits.forEach(c => {
      lines.push(`## ${c.order}. ${c.message}\n`);
      if (c.files?.length) {
        lines.push("**Files:** " + c.files.join(", ") + "\n");
      }
      if (c.diff) {
        lines.push("```diff\n" + c.diff.replace(/\\n/g, "\n") + "\n```\n");
      }
    });
    if (usage) {
      const cost = (usage.input_tokens * INPUT_COST_PER_MTK + usage.output_tokens * OUTPUT_COST_PER_MTK);
      lines.push(`---\n_Cost: ~$${cost.toFixed(4)} | ${usage.input_tokens} in / ${usage.output_tokens} out tokens_`);
    }
    const blob = new Blob([lines.join("\n")], { type: "text/markdown" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "boo-commits.md";
    a.click();
    URL.revokeObjectURL(url);
  };

  const typeStats = commits ? commits.reduce((acc, c) => {
    const t = typeLabel(c.message);
    acc[t] = (acc[t] || 0) + 1;
    return acc;
  }, {}) : {};

  return (
    <div style={{
      minHeight: "100vh", background: "#080808",
      fontFamily: "'JetBrains Mono', 'Fira Code', 'Cascadia Code', monospace",
      color: "#e6edf3", display: "flex", flexDirection: "column",
    }}>
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
      <div style={{
        borderBottom: "1px solid #151515", padding: "12px 20px",
        display: "flex", alignItems: "center", justifyContent: "space-between",
        background: "#0a0a0a",
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
          <span style={{
            fontSize: "14px", fontWeight: 600, letterSpacing: "0.1em",
            color: "#e6a817",
          }}>
            boo
          </span>
          <span style={{ color: "#222", fontSize: "12px" }}>/</span>
          <span style={{ fontSize: "11px", color: "#444" }}>ghost dev</span>
        </div>

        {phase === "result" && (
          <div style={{ display: "flex", gap: "8px", alignItems: "center" }}>
            <CostBadge usage={usage} />
            <button onClick={exportMarkdown} style={{
              background: "none", border: "1px solid #222", borderRadius: "5px",
              color: "#666", cursor: "pointer", padding: "4px 10px",
              fontSize: "11px", transition: "all 0.15s",
            }}
              onMouseEnter={e => { e.target.style.borderColor = "#e6a817"; e.target.style.color = "#e6a817"; }}
              onMouseLeave={e => { e.target.style.borderColor = "#222"; e.target.style.color = "#666"; }}
            >
              export .md
            </button>
            <button onClick={exportJSON} style={{
              background: "none", border: "1px solid #222", borderRadius: "5px",
              color: "#666", cursor: "pointer", padding: "4px 10px",
              fontSize: "11px", transition: "all 0.15s",
            }}
              onMouseEnter={e => { e.target.style.borderColor = "#e6a817"; e.target.style.color = "#e6a817"; }}
              onMouseLeave={e => { e.target.style.borderColor = "#222"; e.target.style.color = "#666"; }}
            >
              export .json
            </button>
            <button onClick={() => { setPhase("input"); setCommits(null); setUsage(null); }} style={{
              background: "none", border: "1px solid #222", borderRadius: "5px",
              color: "#666", cursor: "pointer", padding: "4px 10px",
              fontSize: "11px", transition: "all 0.15s",
            }}
              onMouseEnter={e => { e.target.style.borderColor = "#555"; e.target.style.color = "#aaa"; }}
              onMouseLeave={e => { e.target.style.borderColor = "#222"; e.target.style.color = "#666"; }}
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
          <div style={{ flex: 1, display: "flex", flexDirection: "column", padding: "24px", maxWidth: "800px", margin: "0 auto", width: "100%" }}>
            <div style={{ marginBottom: "12px", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <span style={{ fontSize: "11px", color: "#444", letterSpacing: "0.08em", textTransform: "uppercase" }}>
                issue + codebase context
              </span>
              <span style={{ fontSize: "10px", color: "#333" }}>markdown</span>
            </div>

            <textarea
              ref={textareaRef}
              value={input}
              onChange={e => setInput(e.target.value)}
              placeholder={PLACEHOLDER}
              style={{
                flex: 1, minHeight: "420px",
                background: "#0d0d0d", border: "1px solid #1a1a1a",
                borderRadius: "8px", padding: "16px",
                color: "#c9d1d9", fontSize: "12px", lineHeight: "1.7",
                fontFamily: "monospace", resize: "none",
                transition: "border-color 0.15s",
              }}
              onFocus={e => e.target.style.borderColor = "#2a2a2a"}
              onBlur={e => e.target.style.borderColor = "#1a1a1a"}
            />

            {error && (
              <div style={{
                marginTop: "12px", padding: "10px 14px",
                background: "#1a0808", border: "1px solid #5a1515",
                borderRadius: "6px", color: "#f87171", fontSize: "11px",
              }}>
                ⚠ {error}
              </div>
            )}

            <div style={{ marginTop: "16px", display: "flex", justifyContent: "flex-end" }}>
              <button
                onClick={generate}
                disabled={!input.trim() || loading}
                style={{
                  background: loading ? "#1a1a0a" : (input.trim() ? "#e6a817" : "#1a1a1a"),
                  border: "none", borderRadius: "7px",
                  padding: "10px 24px", cursor: input.trim() && !loading ? "pointer" : "not-allowed",
                  color: input.trim() && !loading ? "#000" : "#444",
                  fontSize: "12px", fontWeight: 600, fontFamily: "monospace",
                  letterSpacing: "0.05em", transition: "all 0.15s",
                  display: "flex", alignItems: "center", gap: "8px",
                }}
              >
                {loading ? (
                  <>
                    <span style={{ animation: "spin 1s linear infinite", display: "inline-block" }}>◌</span>
                    generating...
                  </>
                ) : "generate commits →"}
              </button>
            </div>

            <style>{`@keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }`}</style>
          </div>
        )}

        {/* RESULT PHASE */}
        {phase === "result" && commits && (
          <div style={{ flex: 1, display: "flex", overflow: "hidden" }}>

            {/* Sidebar — stats */}
            <div style={{
              width: "200px", flexShrink: 0,
              borderRight: "1px solid #151515",
              padding: "20px 16px",
              background: "#0a0a0a",
            }}>
              <div style={{ fontSize: "10px", color: "#333", letterSpacing: "0.1em", textTransform: "uppercase", marginBottom: "16px" }}>
                summary
              </div>

              <div style={{ marginBottom: "20px" }}>
                <div style={{ fontSize: "28px", fontWeight: 600, color: "#e6a817", lineHeight: 1 }}>
                  {commits.length}
                </div>
                <div style={{ fontSize: "10px", color: "#444", marginTop: "4px" }}>commits</div>
              </div>

              <div style={{ marginBottom: "20px" }}>
                {Object.entries(typeStats).sort((a, b) => b[1] - a[1]).map(([type, count]) => {
                  const colors = TYPE_COLORS[type] || TYPE_COLORS.misc;
                  return (
                    <div key={type} style={{
                      display: "flex", justifyContent: "space-between",
                      alignItems: "center", padding: "4px 0",
                      borderBottom: "1px solid #111",
                    }}>
                      <span style={{ fontSize: "11px", color: colors.text, fontFamily: "monospace" }}>{type}</span>
                      <span style={{ fontSize: "11px", color: "#444", fontFamily: "monospace" }}>{count}</span>
                    </div>
                  );
                })}
              </div>

              {usage && (
                <div style={{ borderTop: "1px solid #151515", paddingTop: "16px" }}>
                  <div style={{ fontSize: "10px", color: "#333", letterSpacing: "0.1em", textTransform: "uppercase", marginBottom: "10px" }}>
                    cost
                  </div>
                  <div style={{ fontSize: "11px", color: "#555", lineHeight: "1.8" }}>
                    <div>in: {usage.input_tokens.toLocaleString()}</div>
                    <div>out: {usage.output_tokens.toLocaleString()}</div>
                  </div>
                  <div style={{
                    marginTop: "8px", fontSize: "14px", fontWeight: 600,
                    color: "#e6a817",
                  }}>
                    ${(usage.input_tokens * INPUT_COST_PER_MTK + usage.output_tokens * OUTPUT_COST_PER_MTK).toFixed(4)}
                  </div>
                </div>
              )}
            </div>

            {/* Commit list */}
            <div style={{ flex: 1, overflowY: "auto", padding: "20px 24px" }}>
              <div style={{ maxWidth: "720px" }}>
                {commits.map((commit, i) => (
                  <CommitCard key={i} commit={commit} index={i} total={commits.length} />
                ))}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
