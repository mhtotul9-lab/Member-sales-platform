export default function Logo({ height = 34 }) {
  // eslint-disable-next-line @next/next/no-img-element
  return (
    <img
      src="/jolrasi-logo.png"
      alt="Jolrasi Clothing Brand"
      height={height}
      style={{ height, width: "auto", flexShrink: 0, display: "block" }}
    />
  );
}
