import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/router";
import { signOut } from "firebase/auth";
import { auth } from "../lib/firebase";
import { useAuth } from "../contexts/AuthContext";
import Nav from "../components/Nav";
import Logo from "../components/Logo";
import Loading from "../components/Loading";

export default function Notifications() {
  const { user, profile, loading } = useAuth();
  const router = useRouter();
  const [notifications, setNotifications] = useState(null);
  const [error, setError] = useState("");

  useEffect(() => {
    if (loading) return;
    if (!user) router.replace("/login");
  }, [user, loading, router]);

  const load = useCallback(async () => {
    if (!user) return;
    setError("");
    try {
      const token = await user.getIdToken();
      const res = await fetch("/api/notifications", { headers: { Authorization: `Bearer ${token}` } });
      const body = await res.json();
      if (!res.ok) throw new Error(body.error || "লোড করা যায়নি।");
      setNotifications(body.notifications);
    } catch (err) {
      setError(err.message);
    }
  }, [user]);

  useEffect(() => { load(); }, [load]);

  async function markAllRead() {
    if (!user) return;
    const token = await user.getIdToken();
    await fetch("/api/notifications/mark-read", {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
      body: JSON.stringify({ all: true }),
    });
    load();
  }

  async function openNotification(n) {
    if (!n.read) {
      const token = await user.getIdToken();
      await fetch("/api/notifications/mark-read", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ id: n.id }),
      });
    }
    if (n.link) router.push(n.link);
    else load();
  }

  if (loading) return null;

  const showFullNav = profile && profile.status === "active";

  return (
    <div className="shell">
      {showFullNav ? (
        <Nav role={profile.role} active="notifications" />
      ) : (
        <header className="topbar">
          <a className="brand" href="/" style={{ display: "flex", alignItems: "center", gap: 10 }}><Logo size={32} /></a>
          <button className="btn btn-outline btn-sm" onClick={() => signOut(auth).then(() => router.replace("/login"))}>
            লগ আউট
          </button>
        </header>
      )}
      <div className="container" style={{ maxWidth: 640 }}>
        <div className="card">
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
            <h1 style={{ fontSize: "1.25rem" }}>নোটিফিকেশন</h1>
            {notifications?.some((n) => !n.read) && (
              <button className="btn btn-outline btn-sm" onClick={markAllRead}>সব পঠিত করুন</button>
            )}
          </div>

          {error && <p className="error-text">{error}</p>}
          {notifications === null && !error && <Loading />}
          {notifications && notifications.length === 0 && <div className="empty-state">কোনো নোটিফিকেশন নেই।</div>}

          {notifications && notifications.map((n) => (
            <button
              key={n.id}
              onClick={() => openNotification(n)}
              className="list-row"
              style={{
                width: "100%", textAlign: "left", background: n.read ? "transparent" : "var(--teal-soft)",
                border: "none", cursor: "pointer", borderRadius: 6, padding: "14px 12px",
              }}
            >
              <div>
                <div style={{ fontWeight: n.read ? 500 : 700 }}>{n.message}</div>
                <div className="muted" style={{ fontSize: "0.82rem", marginTop: 2 }}>
                  {new Date(n.createdAt).toLocaleString("bn-BD")}
                </div>
              </div>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
