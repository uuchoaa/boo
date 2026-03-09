import { useState } from "react";
import { store } from "../store.js";
import { Button } from "../components/Button.jsx";
import { RunCard } from "../components/RunCard.jsx";

export function ProjectDetail({ projectId, navigate }) {
  const [project] = useState(() => store.getProject(projectId));
  const [runs] = useState(() => store.getRunsByProject(projectId));

  if (!project) return null;

  const baseRuns = runs.filter((r) => !r.parentRunId);

  return (
    <div style={{ maxWidth: "700px", margin: "0 auto", padding: "48px 24px", fontFamily: "monospace" }}>
      <div style={{ display: "flex", alignItems: "center", gap: "12px", marginBottom: "32px" }}>
        <button onClick={() => navigate("projects")} style={{ background: "none", border: "none", color: "#555", cursor: "pointer", fontSize: "11px", fontFamily: "monospace" }}>← projects</button>
        <span style={{ color: "#222" }}>/</span>
        <span style={{ fontSize: "13px", color: "#dbe3ec" }}>{project.name}</span>
        <div style={{ marginLeft: "auto" }}>
          <Button variant="primary" onClick={() => navigate("thread", { projectId })}>new run</Button>
        </div>
      </div>

      {baseRuns.length === 0 && (
        <p style={{ fontSize: "12px", color: "#333" }}>no runs yet.</p>
      )}
      {baseRuns.map((run) => (
        <RunCard
          key={run.id}
          run={run}
          evalCount={store.getEvalRuns(run.id).length}
          onClick={() => navigate("run", { runId: run.id })}
        />
      ))}
    </div>
  );
}
