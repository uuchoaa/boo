export function Button({ children, onClick, disabled, variant = "ghost", style: extraStyle, ...props }) {
  const base = {
    border: "none", borderRadius: "6px", padding: "7px 16px",
    cursor: disabled ? "not-allowed" : "pointer",
    fontSize: "13px", fontWeight: 600, fontFamily: "monospace",
    transition: "all 0.15s",
  };
  const variants = {
    primary: { background: disabled ? "#1a1a1a" : "#e6a817", color: disabled ? "#555" : "#000" },
    ghost:   { background: "none", color: disabled ? "#333" : "#777", border: "1px solid #252525" },
    danger:  { background: "none", color: "#f87171", border: "1px solid #3a1515" },
  };
  return (
    <button onClick={onClick} disabled={disabled} style={{ ...base, ...variants[variant], ...extraStyle }} {...props}>
      {children}
    </button>
  );
}
