import { ScoreBadge, ModelBadge } from "./Badge.jsx";

const totalTokens = (calls) =>
  calls.reduce((a, c) => ({ in: a.in + c.tokensIn, out: a.out + c.tokensOut }), { in: 0, out: 0 });

export function RunCard({ run, evalCount = 0, isEval = false, onClick }) {
  const tokens = totalTokens(run.calls);
  return (
    <div
      onClick={onClick}
      style={{ padding: "12px 16px", border: "1px solid #151515", borderRadius: "6px", background: "#0a0a0a", cursor: onClick ? "pointer" : "default", marginBottom: "8px" }}
    >
      <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "6px" }}>
        {isEval && <span style={{ fontSize: "9px", color: "#555", textTransform: "uppercase", letterSpacing: "0.1em", border: "1px solid #1a1a1a", padding: "1px 4px", borderRadius: "3px" }}>eval</span>}
        <ModelBadge model={run.model} />
        <ScoreBadge score={run.score} />
        <span style={{ marginLeft: "auto", fontSize: "10px", color: "#333", fontFamily: "monospace" }}>
          {new Date(run.createdAt).toLocaleString()}
        </span>
      </div>
      <div style={{ display: "flex", gap: "12px", fontSize: "10px", color: "#444", fontFamily: "monospace" }}>
        <span>{run.calls.length} call{run.calls.length !== 1 ? "s" : ""}</span>
        {tokens.in > 0 && <span>{tokens.in.toLocaleString()} in / {tokens.out.toLocaleString()} out tkn</span>}
        {evalCount > 0 && <span style={{ color: "#333" }}>{evalCount} eval{evalCount !== 1 ? "s" : ""}</span>}
      </div>
    </div>
  );
}
