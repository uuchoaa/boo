import { useState, useRef } from "react";

const MODEL = "llama-3.3-70b-versatile";

export default function Thread() {
  const [text, setText] = useState("");
  const [loading, setLoading] = useState(false);
  const [logs, setLogs] = useState([]);
  const textareaRef = useRef(null);
  const logsEndRef = useRef(null);
  const apiKey = localStorage.getItem("boo-openai-api-key") ?? "";

  const log = (msg, type = "info") => {
    const entry = { msg: typeof msg === "string" ? msg : JSON.stringify(msg, null, 2), type, ts: new Date().toLocaleTimeString() };
    setLogs((l) => [...l, entry]);
    setTimeout(() => logsEndRef.current?.scrollIntoView({ behavior: "smooth" }), 50);
  };

  const go = async () => {
    if (!text.trim() || loading) return;
    setLoading(true);
    log(`→ ${MODEL} · ${text.trim().length} chars`);
    try {
      const res = await fetch("https://api.groq.com/openai/v1/chat/completions", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${apiKey}`,
        },
        body: JSON.stringify({
          model: MODEL,
          messages: [{ role: "user", content: text }],
        }),
      });
      const data = await res.json();
      if (data.error) { log(data.error.message, "error"); return; }
      const reply = data.choices?.[0]?.message?.content;
      const usage = data.usage;
      if (usage) log(`← ${usage.prompt_tokens} in / ${usage.completion_tokens} out tokens`);
      if (reply) setText((t) => t + "\n\n" + reply);
    } catch (err) {
      log(err.message, "error");
    } finally {
      setLoading(false);
    }
  };

  const logColor = { info: "#555", error: "#f87171" };

  return (
    <div style={{ height: "100vh", background: "#080808", fontFamily: "monospace", color: "#e6edf3", display: "flex", flexDirection: "column" }}>
      {/* Toolbar */}
      <div style={{ padding: "12px 20px", borderBottom: "1px solid #151515", display: "flex", justifyContent: "flex-end", flexShrink: 0 }}>
        <button
          onClick={go}
          disabled={!text.trim() || loading}
          style={{ background: loading || !text.trim() ? "#1a1a1a" : "#e6a817", border: "none", borderRadius: "6px", padding: "8px 20px", cursor: loading || !text.trim() ? "not-allowed" : "pointer", color: loading || !text.trim() ? "#555" : "#000", fontSize: "13px", fontWeight: 600, fontFamily: "monospace" }}
        >
          {loading ? "..." : "Go!"}
        </button>
      </div>

      {/* Editor + console split */}
      <div style={{ flex: 1, display: "flex", flexDirection: "column", overflow: "hidden" }}>
        <textarea
          ref={textareaRef}
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder="write markdown..."
          onKeyDown={(e) => { if (e.key === "Enter" && e.metaKey) go(); }}
          style={{ flex: 1, background: "#080808", border: "none", outline: "none", padding: "32px", color: "#dbe3ec", fontSize: "14px", lineHeight: "1.8", fontFamily: "monospace", resize: "none" }}
        />

        {/* Console */}
        <div style={{ height: "140px", borderTop: "1px solid #151515", background: "#050505", overflowY: "auto", padding: "8px 20px", flexShrink: 0 }}>
          <div style={{ fontSize: "10px", color: "#333", textTransform: "uppercase", letterSpacing: "0.1em", marginBottom: "6px" }}>console</div>
          {logs.length === 0 && <span style={{ fontSize: "11px", color: "#2a2a2a" }}>no output yet</span>}
          {logs.map((l, i) => (
            <div key={i} style={{ display: "flex", gap: "12px", fontSize: "11px", lineHeight: "1.6", color: logColor[l.type] ?? logColor.info }}>
              <span style={{ color: "#2a2a2a", flexShrink: 0 }}>{l.ts}</span>
              <span style={{ whiteSpace: "pre-wrap" }}>{l.msg}</span>
            </div>
          ))}
          <div ref={logsEndRef} />
        </div>
      </div>
    </div>
  );
}
