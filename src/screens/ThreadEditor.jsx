import { useState, useRef, useEffect } from "react";
import { store } from "../store.js";
import { Button } from "../components/Button.jsx";
import { ScoreBadge } from "../components/Badge.jsx";

const MODELS = [
  { id: "llama-3.3-70b-versatile", label: "Llama 3.3 70b" },
  { id: "mixtral-8x7b-32768", label: "Mixtral 8x7b" },
  { id: "llama-3.1-8b-instant", label: "Llama 3.1 8b" },
];

const GROQ_URL = "https://api.groq.com/openai/v1/chat/completions";

export function ThreadEditor({ projectId, runId: initialRunId, parentRunId, navigate }) {
  const apiKey = localStorage.getItem("boo-openai-api-key") ?? "";
  const [model, setModel] = useState(MODELS[0].id);
  const [text, setText] = useState("");
  const [loading, setLoading] = useState(false);
  const [logs, setLogs] = useState([]);
  const [runId, setRunId] = useState(initialRunId ?? null);
  const [run, setRun] = useState(null);
  const logsEndRef = useRef(null);

  useEffect(() => {
    if (initialRunId) {
      const r = store.getRun(initialRunId);
      if (r) { setRun(r); setText(r.thread); setModel(r.model); }
    } else if (parentRunId) {
      // pré-carrega thread da run pai como contexto
      const parent = store.getRun(parentRunId);
      if (parent) setText(parent.thread + "\n\n# Evaluation prompt\n\n");
    }
  }, [initialRunId, parentRunId]);

  const log = (msg, type = "info") => {
    setLogs((l) => [...l, { msg, type, ts: new Date().toLocaleTimeString() }]);
    setTimeout(() => logsEndRef.current?.scrollIntoView({ behavior: "smooth" }), 50);
  };

  const go = async () => {
    if (!text.trim() || loading) return;
    setLoading(true);

    let currentRunId = runId;
    if (!currentRunId) {
      const newRun = store.createRun({ projectId, parentRunId: parentRunId ?? null, model });
      currentRunId = newRun.id;
      setRunId(currentRunId);
      setRun(newRun);
    }

    log(`→ ${model} · ${text.trim().length} chars`);
    try {
      const res = await fetch(GROQ_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${apiKey}` },
        body: JSON.stringify({ model, messages: [{ role: "user", content: text }] }),
      });
      const data = await res.json();
      if (data.error) { log(data.error.message, "error"); return; }

      const reply = data.choices?.[0]?.message?.content;
      const usage = data.usage;
      if (usage) log(`← ${usage.prompt_tokens.toLocaleString()} in / ${usage.completion_tokens.toLocaleString()} out tkn`);

      const newText = reply ? text + "\n\n" + reply : text;
      setText(newText);

      const currentRun = store.getRun(currentRunId);
      const call = { ts: Date.now(), tokensIn: usage?.prompt_tokens ?? 0, tokensOut: usage?.completion_tokens ?? 0 };
      const updated = store.updateRun(currentRunId, { thread: newText, calls: [...(currentRun?.calls ?? []), call] });
      setRun(updated);
      if (updated?.score !== null) log(`score extracted: ${updated.score}/10`);
    } catch (err) {
      log(err.message, "error");
    } finally {
      setLoading(false);
    }
  };

  const project = store.getProject(projectId);
  const backTarget = runId ? () => navigate("run", { runId }) : () => navigate("project", { projectId });

  return (
    <div style={{ height: "100vh", background: "#080808", fontFamily: "monospace", color: "#e6edf3", display: "flex", flexDirection: "column" }}>
      {/* Toolbar */}
      <div style={{ padding: "10px 20px", borderBottom: "1px solid #151515", display: "flex", alignItems: "center", gap: "12px", flexShrink: 0 }}>
        <button onClick={backTarget} style={{ background: "none", border: "none", color: "#555", cursor: "pointer", fontSize: "11px", fontFamily: "monospace" }}>←</button>
        <span style={{ fontSize: "11px", color: "#444" }}>{project?.name}</span>
        {parentRunId && <span style={{ fontSize: "9px", color: "#555", textTransform: "uppercase", letterSpacing: "0.1em", border: "1px solid #1a1a1a", padding: "1px 6px", borderRadius: "3px" }}>eval</span>}
        <div style={{ marginLeft: "auto", display: "flex", alignItems: "center", gap: "8px" }}>
          {run?.score !== null && <ScoreBadge score={run?.score} />}
          <select
            value={model}
            onChange={(e) => setModel(e.target.value)}
            disabled={!!runId}
            style={{ background: "#0d0d0d", border: "1px solid #252525", borderRadius: "4px", color: "#d8dfe8", fontSize: "11px", padding: "4px 8px", fontFamily: "monospace" }}
          >
            {MODELS.map((m) => <option key={m.id} value={m.id}>{m.label}</option>)}
          </select>
          <Button variant="primary" onClick={go} disabled={!text.trim() || loading}>
            {loading ? "..." : "Go!"}
          </Button>
        </div>
      </div>

      {/* Editor + console */}
      <div style={{ flex: 1, display: "flex", flexDirection: "column", overflow: "hidden" }}>
        <textarea
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder="write markdown..."
          onKeyDown={(e) => { if (e.key === "Enter" && e.metaKey) go(); }}
          style={{ flex: 1, background: "#080808", border: "none", outline: "none", padding: "32px", color: "#dbe3ec", fontSize: "14px", lineHeight: "1.8", fontFamily: "monospace", resize: "none" }}
        />
        <div style={{ height: "140px", borderTop: "1px solid #151515", background: "#050505", overflowY: "auto", padding: "8px 20px", flexShrink: 0 }}>
          <div style={{ fontSize: "10px", color: "#333", textTransform: "uppercase", letterSpacing: "0.1em", marginBottom: "6px" }}>console</div>
          {logs.length === 0 && <span style={{ fontSize: "11px", color: "#2a2a2a" }}>no output yet</span>}
          {logs.map((l, i) => (
            <div key={i} style={{ display: "flex", gap: "12px", fontSize: "11px", lineHeight: "1.6", color: l.type === "error" ? "#f87171" : "#555" }}>
              <span style={{ color: "#2a2a2a", flexShrink: 0 }}>{l.ts}</span>
              <span>{l.msg}</span>
            </div>
          ))}
          <div ref={logsEndRef} />
        </div>
      </div>
    </div>
  );
}
