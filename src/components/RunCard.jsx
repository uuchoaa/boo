import { ScoreBadge, ModelBadge } from "./Badge.jsx";

export function RunCard({ run, onClick }) {
  return (
    <div
      onClick={onClick}
      style={{ padding: "16px 20px", border: "1px solid #1a1a1a", borderRadius: "8px", background: "#0d0d0d", cursor: onClick ? "pointer" : "default", marginBottom: "10px" }}
    >
      <div style={{ display: "flex", alignItems: "center", gap: "10px", marginBottom: "8px" }}>
        <ModelBadge model={run.model} />
        <ScoreBadge score={run.score} />
        <span style={{ marginLeft: "auto", fontSize: "12px", color: "#444", fontFamily: "monospace" }}>
          {new Date(run.createdAt).toLocaleString()}
        </span>
      </div>
      {(run.tokensIn > 0 || run.tokensOut > 0) && (
        <div style={{ fontSize: "13px", color: "#555", fontFamily: "monospace" }}>
          {run.tokensIn.toLocaleString()} in / {run.tokensOut.toLocaleString()} out tkn
        </div>
      )}
    </div>
  );
}
