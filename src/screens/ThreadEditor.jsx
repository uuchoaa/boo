import { useState, useRef, useEffect } from "react";
import { store, extractScore } from "../store.js";
import { MODELS } from "../models.js";
import { Button } from "../components/Button.jsx";
import { ScoreBadge } from "../components/Badge.jsx";

const GROQ_URL     = "https://api.groq.com/openai/v1/chat/completions";
const ANTHROPIC_URL = "https://api.anthropic.com/v1/messages";

async function callLLM({ modelId, systemPrompt, userText, groqKey, anthropicKey }) {
  const model = MODELS.find((m) => m.id === modelId) ?? MODELS[0];

  if (model.provider === "anthropic") {
    const body = { model: modelId, max_tokens: 8192, messages: [{ role: "user", content: userText }] };
    if (systemPrompt) body.system = systemPrompt;
    const res = await fetch(ANTHROPIC_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": anthropicKey,
        "anthropic-version": "2023-06-01",
        "anthropic-dangerous-direct-browser-access": "true",
      },
      body: JSON.stringify(body),
    });
    const data = await res.json();
    if (data.error) throw new Error(data.error.message);
    return {
      reply: data.content?.map((b) => b.text || "").join("") ?? "",
      tokensIn: data.usage?.input_tokens ?? 0,
      tokensOut: data.usage?.output_tokens ?? 0,
    };
  }

  const messages = [];
  if (systemPrompt) messages.push({ role: "system", content: systemPrompt });
  messages.push({ role: "user", content: userText });
  const res = await fetch(GROQ_URL, {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${groqKey}` },
    body: JSON.stringify({ model: modelId, messages }),
  });
  const data = await res.json();
  if (data.error) throw new Error(data.error.message ?? JSON.stringify(data.error));
  return {
    reply: data.choices?.[0]?.message?.content ?? "",
    tokensIn: data.usage?.prompt_tokens ?? 0,
    tokensOut: data.usage?.completion_tokens ?? 0,
  };
}

// phase: idle → generated → done
export function ThreadEditor({ projectId, navigate }) {
  const groqKey      = localStorage.getItem("boo-openai-api-key") ?? "";
  const anthropicKey = localStorage.getItem("boo-anthropic-api-key") ?? "";

  const project = store.getProject(projectId);

  const [model, setModel]   = useState(MODELS[0].id);
  const [text, setText]     = useState("");
  const [phase, setPhase]   = useState("idle");   // idle | running | generated | evaluating | done
  const [runId, setRunId]   = useState(null);
  const [score, setScore]   = useState(null);
  const [logs, setLogs]     = useState([]);
  const logsEndRef          = useRef(null);

  useEffect(() => {
    setTimeout(() => logsEndRef.current?.scrollIntoView({ behavior: "smooth" }), 50);
  }, [logs]);

  const log = (msg, type = "info") =>
    setLogs((l) => [...l, { msg, type, ts: new Date().toLocaleTimeString() }]);

  const go = async () => {
    if (!text.trim() || phase !== "idle") return;
    const apiKey = MODELS.find((m) => m.id === model)?.provider === "anthropic" ? anthropicKey : groqKey;
    if (!apiKey.trim()) { log("api key not set", "error"); return; }

    setPhase("running");
    log(`→ ${model}`);

    try {
      const { reply, tokensIn, tokensOut } = await callLLM({
        modelId: model,
        systemPrompt: project?.systemPrompt || null,
        userText: text,
        groqKey,
        anthropicKey,
      });

      const newText = text + "\n\n" + reply;
      setText(newText);
      log(`← ${tokensIn.toLocaleString()} in / ${tokensOut.toLocaleString()} out tkn`);

      const run = store.createRun({ projectId, model });
      store.updateRun(run.id, { thread: newText, tokensIn, tokensOut });
      setRunId(run.id);
      setPhase("generated");
    } catch (err) {
      log(err.message, "error");
      setPhase("idle");
    }
  };

  const evaluate = async () => {
    if (!runId || phase !== "generated") return;
    setPhase("evaluating");

    const evalModel = project?.evalModel ?? model;
    const evalPrompt = project?.evalPrompt ?? null;
    const evalApiKey = MODELS.find((m) => m.id === evalModel)?.provider === "anthropic" ? anthropicKey : groqKey;
    if (!evalApiKey.trim()) { log("eval api key not set", "error"); setPhase("generated"); return; }

    log(`→ eval · ${evalModel}`);
    try {
      const { reply, tokensIn, tokensOut } = await callLLM({
        modelId: evalModel,
        systemPrompt: evalPrompt,
        userText: text,
        groqKey,
        anthropicKey,
      });

      const extracted = extractScore(reply);
      store.updateRun(runId, { score: extracted });
      setScore(extracted);
      log(`← score: ${extracted ?? "not found"} · ${tokensIn.toLocaleString()} in / ${tokensOut.toLocaleString()} out tkn`);
      setPhase("done");
      setTimeout(() => navigate("project", { projectId }), 800);
    } catch (err) {
      log(err.message, "error");
      setPhase("generated");
    }
  };

  const phaseButton = () => {
    if (phase === "idle")       return <Button variant="primary" onClick={go} disabled={!text.trim()} style={{ padding: "8px 24px", fontSize: "15px" }}>Go!</Button>;
    if (phase === "running")    return <Button variant="primary" disabled style={{ padding: "8px 24px", fontSize: "15px" }}><span style={{ animation: "spin 1s linear infinite", display: "inline-block" }}>◌</span></Button>;
    if (phase === "generated")  return <Button variant="primary" onClick={evaluate} style={{ padding: "8px 24px", fontSize: "15px" }}>Evaluate!</Button>;
    if (phase === "evaluating") return <Button variant="primary" disabled style={{ padding: "8px 24px", fontSize: "15px" }}><span style={{ animation: "spin 1s linear infinite", display: "inline-block" }}>◌</span></Button>;
    if (phase === "done")       return <ScoreBadge score={score} />;
    return null;
  };

  return (
    <div style={{ height: "100vh", background: "#080808", fontFamily: "monospace", color: "#e6edf3", display: "flex", flexDirection: "column" }}>
      {/* Toolbar */}
      <div style={{ padding: "12px 24px", borderBottom: "1px solid #151515", display: "flex", alignItems: "center", gap: "14px", flexShrink: 0, background: "#0a0a0a" }}>
        <button onClick={() => navigate("project", { projectId })} style={{ background: "none", border: "none", color: "#555", cursor: "pointer", fontSize: "14px", fontFamily: "monospace" }}>←</button>
        <span style={{ fontSize: "14px", color: "#555" }}>{project?.name}</span>
        <div style={{ marginLeft: "auto", display: "flex", alignItems: "center", gap: "10px" }}>
          <select
            value={model}
            onChange={(e) => setModel(e.target.value)}
            disabled={phase !== "idle"}
            style={{ background: "#0d0d0d", border: "1px solid #252525", borderRadius: "5px", color: "#d8dfe8", fontSize: "13px", padding: "6px 10px", fontFamily: "monospace" }}
          >
            {MODELS.map((m) => <option key={m.id} value={m.id}>{m.label}</option>)}
          </select>
          {phaseButton()}
        </div>
      </div>

      {/* Editor + console */}
      <div style={{ flex: 1, display: "flex", flexDirection: "column", overflow: "hidden" }}>
        <textarea
          value={text}
          onChange={(e) => phase === "idle" && setText(e.target.value)}
          placeholder="write markdown..."
          onKeyDown={(e) => { if (e.key === "Enter" && e.metaKey) go(); }}
          style={{ flex: 1, background: "#080808", border: "none", outline: "none", padding: "36px", color: "#dbe3ec", fontSize: "15px", lineHeight: "1.9", fontFamily: "monospace", resize: "none" }}
        />
        <div style={{ height: "150px", borderTop: "1px solid #151515", background: "#050505", overflowY: "auto", padding: "10px 24px", flexShrink: 0 }}>
          <div style={{ fontSize: "11px", color: "#333", textTransform: "uppercase", letterSpacing: "0.1em", marginBottom: "8px" }}>console</div>
          {logs.length === 0 && <span style={{ fontSize: "13px", color: "#222" }}>no output yet</span>}
          {logs.map((l, i) => (
            <div key={i} style={{ display: "flex", gap: "14px", fontSize: "13px", lineHeight: "1.7", color: l.type === "error" ? "#f87171" : "#555" }}>
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
