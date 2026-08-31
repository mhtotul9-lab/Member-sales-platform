import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/router";
import { useAuth } from "../../contexts/AuthContext";
import Nav from "../../components/Nav";

const ENTITY_FILTERS = [
  { value: "", label: "সব" },
  { value: "members", label: "মেম্বার" },
  { value: "products", label: "প্রোডাক্ট" },
  { value: "orders", label: "অর্ডার" },
  { value: "withdrawals", label: "উইথড্র" },
  { value: "settings", label: "সেটিংস" },
];

const ACTION_LABEL = {
  "member.status.update": "মেম্বার স্ট্যাটাস পরিবর্তন",
  "product.update": "প্রোডাক্ট আপডেট",
  "order.status.update": "অর্ডার স্ট্যাটাস পরিবর্তন",
  "withdrawal.status.update": "উইথড্র স্ট্যাটাস পরিবর্তন",
  "settings.update": "সেটিংস আপডেট",
};

export default function AuditLogs() {
  const { user, profile, loading } = useAuth();
  const router = useRouter();
  const [logs, setLogs] = useState(null);
  const [entity, setEntity] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    if (loading) return;
    if (!user) { router.replace("/login"); return; }
    if (!profile || profile.status !== "active") { router.replace("/pending"); return; }
    if (profile.role !== "admin") { router.replace("/member/dashboard"); return; }
  }, [user, profile, loading, router]);

  const load = useCallback(async () => {
    if (!user) return;
    setError("");
    try {
      const token = await user.getIdToken();
      const url = entity ? `/api/admin/audit-logs?entity=${entity}` : "/api/admin/audit-logs";
      const res = await fetch(url, { headers: { Authorization: `Bearer ${token}` } });
      const body = await res.json();
      if (!res.ok) throw new Error(body.error || "লোড করা যায়নি।");
      setLogs(body.logs);
    } catch (err) {
      setError(err.message);
    }
  }, [user, entity]);

  useEffect(() => {
    if (profile?.role === "admin" && profile.status === "active") load();
  }, [profile, load]);

  if (loading || !profile) return null;

  return (
    <div className="shell">
      <Nav role="admin" active="audit-logs" />
      <div className="container">
        <div className="card">
          <h1 style={{ fontSize: "1.25rem", marginBottom: 14 }}>অডিট লগ</h1>
          <div style={{ display: "flex", gap: 8, marginBottom: 20, flexWrap: "wrap" }}>
            {ENTITY_FILTERS.map((f) => (
              <button
                key={f.value}
                className={entity === f.value ? "btn btn-primary btn-sm" : "btn btn-outline btn-sm"}
                onClick={() => setEntity(f.value)}
              >
                {f.label}
              </button>
            ))}
          </div>

          {error && <p className="error-text">{error}</p>}
          {logs === null && !error && <p className="muted">লোড হচ্ছে...</p>}
          {logs && logs.length === 0 && <div className="empty-state">কোনো লগ পাওয়া যায়নি।</div>}

          {logs && logs.map((log) => (
            <div className="list-row" key={log.id} style={{ flexDirection: "column", alignItems: "stretch" }}>
              <div style={{ display: "flex", justifyContent: "space-between" }}>
                <div style={{ fontWeight: 600 }}>{ACTION_LABEL[log.action] || log.action}</div>
                <div className="muted" style={{ fontSize: "0.82rem" }}>{new Date(log.timestamp).toLocaleString("bn-BD")}</div>
              </div>
              <div className="muted" style={{ fontSize: "0.88rem", marginTop: 2 }}>
                অ্যাক্টর: {log.actorEmail || log.actor} · এনটিটি: {log.entity} ({log.entityId})
              </div>
              {log.before && log.after && (
                <div className="muted" style={{ fontSize: "0.82rem", marginTop: 4 }}>
                  {JSON.stringify(log.before)} → {JSON.stringify(log.after)}
                </div>
              )}
              {log.reason && <div className="muted" style={{ fontSize: "0.82rem", marginTop: 2 }}>কারণ: {log.reason}</div>}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
