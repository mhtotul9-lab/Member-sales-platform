import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/router";
import { useAuth } from "../../../contexts/AuthContext";
import Nav from "../../../components/Nav";
import { ORDER_STATUS_LABELS } from "../../../lib/orderStatus";

export default function MemberOrders() {
  const { user, profile, loading } = useAuth();
  const router = useRouter();
  const [orders, setOrders] = useState(null);
  const [error, setError] = useState("");

  useEffect(() => {
    if (loading) return;
    if (!user) { router.replace("/login"); return; }
    if (!profile || profile.status !== "active") { router.replace("/pending"); return; }
  }, [user, profile, loading, router]);

  const load = useCallback(async () => {
    if (!user) return;
    setError("");
    try {
      const token = await user.getIdToken();
      const res = await fetch("/api/member/orders", { headers: { Authorization: `Bearer ${token}` } });
      const body = await res.json();
      if (!res.ok) throw new Error(body.error || "লোড করা যায়নি।");
      setOrders(body.orders);
    } catch (err) {
      setError(err.message);
    }
  }, [user]);

  useEffect(() => {
    if (profile?.status === "active") load();
  }, [profile, load]);

  if (loading || !profile) return null;

  return (
    <div className="shell">
      <Nav role={profile.role} active="orders" />
      <div className="container">
        <div className="card">
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
            <h1 style={{ fontSize: "1.25rem" }}>আমার অর্ডার</h1>
            <a className="btn btn-primary" href="/member/orders/new">+ নতুন অর্ডার সাবমিট করুন</a>
          </div>

          {error && <p className="error-text">{error}</p>}
          {orders === null && !error && <p className="muted">লোড হচ্ছে...</p>}
          {orders && orders.length === 0 && <div className="empty-state">এখনো কোনো অর্ডার সাবমিট করা হয়নি।</div>}

          {orders && orders.map((o) => {
            const st = ORDER_STATUS_LABELS[o.status] || ORDER_STATUS_LABELS.submitted;
            return (
              <div className="list-row" key={o.id}>
                <div>
                  <div style={{ fontWeight: 600 }}>{o.orderId} <span className="muted">· {o.productName}</span></div>
                  <div className="muted">{o.customerName} · ৳{o.orderAmount} · {new Date(o.createdAt).toLocaleDateString("bn-BD")}</div>
                  {o.status === "rejected" && o.rejectionReason && (
                    <div className="error-text" style={{ marginTop: 4 }}>কারণ: {o.rejectionReason}</div>
                  )}
                </div>
                <span className={`stamp ${st.cls}`}>{st.text}</span>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
