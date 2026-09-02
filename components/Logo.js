export default function Logo({ size = 36 }) {
  // eslint-disable-next-line @next/next/no-img-element
  return (
    <img
      src="/jolrasi-logo.png"
      alt="Jolrasi Partner"
      style={{ height: size, width: "auto", display: "block", flexShrink: 0 }}
    />
  );
}
