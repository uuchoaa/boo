import { useState } from "react";
import { store } from "../store.js";
import { Button } from "../components/Button.jsx";

export function ProjectList({ navigate }) {
  const [projects] = useState(() => store.getProjects());
  const [name, setName] = useState("");

  const create = () => {
    if (!name.trim()) return;
    const p = store.createProject(name.trim());
    setName("");
    navigate("project", { projectId: p.id });
  };

  return (
    <div style={{ maxWidth: "600px", margin: "0 auto", padding: "48px 24px", fontFamily: "monospace" }}>
      <div style={{ fontSize: "14px", fontWeight: 600, color: "#e6a817", marginBottom: "32px", letterSpacing: "0.1em" }}>boo</div>

      <div style={{ display: "flex", gap: "8px", marginBottom: "32px" }}>
        <input
          value={name}
          onChange={(e) => setName(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && create()}
          placeholder="project name..."
          style={{ flex: 1, background: "#0f0f0f", border: "1px solid #222", borderRadius: "6px", padding: "8px 12px", color: "#dbe3ec", fontSize: "13px", fontFamily: "monospace", outline: "none" }}
        />
        <Button variant="primary" onClick={create} disabled={!name.trim()}>new project</Button>
      </div>

      {projects.length === 0 && (
        <p style={{ fontSize: "12px", color: "#333" }}>no projects yet.</p>
      )}
      {projects.map((p) => {
        const runs = store.getRunsByProject(p.id).filter((r) => !r.parentRunId);
        return (
          <div
            key={p.id}
            onClick={() => navigate("project", { projectId: p.id })}
            style={{ padding: "14px 16px", border: "1px solid #151515", borderRadius: "6px", background: "#0a0a0a", cursor: "pointer", marginBottom: "8px" }}
          >
            <div style={{ fontSize: "13px", color: "#dbe3ec", marginBottom: "4px" }}>{p.name}</div>
            <div style={{ fontSize: "10px", color: "#444" }}>{runs.length} run{runs.length !== 1 ? "s" : ""}</div>
          </div>
        );
      })}
    </div>
  );
}
