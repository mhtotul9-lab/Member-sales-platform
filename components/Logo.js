export default function Logo({ size = 30 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 64 64" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
      <rect width="64" height="64" rx="14" fill="#12213B" />
      <circle cx="32" cy="32" r="20" fill="none" stroke="#1F7A5C" strokeWidth="3" />
      <text x="32" y="41" textAnchor="middle" fontFamily="Georgia, serif" fontSize="26" fontWeight="700" fill="#1F7A5C">
        ৳
      </text>
    </svg>
  );
}
