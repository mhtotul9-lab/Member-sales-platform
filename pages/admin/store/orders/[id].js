import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/router";
import Nav from "../../../../components/Nav";
import Loading from "../../../../components/Loading";
import StoreAdminTabs from "../../../../components/store/StoreAdminTabs";
import { useStoreAdmin } from "../../../../lib/store/useStoreAdmin";
import { fmtPrice, ORDER_STATUSES, COURIER_STATUS_TEXT } from "../../../../lib/store/shared";

export default function StoreOrderDetail() {
  const { ready, api } = useStoreAdmin();
  const router = useRouter();
  const { id } = router.query;
  const [o, setO] = useState(null);
  const [blocked, setBlocked] = useState(false);
  const [edit, setEdit] = useState(null);
  const [note, setNote] = useState("");
  const [msg, setMsg] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState("");

  const load = useCallback(async () => {
    try {
      const d = await api(`/api/admin/store/orders/${id}`);
      setO(d.order); setBlocked(!!d.blocked);
      setNote(d.order.adminNote || "");
      setEdit({ ...d.order.customer, qty: d.order.items[0].qty, deliveryCharge: d.order.deliveryCharge });
    } catch (e) { setError(e.message); }
  }, [api, id]);
  useEffect(() => { if (ready && id) load(); }, [ready, id, load]);

  async function run(label, fn) {
    setBusy(label); setError(""); setMsg("");
    try { const r = await fn(); setMsg(r || "হয়েছে ✓"); await load(); } catch (e) { setError(e.message); }
    setBusy("");
  }
  const patch = (body) => api(`/api/admin/store/orders/${id}`, { method: "PATCH", body });

  if (!ready) return null;
  if (!o) return (<div className="shell"><Nav role="admin" active="store" /><div className="container">{error ? <p className="error-text">{error}</p> : <Loading />}</div></div>);

  const it = o.items[0];
  const profit = (it.price - (it.costPrice || 0)) * it.qty;

  return (
    <div className="shell">
      <Nav role="admin" active="store" />
      <div className="container" style={{ maxWidth: 900 }}>
        <StoreAdminTabs active="orders" />
        {msg && <p style={{ color: "var(--teal)", fontWeight: 600 }}>{msg}</p>}
        {error && <p className="error-text" style={{ whiteSpace: "pre-wrap" }}>{error}</p>}

        <div className="card" style={{ marginBottom: 16 }}>
          <div style={{ display: "flex", justifyContent: "space-between", flexWrap: "wrap", gap: 10, alignItems: "center" }}>
            <div>
              <h1 style={{ fontSize: "1.3rem", margin: 0 }}>{o.orderNo}</h1>
              <div className="muted">{new Date(o.createdAt).toLocaleString("bn-BD", { timeZone: "Asia/Dhaka", dateStyle: "long", timeStyle: "short" })}</div>
            </div>
            <span className={`stamp ${ORDER_STATUSES[o.status]?.cls}`}>{ORDER_STATUSES[o.status]?.text}</span>
          </div>

          <div style={{ display: "flex", gap: 14, alignItems: "center", margin: "16px 0", padding: 12, background: "var(--paper)", borderRadius: 10 }}>
            <div style={{ width: 64, height: 64, borderRadius: 8, overflow: "hidden", background: "#eef1ef", flex: "none" }}>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              {it.image && <img src={it.image} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} />}
            </div>
            <div style={{ flex: 1 }}>
              <div style={{ fontWeight: 600 }}>{it.name}</div>
              <div className="muted">{fmtPrice(it.price)} × {it.qty}{it.variant && ` · ${it.variant}`}</div>
              <div className="muted">এলাকা: {o.customer.area === "inside" ? "ঢাকার ভিতরে" : "ঢাকার বাইরে"}</div>
            </div>
            <div style={{ textAlign: "right" }}>
              <div style={{ fontWeight: 800, fontSize: "1.15rem" }}>{fmtPrice(o.total)}</div>
              <div className="muted">ডেলিভারি {fmtPrice(o.deliveryCharge)} সহ</div>
              <div className="muted">পণ্যে লাভ: {fmtPrice(profit)}</div>
            </div>
          </div>

          <h3 style={{ fontSize: "1rem", margin: "0 0 8px" }}>স্ট্যাটাস বদলান</h3>
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
            {Object.entries(ORDER_STATUSES).map(([k, v]) => (
              <button key={k} disabled={!!busy || o.status === k} className={`btn btn-sm ${o.status === k ? "btn-teal" : "btn-outline"}`} onClick={() => run(k, async () => { await patch({ status: k }); })}>{v.text}</button>
            ))}
          </div>
        </div>

        <div className="card" style={{ marginBottom: 16 }}>
          <h2 style={{ fontSize: "1.05rem", marginBottom: 12 }}>কাস্টমারের তথ্য (এডিট করা যায়)</h2>
          <div className="form-grid-2">
            <div className="field"><label>নাম</label><input value={edit.name} onChange={(e) => setEdit({ ...edit, name: e.target.value })} /></div>
            <div className="field"><label>মোবাইল</label><input value={edit.phone} onChange={(e) => setEdit({ ...edit, phone: e.target.value })} /></div>
          </div>
          <div className="field"><label>ঠিকানা</label><textarea rows={2} value={edit.address} onChange={(e) => setEdit({ ...edit, address: e.target.value })} /></div>
          <div className="form-grid-2">
            <div className="field"><label>পরিমাণ</label><input type="number" min="1" value={edit.qty} onChange={(e) => setEdit({ ...edit, qty: e.target.value })} /></div>
            <div className="field"><label>ডেলিভারি চার্জ (৳)</label><input type="number" min="0" value={edit.deliveryCharge} onChange={(e) => setEdit({ ...edit, deliveryCharge: e.target.value })} /></div>
          </div>
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
            <button className="btn btn-primary btn-sm" disabled={!!busy} onClick={() => run("save", async () => { await patch({ customer: { name: edit.name, phone: edit.phone, address: edit.address }, qty: edit.qty, deliveryCharge: edit.deliveryCharge }); })}>সেভ করুন</button>
            <a className="btn btn-outline btn-sm" href={`/admin/store/invoice?id=${id}`} target="_blank" rel="noreferrer">🖨️ ইনভয়েস</a>
            <button className="btn btn-outline btn-sm" style={{ color: blocked ? "var(--teal)" : "var(--red)" }} disabled={!!busy} onClick={() => run("block", async () => { if (!blocked && !confirm("এই নাম্বার থেকে আর অর্ডার নেওয়া হবে না। ব্লক করবেন?")) throw new Error("বাতিল করা হয়েছে।"); await api("/api/admin/store/block", { method: "POST", body: { phone: o.customer.phone, block: !blocked } }); return blocked ? "আনব্লক হয়েছে ✓" : "ব্লক হয়েছে ✓"; })}>{blocked ? "✔ আনব্লক করুন" : "🚫 নাম্বার ব্লক"}</button>
            <a className="btn btn-outline btn-sm" href={`tel:${o.customer.phone}`}>📞 কল</a>
            <a className="btn btn-outline btn-sm" target="_blank" rel="noreferrer" href={`https://wa.me/88${o.customer.phone}`}>💬 WhatsApp</a>
          </div>
        </div>

        <div className="card" style={{ marginBottom: 16 }}>
          <h2 style={{ fontSize: "1.05rem", marginBottom: 10 }}>Steadfast কুরিয়ার</h2>
          {!o.courier ? (
            <>
              <p className="muted" style={{ marginBottom: 12 }}>নাম, ঠিকানা আর মোট ৳{o.total} (COD) সহ অর্ডারটি Steadfast এ পাঠানো হবে। পাঠানোর আগে উপরের তথ্য ঠিক আছে কিনা দেখে নিন।</p>
              <button className="btn btn-teal" disabled={!!busy || ["cancelled", "returned", "delivered"].includes(o.status)} onClick={() => run("send", async () => { if (!confirm("Steadfast এ পাঠাবেন?")) throw new Error("বাতিল করা হয়েছে।"); const r = await api("/api/admin/store/steadfast", { method: "POST", body: { action: "send", orderId: id } }); return `পাঠানো হয়েছে — Tracking: ${r.courier.trackingCode}`; })}>{busy === "send" ? "পাঠানো হচ্ছে..." : "🚚 Steadfast এ পাঠান"}</button>
            </>
          ) : (
            <>
              <div style={{ lineHeight: 1.9 }}>
                <div>Consignment ID: <b>{o.courier.consignmentId}</b></div>
                <div>Tracking Code: <b>{o.courier.trackingCode}</b> {o.courier.trackingCode && <a href={`https://steadfast.com.bd/t/${o.courier.trackingCode}`} target="_blank" rel="noreferrer">(ট্র্যাক করুন ↗)</a>}</div>
                <div>কুরিয়ার স্ট্যাটাস: <b>{COURIER_STATUS_TEXT[o.courier.status] || o.courier.status}</b></div>
              </div>
              <button className="btn btn-outline btn-sm" style={{ marginTop: 10 }} disabled={!!busy} onClick={() => run("status", async () => { const r = await api("/api/admin/store/steadfast", { method: "POST", body: { action: "status", orderId: id } }); return `কুরিয়ার স্ট্যাটাস: ${COURIER_STATUS_TEXT[r.status] || r.status}`; })}>{busy === "status" ? "চেক হচ্ছে..." : "🔄 স্ট্যাটাস আপডেট করুন"}</button>
            </>
          )}
        </div>

        <div className="card" style={{ marginBottom: 16 }}>
          <h2 style={{ fontSize: "1.05rem", marginBottom: 10 }}>অ্যাডমিন নোট (শুধু আপনি দেখবেন)</h2>
          <div className="field"><textarea rows={2} value={note} onChange={(e) => setNote(e.target.value)} placeholder="যেমন: কাস্টমার বলেছে শুক্রবার দিতে" /></div>
          <button className="btn btn-outline btn-sm" disabled={!!busy} onClick={() => run("note", async () => { await patch({ adminNote: note }); })}>নোট সেভ করুন</button>
        </div>

        <div className="card">
          <h2 style={{ fontSize: "1.05rem", marginBottom: 10 }}>অর্ডারের ইতিহাস</h2>
          {(o.history || []).slice().reverse().map((h, i) => (
            <div key={i} className="muted" style={{ padding: "5px 0", borderBottom: "1px solid var(--line)" }}>
              {new Date(h.at).toLocaleString("bn-BD", { timeZone: "Asia/Dhaka", dateStyle: "medium", timeStyle: "short" })} — {h.text}{h.by ? ` (${h.by})` : ""}
            </div>
          ))}
          {o.meta?.referrer && <p className="muted" style={{ marginTop: 10, wordBreak: "break-all" }}>কোথা থেকে এসেছে: {o.meta.referrer}</p>}
          <button className="btn btn-danger btn-sm" style={{ marginTop: 14 }} onClick={async () => { if (confirm("অর্ডারটি পুরোপুরি মুছে ফেলবেন? এটা ফেরানো যাবে না। (শুধু ভুয়া/টেস্ট অর্ডারের জন্য)")) { await api(`/api/admin/store/orders/${id}`, { method: "DELETE" }); router.push("/admin/store/orders"); } }}>অর্ডার ডিলিট</button>
        </div>
      </div>
    </div>
  );
}
