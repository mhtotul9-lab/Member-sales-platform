import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/router";
import { useAuth } from "../../../contexts/AuthContext";
import Nav from "../../../components/Nav";
import { ORDER_STATUS_LABELS, RISK_FLAG_LABELS } from "../../../lib/orderStatus";
import Loading from "../../../components/Loading";
import ErrorText from "../../../components/ErrorText";

const ACTIONS = [
  { status: "under_review", label: "রিভিউতে নিন", cls: "btn-outline" },
  { status: "approved", label: "অ্যাপ্রুভ করুন", cls: "btn-teal" },
  { status: "rejected", label: "রিজেক্ট করুন", cls: "btn-danger", needsReason: true },
  { status: "processing", label: "প্রসেসিং", cls: "btn-outline" },
  { status: "delivered", label: "ডেলিভার্ড", cls: "btn-outline" },
  { status: "completed", label: "সম্পন্ন করুন", cls: "btn-teal" },
  { status: "cancelled", label: "বাতিল করুন", cls: "btn-danger", needsReason: true },
  { status: "returned", label: "রিটার্ন", cls: "btn-danger", needsReason: true },
  { status: "refunded", label: "রিফান্ড", cls: "btn-danger", needsReason: true },
];

export default function AdminOrderDetail() {
  const { user, profile, loading } = useAuth();
  const router = useRouter();
  const { id } = router.query;
  const [order, setOrder] = useState(null);
  const [error, setError] = useState("");
  const [acting, setActing] = useState(null);
  const [reasonPrompt, setReasonPrompt] = useState(null);
  const [reasonText, setReasonText] = useState("");

  useEffect(() => {
    if (loading) return;
    if (!user) { router.replace("/login"); return; }
    if (!profile || profile.status !== "active") { router.replace("/pending"); return; }
    if (profile.role !== "admin") { router.replace("/member/dashboard"); return; }
  }, [user, profile, loading, router]);

  const load = useCallback(async () => {
    if (!user || !id) return;
    setError("");
    try {
      const token = await user.getIdToken();
      const res = await fetch(`/api/admin/orders/${id}`, { headers: { Authorization: `Bearer ${token}` } });
      const body = await res.json();
      if (!res.ok) throw new Error(body.error || "লোড করা যায়নি।");
      setOrder(body.order);
    } catch (err) {
      setError(err.message);
    }
  }, [user, id]);

  useEffect(() => { load(); }, [load]);

  async function applyStatus(status, reason) {
    setActing(status);
    setError("");
    try {
      const token = await user.getIdToken();
      const res = await fetch(`/api/admin/orders/${id}/status`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ status, reason }),
      });
      const body = await res.json();
      if (!res.ok) throw new Error(body.error || "আপডেট করা যায়নি।");
      setReasonPrompt(null);
      setReasonText("");
      await load();
    } catch (err) {
      setError(err.message);
    } finally {
      setActing(null);
    }
  }

  function handleAction(action) {
    if (action.needsReason) {
      setReasonPrompt(action.status);
    } else {
      applyStatus(action.status, null);
    }
  }

  if (loading || !profile) return null;

  return (
    <div className="shell">
      <Nav role="admin" active="orders" />
      <div className="container" style={{ maxWidth: 680 }}>
        {error && <ErrorText>{error}</ErrorText>}
        {!order && !error && <Loading />}

        {order && (
          <>
            <div className="card" style={{ marginBottom: 20 }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
                <div style={{ display: "flex", gap: 14 }}>
                  {order.productImageUrl && (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={order.productImageUrl}
                      alt={order.productName}
                      style={{ width: 64, height: 64, objectFit: "cover", borderRadius: 10, flexShrink: 0, border: "1px solid var(--line)" }}
                    />
                  )}
                  <div>
                    <h1 style={{ fontSize: "1.2rem", marginBottom: 4 }}>{order.orderId}</h1>
                    <p className="muted">{new Date(order.createdAt).toLocaleString("bn-BD")}</p>
                  </div>
                </div>
                <span className={`stamp ${(ORDER_STATUS_LABELS[order.status] || {}).cls || "stamp-pending"}`}>
                  {(ORDER_STATUS_LABELS[order.status] || {}).text || order.status}
                </span>
              </div>

              {order.riskFlags?.length > 0 && (
                <div style={{ marginTop: 14 }}>
                  {order.riskFlags.map((f) => (
                    <span key={f} className="stamp stamp-pending" style={{ marginRight: 6 }}>⚠ {RISK_FLAG_LABELS[f] || f}</span>
                  ))}
                </div>
              )}

              <hr style={{ border: "none", borderTop: "1px solid var(--line)", margin: "18px 0" }} />

              <div className="form-grid-2" style={{ fontSize: "0.94rem" }}>
                <div><span className="muted">মেম্বার:</span> {order.memberName}</div>
                <div><span className="muted">প্রোডাক্ট:</span> {order.productName} × {order.quantity}</div>
                <div><span className="muted">অর্ডার মূল্য (ক্যাটালগ):</span> ৳{order.orderAmount}</div>
                <div><span className="muted">ভাউচারে যা লিখবেন:</span> <b>৳{order.customerSalePrice || order.orderAmount}</b></div>
                <div><span className="muted">কোম্পানি প্রফিট:</span> ৳{order.profitAtOrder}</div>
                <div><span className="muted">মেম্বার কমিশন:</span> ৳{order.commissionAtOrder || 0}</div>
                <div><span className="muted">মার্কেটিং সোর্স:</span> {order.marketingSource}</div>
                <div><span className="muted">কাস্টমার:</span> {order.customerName}</div>
                <div><span className="muted">ফোন:</span> {order.customerPhone}</div>
                {order.customerWhatsapp && <div><span className="muted">হোয়াটসঅ্যাপ:</span> {order.customerWhatsapp}</div>}
                {order.customerAddress && <div><span className="muted">ঠিকানা:</span> {order.customerAddress}</div>}
              </div>

              {order.proofUrl && (
                <p style={{ marginTop: 14 }}>
                  <a className="btn btn-outline btn-sm" href={order.proofUrl} target="_blank" rel="noreferrer">প্রুফ দেখুন</a>
                </p>
              )}
              {order.notes && <p className="muted" style={{ marginTop: 14 }}>নোট: {order.notes}</p>}
            </div>

            <div className="card" style={{ marginBottom: 20 }}>
              <h2 style={{ fontSize: "1.05rem", marginBottom: 14 }}>অ্যাকশন</h2>

              {reasonPrompt && (
                <div style={{ marginBottom: 16 }}>
                  <div className="field">
                    <label>কারণ লিখুন</label>
                    <textarea rows={2} value={reasonText} onChange={(e) => setReasonText(e.target.value)} />
                  </div>
                  <div style={{ display: "flex", gap: 8 }}>
                    <button className="btn btn-danger btn-sm" disabled={acting} onClick={() => applyStatus(reasonPrompt, reasonText)}>
                      নিশ্চিত করুন
                    </button>
                    <button className="btn btn-outline btn-sm" onClick={() => { setReasonPrompt(null); setReasonText(""); }}>
                      বাতিল
                    </button>
                  </div>
                </div>
              )}

              <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                {ACTIONS.map((a) => (
                  <button
                    key={a.status}
                    className={`btn ${a.cls} btn-sm`}
                    disabled={acting !== null || order.status === a.status}
                    onClick={() => handleAction(a)}
                  >
                    {a.label}
                  </button>
                ))}
              </div>
            </div>

            <div className="card">
              <h2 style={{ fontSize: "1.05rem", marginBottom: 14 }}>টাইমলাইন</h2>
              {(order.timeline || []).slice().reverse().map((t, i) => (
                <div key={i} className="list-row">
                  <span className={`stamp ${(ORDER_STATUS_LABELS[t.status] || {}).cls || "stamp-pending"}`}>
                    {(ORDER_STATUS_LABELS[t.status] || {}).text || t.status}
                  </span>
                  <span className="muted">{new Date(t.at).toLocaleString("bn-BD")}</span>
                </div>
              ))}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
