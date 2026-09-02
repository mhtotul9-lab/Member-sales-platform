export default function Logo({ size = 30 }) {
  // eslint-disable-next-line @next/next/no-img-element
  return (
    <img
      src="/icon-192.png"
      alt="𝕵𝖔𝖑𝖗𝖆𝖘𝖎পার্টনার"
      width={size}
      height={size}
      style={{ borderRadius: size * 0.28, flexShrink: 0, objectFit: "cover" }}
    />
  );
}
