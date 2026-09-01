export default function Logo({ size = 30 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 64 64" xmlns="http://www.w3.org/2000/svg" aria-hidden="true" style={{ flexShrink: 0 }}>
      <rect width="64" height="64" rx="16" fill="#1F7A5C" />
      <text x="32" y="45" textAnchor="middle" fontFamily="Georgia, serif" fontSize="34" fontWeight="700" fill="#FFFFFF">
        ৳
      </text>
    </svg>
  );
}
