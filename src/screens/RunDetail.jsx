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

  const startEval = () => {
    navigate("thread", {
      projectId: run.projectId,
      parentRunId: run.id,
      initialModel: project?.evalModel ?? null,
    });
  };

  return (
    <div style={{ maxWidth: "760px", margin: "0 auto", padding: "64px 32px", fontFamily: "monospace" }}>
      {/* Breadcrumb */}
      <div style={{ display: "flex", alignItems: "center", gap: "10px", marginBottom: "40px", fontSize: "14px" }}>
        <button onClick={() => navigate("projects")} style={{ background: "none", border: "none", color: "#555", cursor: "pointer", fontFamily: "monospace", fontSize: "14px" }}>projects</button>
        <span style={{ color: "#222" }}>/</span>
        <button onClick={() => navigate("project", { projectId: run.projectId })} style={{ background: "none", border: "none", color: "#555", cursor: "pointer", fontFamily: "monospace", fontSize: "14px" }}>{project?.name}</button>
        <span style={{ color: "#222" }}>/</span>
        <span style={{ color: "#dbe3ec" }}>run</span>
      </div>

      {/* Run metadata */}
      <div style={{ padding: "20px 24px", border: "1px solid #1a1a1a", borderRadius: "8px", background: "#0d0d0d", marginBottom: "32px" }}>
        <div style={{ display: "flex", alignItems: "center", gap: "10px", marginBottom: "14px" }}>
          <ModelBadge model={run.model} />
          <ScoreBadge score={run.score} />
        </div>
        <div style={{ display: "flex", gap: "20px", fontSize: "13px", color: "#555", marginBottom: "18px" }}>
          <span>{new Date(run.createdAt).toLocaleString()}</span>
          <span>{run.calls.length} call{run.calls.length !== 1 ? "s" : ""}</span>
          {tokens.in > 0 && <span>{tokens.in.toLocaleString()} in / {tokens.out.toLocaleString()} out tkn</span>}
        </div>
        <div style={{ display: "flex", gap: "8px" }}>
          <Button onClick={() => setShowThread((v) => !v)}>{showThread ? "hide thread" : "show thread"}</Button>
          <Button onClick={() => navigate("thread", { projectId: run.projectId, runId: run.id })}>continue</Button>
          <Button variant="primary" onClick={startEval}>eval →</Button>
        </div>
      </div>

      {showThread && (
        <pre style={{ background: "#0d0d0d", border: "1px solid #1a1a1a", borderRadius: "8px", padding: "20px", color: "#dbe3ec", fontSize: "14px", lineHeight: "1.8", whiteSpace: "pre-wrap", marginBottom: "32px", maxHeight: "480px", overflowY: "auto" }}>
          {run.thread}
        </pre>
      )}

      {/* Eval runs */}
      <div style={{ fontSize: "12px", color: "#555", textTransform: "uppercase", letterSpacing: "0.1em", marginBottom: "14px" }}>evaluations</div>
      {evalRuns.length === 0 && <p style={{ fontSize: "14px", color: "#333" }}>no evaluations yet.</p>}
      {evalRuns.map((er) => (
        <RunCard key={er.id} run={er} isEval onClick={() => navigate("run", { runId: er.id })} />
      ))}
    </div>
  );
}
