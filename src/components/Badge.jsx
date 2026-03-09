export function ScoreBadge({ score }) {
  if (score === null || score === undefined) return null;
  const c = score >= 8
    ? { bg: "#0a1f0a", border: "#1a4d1a", text: "#4ade80" }
    : score >= 6
    ? { bg: "#1a1505", border: "#4d3a05", text: "#e6a817" }
    : { bg: "#1a0808", border: "#5a1515", text: "#f87171" };
  return (
    <span style={{ fontSize: "14px", fontWeight: 700, fontFamily: "monospace", padding: "3px 10px", borderRadius: "5px", background: c.bg, border: `1px solid ${c.border}`, color: c.text }}>
      {score}/10
    </span>
  );
}

export function ModelBadge({ model }) {
  return (
    <span style={{ fontSize: "12px", fontFamily: "monospace", padding: "3px 8px", borderRadius: "4px", background: "#111", border: "1px solid #222", color: "#666" }}>
      {model}
    </span>
  );
}
