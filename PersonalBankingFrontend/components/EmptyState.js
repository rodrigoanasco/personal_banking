export function EmptyState({ title, message }) {
  return (
    <div className="empty-state">
      <h3>{title}</h3>
      {message ? <p>{message}</p> : null}
    </div>
  );
}
