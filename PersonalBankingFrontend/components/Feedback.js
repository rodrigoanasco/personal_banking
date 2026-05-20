export function ErrorBanner({ message }) {
  if (!message) {
    return null;
  }

  return <div className="feedback error">{message}</div>;
}

export function SuccessBanner({ message }) {
  if (!message) {
    return null;
  }

  return <div className="feedback success">{message}</div>;
}

export function LoadingBlock({ label = "Loading" }) {
  return (
    <div className="loading-block" aria-live="polite">
      <span className="loading-dot" />
      {label}
    </div>
  );
}
