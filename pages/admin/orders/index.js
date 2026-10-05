import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/router";
import { useAuth } from "../../../contexts/AuthContext";
import Nav from "../../../components/Nav";
import { ORDER_STATUS_LABELS, RISK_FLAG_LABELS } from "../../../lib/orderStatus";
import Loading from "../../../components/Loading";
import ErrorText from "../../../components/ErrorText";

const FILTERS = [
  { value: "", label: "সব" },
  { value: "submitted", label: "সাবমিটেড" },
  { value: "under_review", label: "রিভিউ চলছে" },
  { value: "approved", label: "অ্যাপ্রুভড" },
  { value: "processing", label: "প্রসেসিং" },
  { value: "delivered", label: "ডেলিভার্ড" },
  { value: "completed", label: "সম্পন্ন" },
  { value: "rejected", label: "রিজেক্টেড" },
  { value: "cancelled", label: "বাতিল" },
  { value: "returned", label: "রিটার্ন" },
];
const SOURCES = [
  { value: "", label: "সব সোর্স" },
  { value: "website", label: "🌐 ওয়েবসাইট" },
  { value: "member", label: "মেম্বার" },
];

export default function AdminOrders() {
  const { user, profile, loading } = useAuth();
  const router = useRouter();
  const [orders, setOrders] = useState(null);
  const [filter, setFilter] = useState("");
  const [source, setSource] = useState("");
  const [q, setQ] = useState("");
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
      const url = filter ? `/api/admin/orders?status=${filter}` : "/api/admin/orders";
      const res = await fetch(url, { headers: { Authorization: `Bearer ${token}` } });
      const body = await res.json();
      if (!res.ok) throw new Error(body.error || "লোড করা যায়নি।");
      setOrders(body.orders);
    } catch (err) {
      setError(err.message);
    }
  }, [user, filter]);

  useEffect(() => {
    if (profile?.role === "admin" && profile.status === "active") load();
  }, [profile, load]);

  // নতুন অর্ডার নিজে থেকেই দেখাতে প্রতি ৩০ সেকেন্ডে রিফ্রেশ
  useEffect(() => {
    if (profile?.role !== "admin") return;
    const t = setInterval(load, 30000);
    return () => clearInterval(t);
  }, [profile, load]);

  if (loading || !profile) return null;

  const needle = q.trim().toLowerCase();
  const shown = (orders || []).filter((o) => {
    if (source === "website" && o.source !== "website") return false;
    if (source === "member" && o.source === "website") return false;
    if (!needle) return true;
    return [o.orderId, o.customerName, o.customerPhone, o.productName, o.memberName].some((v) => String(v || "").toLowerCase().includes(needle));
  });
  const today = new Date().toDateString();
  const webToday = (orders || []).filter((o) => o.source === "website" && new Date(o.createdAt).toDateString() === today).length;
  const webNew = (orders || []).filter((o) => o.source === "website" && o.status === "submitted").length;

  return (
    <div className="shell">
      <Nav role="admin" active="orders" />
      <div className="container">
        <div className="card">
          <h1 style={{ fontSize: "1.25rem", marginBottom: 14 }}>অর্ডার ভেরিফিকেশন</h1>
          <div style={{ display: "flex", gap: 8, marginBottom: 20, flexWrap: "wrap" }}>
            {FILTERS.map((f) => (
              <button
                key={f.value}
                className={filter === f.value ? "btn btn-primary btn-sm" : "btn btn-outline btn-sm"}
                onClick={() => setFilter(f.value)}
              >
                {f.label}
              </button>
            ))}
          </div>

          <div style={{ display: "flex", gap: 8, marginBottom: 14, flexWrap: "wrap", alignItems: "center" }}>
            {SOURCES.map((s) => (
              <button key={s.value} className={source === s.value ? "btn btn-teal btn-sm" : "btn btn-outline btn-sm"} onClick={() => setSource(s.value)}>{s.label}</button>
            ))}
            <input
              value={q} onChange={(e) => setQ(e.target.value)} placeholder="নাম / ফোন / অর্ডার নম্বর দিয়ে খুঁজুন"
              style={{ flex: 1, minWidth: 200, padding: "8px 12px", border: "1px solid var(--line)", borderRadius: 8, font: "inherit" }}
            />
          </div>
          {orders && <p className="muted" style={{ marginBottom: 14 }}>ওয়েবসাইট: আজ {webToday}টি অর্ডার · কনফার্মের অপেক্ষায় {webNew}টি</p>}

          {error && <ErrorText>{error}</ErrorText>}
          {orders === null && !error && <Loading />}
          {orders && shown.length === 0 && <div className="empty-state">এই ফিল্টারে কোনো অর্ডার নেই।</div>}

          {orders && shown.map((o) => {
            const st = ORDER_STATUS_LABELS[o.status] || ORDER_STATUS_LABELS.submitted;
            return (
              <div
                className="list-row"
                key={o.id}
                onClick={() => router.push(`/admin/orders/${o.id}`)}
                style={{ cursor: "pointer" }}
              >
                <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
                  {o.productImageUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={o.productImageUrl}
                      alt={o.productName}
                      style={{ width: 56, height: 56, objectFit: "cover", borderRadius: 8, flexShrink: 0, border: "1px solid var(--line)" }}
                    />
                  ) : (
                    <div
                      style={{
                        width: 56, height: 56, borderRadius: 8, flexShrink: 0,
                        background: "var(--paper)", border: "1px solid var(--line)",
                        display: "flex", alignItems: "center", justifyContent: "center",
                        color: "var(--ink-soft)", fontSize: "0.7rem", textAlign: "center",
                      }}
                    >
                      ছবি নেই
                    </div>
                  )}
                  <div>
                    <div style={{ fontWeight: 600 }}>{o.orderId} <span className="muted">· {o.productName} × {o.quantity}</span></div>
                    {o.source === "website" ? (
                      <div className="muted">🌐 {o.customerName} ({o.customerPhone}) · {o.customerAddress} · মোট ৳{o.totalPayable ?? o.orderAmount} (COD)</div>
                    ) : (
                      <div className="muted">{o.memberName} → {o.customerName} ({o.customerPhone}) · ভাউচার মূল্য ৳{o.customerSalePrice || o.orderAmount}</div>
                    )}
                    {o.riskFlags?.length > 0 && (
                      <div style={{ marginTop: 4 }}>
                        {o.riskFlags.map((f) => (
                          <span key={f} className="stamp stamp-pending" style={{ marginRight: 6 }}>
                            ⚠ {RISK_FLAG_LABELS[f] || f}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
                <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                  <span className={`stamp ${st.cls}`}>{st.text}</span>
                  <a className="btn btn-outline btn-sm" href={`/admin/orders/${o.id}`} onClick={(e) => e.stopPropagation()}>বিস্তারিত</a>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
