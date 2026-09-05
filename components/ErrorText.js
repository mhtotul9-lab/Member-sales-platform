export default function ErrorText({ children }) {
  if (!children) return null;
  const text = String(children);
  const parts = text.split(/(https?:\/\/[^\s]+)/g);

  return (
    <p className="error-text">
      {parts.map((part, i) =>
        /^https?:\/\//.test(part) ? (
          <a
            key={i}
            href={part}
            target="_blank"
            rel="noreferrer"
            style={{ color: "inherit", textDecoration: "underline", wordBreak: "break-all" }}
          >
            {part}
          </a>
        ) : (
          <span key={i}>{part}</span>
        )
      )}
    </p>
  );
}
