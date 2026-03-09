import { useState } from "react";
import { store } from "../store.js";
import { Button } from "../components/Button.jsx";
import { RunCard } from "../components/RunCard.jsx";
import { MODELS } from "../models.js";

const field = (label, hint, children) => (
  <div style={{ marginBottom: "20px" }}>
    <div style={{ fontSize: "13px", color: "#666", marginBottom: "8px" }}>
      {label} {hint && <span style={{ color: "#333" }}>{hint}</span>}
    </div>
    {children}
  </div>
);

const textarea = (value, onChange, placeholder, minHeight = "120px") => (
  <textarea
    value={value}
    onChange={(e) => onChange(e.target.value)}
    placeholder={placeholder}
    style={{ display: "block", width: "100%", minHeight, background: "#080808", border: "1px solid #222", borderRadius: "7px", padding: "14px", color: "#dbe3ec", fontSize: "14px", lineHeight: "1.7", fontFamily: "monospace", resize: "none" }}
  />
);

export function ProjectDetail({ projectId, navigate }) {
  const [project, setProject] = useState(() => store.getProject(projectId));
  const [runs] = useState(() => store.getRunsByProject(projectId));
  const [showConfig, setShowConfig] = useState(false);

  if (!project) return null;

  const update = (patch) => {
    const updated = store.updateProject(projectId, patch);
    if (updated) setProject(updated);
  };

  return (
    <div style={{ maxWidth: "760px", margin: "0 auto", padding: "64px 32px", fontFamily: "monospace" }}>
      {/* Header */}
      <div style={{ display: "flex", alignItems: "center", gap: "14px", marginBottom: "40px" }}>
        <button onClick={() => navigate("projects")} style={{ background: "none", border: "none", color: "#555", cursor: "pointer", fontSize: "14px", fontFamily: "monospace" }}>← projects</button>
        <span style={{ color: "#222" }}>/</span>
        <span style={{ fontSize: "16px", color: "#dbe3ec" }}>{project.name}</span>
        <div style={{ marginLeft: "auto", display: "flex", gap: "8px" }}>
          <Button onClick={() => setShowConfig((v) => !v)}>{showConfig ? "done" : "configure"}</Button>
          <Button variant="primary" onClick={() => navigate("thread", { projectId })}>new run</Button>
        </div>
      </div>

      {/* Config */}
      {showConfig && (
        <div style={{ marginBottom: "40px", padding: "24px", border: "1px solid #1a1a1a", borderRadius: "8px", background: "#0d0d0d" }}>
          <div style={{ fontSize: "12px", color: "#444", textTransform: "uppercase", letterSpacing: "0.1em", marginBottom: "24px" }}>project config</div>

          {field("system prompt", "(sent as system message on every Go!)",
            textarea(project.systemPrompt ?? "", (v) => update({ systemPrompt: v }), "You are a senior developer...")
          )}

          {field("eval model", "",
            <select
              value={project.evalModel ?? MODELS[0].id}
              onChange={(e) => update({ evalModel: e.target.value })}
              style={{ background: "#080808", border: "1px solid #252525", borderRadius: "6px", color: "#d8dfe8", fontSize: "14px", padding: "8px 12px", fontFamily: "monospace", width: "100%" }}
            >
              {MODELS.map((m) => <option key={m.id} value={m.id}>{m.label}</option>)}
            </select>
          )}

          {field("eval prompt", "(sent as system message on Evaluate!)",
            textarea(project.evalPrompt ?? "", (v) => update({ evalPrompt: v }), "Now evaluate the output above...")
          )}
        </div>
      )}

      {/* Runs */}
      {runs.length === 0 && <p style={{ fontSize: "15px", color: "#333" }}>no runs yet.</p>}
      {runs.map((run) => (
        <RunCard key={run.id} run={run} />
      ))}
    </div>
  );
}
