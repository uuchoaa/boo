import { useState } from "react";
import { store } from "../store.js";
import { Button } from "../components/Button.jsx";
import { RunCard } from "../components/RunCard.jsx";
import { ScoreBadge, ModelBadge } from "../components/Badge.jsx";

const totalTokens = (calls) =>
  calls.reduce((a, c) => ({ in: a.in + c.tokensIn, out: a.out + c.tokensOut }), { in: 0, out: 0 });

export function RunDetail({ runId, navigate }) {
  const [run] = useState(() => store.getRun(runId));
  const [evalRuns] = useState(() => store.getEvalRuns(runId));
  const [project] = useState(() => run ? store.getProject(run.projectId) : null);
  const [showThread, setShowThread] = useState(false);

  if (!run) return null;

  const tokens = totalTokens(run.calls);

  return (
    <div style={{ maxWidth: "700px", margin: "0 auto", padding: "48px 24px", fontFamily: "monospace" }}>
      {/* Breadcrumb */}
      <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "32px", fontSize: "11px" }}>
        <button onClick={() => navigate("projects")} style={{ background: "none", border: "none", color: "#555", cursor: "pointer", fontFamily: "monospace", fontSize: "11px" }}>projects</button>
        <span style={{ color: "#222" }}>/</span>
        <button onClick={() => navigate("project", { projectId: run.projectId })} style={{ background: "none", border: "none", color: "#555", cursor: "pointer", fontFamily: "monospace", fontSize: "11px" }}>{project?.name}</button>
        <span style={{ color: "#222" }}>/</span>
        <span style={{ color: "#dbe3ec" }}>run</span>
      </div>

      {/* Run metadata */}
      <div style={{ padding: "16px", border: "1px solid #151515", borderRadius: "8px", background: "#0a0a0a", marginBottom: "24px" }}>
        <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "12px" }}>
          <ModelBadge model={run.model} />
          <ScoreBadge score={run.score} />
        </div>
        <div style={{ display: "flex", gap: "16px", fontSize: "10px", color: "#444", marginBottom: "14px" }}>
          <span>{new Date(run.createdAt).toLocaleString()}</span>
          <span>{run.calls.length} call{run.calls.length !== 1 ? "s" : ""}</span>
          {tokens.in > 0 && <span>{tokens.in.toLocaleString()} in / {tokens.out.toLocaleString()} out tkn</span>}
        </div>
        <div style={{ display: "flex", gap: "8px" }}>
          <Button onClick={() => setShowThread((v) => !v)}>{showThread ? "hide thread" : "show thread"}</Button>
          <Button onClick={() => navigate("thread", { projectId: run.projectId, runId: run.id })}>continue</Button>
          <Button onClick={() => navigate("thread", { projectId: run.projectId, parentRunId: run.id })}>eval →</Button>
        </div>
      </div>

      {showThread && (
        <pre style={{ background: "#0f0f0f", border: "1px solid #1a1a1a", borderRadius: "8px", padding: "20px", color: "#dbe3ec", fontSize: "12px", lineHeight: "1.8", whiteSpace: "pre-wrap", marginBottom: "24px", maxHeight: "400px", overflowY: "auto" }}>
          {run.thread}
        </pre>
      )}

      {/* Eval runs */}
      <div style={{ fontSize: "10px", color: "#555", textTransform: "uppercase", letterSpacing: "0.1em", marginBottom: "12px" }}>evaluations</div>
      {evalRuns.length === 0 && <p style={{ fontSize: "12px", color: "#333" }}>no evaluations yet.</p>}
      {evalRuns.map((er) => (
        <RunCard key={er.id} run={er} isEval onClick={() => navigate("run", { runId: er.id })} />
      ))}
    </div>
  );
}
