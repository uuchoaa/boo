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
    <div style={{ maxWidth: "680px", margin: "0 auto", padding: "64px 32px", fontFamily: "monospace" }}>
      <div style={{ fontSize: "20px", fontWeight: 700, color: "#e6a817", marginBottom: "40px", letterSpacing: "0.1em" }}>boo</div>

      <div style={{ display: "flex", gap: "10px", marginBottom: "40px" }}>
        <input
          value={name}
          onChange={(e) => setName(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && create()}
          placeholder="project name..."
          style={{ flex: 1, background: "#0f0f0f", border: "1px solid #222", borderRadius: "7px", padding: "10px 14px", color: "#dbe3ec", fontSize: "15px", fontFamily: "monospace" }}
        />
        <Button variant="primary" onClick={create} disabled={!name.trim()}>new project</Button>
      </div>

      {projects.length === 0 && (
        <p style={{ fontSize: "15px", color: "#333" }}>no projects yet.</p>
      )}
      {projects.map((p) => {
        const runs = store.getRunsByProject(p.id).filter((r) => !r.parentRunId);
        return (
          <div
            key={p.id}
            onClick={() => navigate("project", { projectId: p.id })}
            style={{ padding: "18px 20px", border: "1px solid #1a1a1a", borderRadius: "8px", background: "#0d0d0d", cursor: "pointer", marginBottom: "10px" }}
          >
            <div style={{ fontSize: "16px", color: "#dbe3ec", marginBottom: "6px" }}>{p.name}</div>
            <div style={{ fontSize: "13px", color: "#555" }}>{runs.length} run{runs.length !== 1 ? "s" : ""}</div>
          </div>
        );
      })}
    </div>
  );
}
