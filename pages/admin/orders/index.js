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
  { value: "rejected", label: "রিজেক্টেড" },
  { value: "completed", label: "সম্পন্ন" },
];

export default function AdminOrders() {
  const { user, profile, loading } = useAuth();
  const router = useRouter();
  const [orders, setOrders] = useState(null);
  const [filter, setFilter] = useState("");
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

  if (loading || !profile) return null;

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

          {error && <ErrorText>{error}</ErrorText>}
          {orders === null && !error && <Loading />}
          {orders && orders.length === 0 && <div className="empty-state">এই ফিল্টারে কোনো অর্ডার নেই।</div>}

          {orders && orders.map((o) => {
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
                    <div className="muted">{o.memberName} → {o.customerName} ({o.customerPhone}) · ভাউচার মূল্য ৳{o.customerSalePrice || o.orderAmount}</div>
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
