export function Button({ children, onClick, disabled, variant = "ghost", style: extraStyle, ...props }) {
  const base = {
    border: "none", borderRadius: "5px", padding: "5px 12px",
    cursor: disabled ? "not-allowed" : "pointer",
    fontSize: "11px", fontWeight: 600, fontFamily: "monospace",
    transition: "all 0.15s",
  };
  const variants = {
    primary: { background: disabled ? "#1a1a1a" : "#e6a817", color: disabled ? "#555" : "#000", border: "none" },
    ghost:   { background: "none", color: disabled ? "#333" : "#666", border: "1px solid #222" },
    danger:  { background: "none", color: "#f87171", border: "1px solid #3a1515" },
  };
  return (
    <button onClick={onClick} disabled={disabled} style={{ ...base, ...variants[variant], ...extraStyle }} {...props}>
      {children}
    </button>
  );
}
