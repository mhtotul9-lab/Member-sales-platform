export function timeAgo(iso) {
  const diffMs = Date.now() - new Date(iso).getTime();
  const sec = Math.floor(diffMs / 1000);
  if (sec < 45) return "এইমাত্র";
  const min = Math.floor(sec / 60);
  if (min < 60) return `${min} মিনিট আগে`;
  const hr = Math.floor(min / 60);
  if (hr < 24) return `${hr} ঘণ্টা আগে`;
  const day = Math.floor(hr / 24);
  return `${day} দিন আগে`;
}
