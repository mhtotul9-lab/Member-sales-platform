export default function Loading({ text = "লোড হচ্ছে..." }) {
  return (
    <div className="loading-row">
      <span className="spinner" />
      <span className="muted">{text}</span>
    </div>
  );
}
