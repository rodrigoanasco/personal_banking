export function SummaryCard({ icon: Icon, label, children, tone = "neutral" }) {
  return (
    <section className={`summary-card ${tone}`}>
      <div className="summary-label">
        {Icon ? <Icon size={18} aria-hidden="true" /> : null}
        <span>{label}</span>
      </div>
      <div className="summary-value">{children}</div>
    </section>
  );
}
