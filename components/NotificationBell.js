import { useEffect, useState } from "react";
import { useAuth } from "../contexts/AuthContext";

export default function NotificationBell() {
  const { user } = useAuth();
  const [unreadCount, setUnreadCount] = useState(0);

  useEffect(() => {
    if (!user) return;
    let cancelled = false;

    async function poll() {
      try {
        const token = await user.getIdToken();
        const res = await fetch("/api/notifications", { headers: { Authorization: `Bearer ${token}` } });
        if (!res.ok) return;
        const body = await res.json();
        if (!cancelled) setUnreadCount(body.unreadCount || 0);
      } catch {
        // silent — a missed poll isn't worth surfacing an error for
      }
    }

    poll();
    const interval = setInterval(poll, 30000);
    return () => { cancelled = true; clearInterval(interval); };
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
