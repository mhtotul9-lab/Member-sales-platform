import { useEffect, useState } from "react";
import { useAuth } from "../contexts/AuthContext";

export default function NotificationBell() {
  const { user } = useAuth();
  const [unreadCount, setUnreadCount] = useState(0);

  useEffect(() => {
    if (!user) return;
    let cancelled = false;

    async function poll() {
      // ট্যাব লুকানো থাকলে রিড খরচ করা হয় না
      if (typeof document !== "undefined" && document.visibilityState !== "visible") return;
      try {
        const token = await user.getIdToken();
        const res = await fetch("/api/notifications/unread-count", { headers: { Authorization: `Bearer ${token}` } });
        if (!res.ok) return;
        const body = await res.json();
        if (!cancelled) setUnreadCount(body.unreadCount || 0);
      } catch {
        // silent — a missed poll isn't worth surfacing an error for
      }
    }

    poll();
    const interval = setInterval(poll, 120000); // ২ মিনিট
    const onVisible = () => { if (document.visibilityState === "visible") poll(); };
    document.addEventListener("visibilitychange", onVisible);
    return () => { cancelled = true; clearInterval(interval); document.removeEventListener("visibilitychange", onVisible); };
  }, [user]);

  return (
    <a
      href="/notifications"
      className="btn btn-outline btn-sm"
      style={{ position: "relative" }}
      aria-label="নোটিফিকেশন"
    >
      নোটিফিকেশন
      {unreadCount > 0 && (
        <span
          className="notif-badge"
          style={{
            position: "absolute", top: -6, right: -6,
            background: "var(--red)", color: "#fff",
            borderRadius: 999, fontSize: "0.68rem", fontWeight: 700,
            minWidth: 18, height: 18, display: "flex", alignItems: "center", justifyContent: "center",
            padding: "0 4px",
          }}
        >
          {unreadCount > 9 ? "9+" : unreadCount}
        </span>
      )}
    </a>
  );
}
