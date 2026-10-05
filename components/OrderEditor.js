import { useState } from "react";
import ErrorText from "./ErrorText";

const tk = (n) => "৳" + Number(n || 0).toLocaleString("bn-BD");
const esc = (s) => String(s ?? "").replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));

function printInvoice(o) {
  const w = window.open("", "_blank", "width=720,height=900");
  if (!w) return;
  const total = o.totalPayable ?? o.customerSalePrice ?? o.orderAmount;
  w.document.write(`<html><head><meta charset="utf-8"><title>${esc(o.orderId)}</title><style>body{font-family:'Hind Siliguri',sans-serif;padding:28px;color:#12213B}table{width:100%;border-collapse:collapse;margin:16px 0}td,th{border:1px solid #ccc;padding:8px;text-align:left}h1{margin:0}</style></head><body>
  <h1>ইনভয়েস — ${esc(o.orderId)}</h1><p>${new Date(o.createdAt).toLocaleString("bn-BD")}</p>
  <p><b>${esc(o.customerName)}</b><br>${esc(o.customerPhone)}<br>${esc(o.customerAddress)}</p>
  <table><tr><th>প্রোডাক্ট</th><th>পরিমাণ</th><th>দাম</th></tr><tr><td>${esc(o.productName)}</td><td>${o.quantity}</td><td>${tk(o.orderAmount)}</td></tr>
  <tr><td colspan="2">ডেলিভারি চার্জ</td><td>${tk(o.deliveryCharge)}</td></tr><tr><td colspan="2"><b>মোট (ক্যাশ অন ডেলিভারি)</b></td><td><b>${tk(total)}</b></td></tr></table>
  <script>window.onload=()=>window.print()</script></body></html>`);
  w.document.close();
}

export default function OrderEditor({ order, user, onSaved }) {
  const web = order.source === "website";
  const [f, setF] = useState({
    customerName: order.customerName || "", customerPhone: order.customerPhone || "", customerAddress: order.customerAddress || "",
    quantity: String(order.quantity || 1), deliveryCharge: String(order.deliveryCharge || 0),
    courierName: order.courierName || "", trackingId: order.trackingId || "", adminNote: order.adminNote || "",
  });
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState("");
  const [error, setError] = useState("");
  const [sfBusy, setSfBusy] = useState("");
  const set = (k) => (e) => setF((x) => ({ ...x, [k]: e.target.value }));
  const phone = String(order.customerPhone || "").replace(/\D/g, "");
  const intl = phone.startsWith("0") ? "88" + phone : phone;
  const src = order.trafficSource || {};

  async function steadfast(action) {
    setSfBusy(action); setError(""); setMsg("");
    try {
      const token = await user.getIdToken();
      const res = await fetch(`/api/admin/orders/${order.id}/steadfast?action=${action}`, { method: "POST", headers: { Authorization: `Bearer ${token}` } });
      const body = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(body.error || "Steadfast-এর সাথে যোগাযোগ করা যায়নি।");
      setMsg(action === "send" ? `Steadfast-এ পাঠানো হয়েছে ✓ (ট্র্যাকিং: ${body.trackingId})` : `স্ট্যাটাস: ${body.steadfastStatus}`);
      onSaved && onSaved();
    } catch (err) { setError(err.message); } finally { setSfBusy(""); }
  }

  async function save(e) {
    e.preventDefault();
    setBusy(true); setError(""); setMsg("");
    try {
      const token = await user.getIdToken();
      const res = await fetch(`/api/admin/orders/${order.id}/update`, {
        method: "POST", headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` }, body: JSON.stringify(f),
      });
      const body = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(body.error || "সেভ করা যায়নি।");
      setMsg("সেভ হয়েছে ✓");
      onSaved && onSaved();
    } catch (err) { setError(err.message); } finally { setBusy(false); }
  }

  return (
    <div className="card" style={{ marginBottom: 20 }}>
      <div style={{ display: "flex", justifyContent: "space-between", flexWrap: "wrap", gap: 8, marginBottom: 14 }}>
        <h2 style={{ fontSize: "1.05rem" }}>{web ? "🌐 ওয়েবসাইট অর্ডার — ম্যানেজ করুন" : "অর্ডার তথ্য এডিট"}</h2>
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
          <a className="btn btn-outline btn-sm" href={`tel:${phone}`}>📞 কল</a>
          <a className="btn btn-outline btn-sm" href={`https://wa.me/${intl}`} target="_blank" rel="noreferrer">হোয়াটসঅ্যাপ</a>
          <button type="button" className="btn btn-outline btn-sm" onClick={() => printInvoice(order)}>🖨 ইনভয়েস</button>
        </div>
      </div>

      {web && (
        <p className="muted" style={{ fontSize: "0.88rem", marginBottom: 14 }}>
          মোট প্রদেয় (COD): <b>{tk(order.totalPayable ?? order.orderAmount)}</b> (পণ্য {tk(order.orderAmount)} + ডেলিভারি {tk(order.deliveryCharge)})
          {(src.utm_source || src.utm_campaign || src.fbclid) && <> · ট্রাফিক: {src.utm_source || "—"}{src.utm_campaign ? ` / ${src.utm_campaign}` : ""}{src.fbclid ? " (Facebook Ads)" : ""}</>}
        </p>
      )}

      {web && (
        <div style={{ background: "var(--paper)", border: "1px solid var(--line)", borderRadius: 10, padding: 12, marginBottom: 14 }}>
          <b style={{ fontSize: "0.92rem" }}>🚚 Steadfast কুরিয়ার</b>
          {order.steadfastConsignmentId ? (
            <p className="muted" style={{ margin: "6px 0 10px", fontSize: "0.88rem" }}>
              কনসাইনমেন্ট: {order.steadfastConsignmentId} · ট্র্যাকিং: <b>{order.trackingId}</b> · স্ট্যাটাস: <b>{order.steadfastStatus || "—"}</b>
            </p>
          ) : (
            <p className="muted" style={{ margin: "6px 0 10px", fontSize: "0.88rem" }}>COD ৳{order.totalPayable ?? order.orderAmount} সহ পার্সেল তৈরি হবে। পাঠানোর আগে নাম, ফোন ও ঠিকানা ঠিক আছে কিনা দেখে নিন।</p>
          )}
          {order.steadfastConsignmentId ? (
            <button type="button" className="btn btn-outline btn-sm" disabled={!!sfBusy} onClick={() => steadfast("refresh")}>{sfBusy ? "দেখা হচ্ছে…" : "স্ট্যাটাস রিফ্রেশ"}</button>
          ) : (
            <button type="button" className="btn btn-teal btn-sm" disabled={!!sfBusy} onClick={() => window.confirm("Steadfast-এ পার্সেল পাঠাবেন?") && steadfast("send")}>{sfBusy ? "পাঠানো হচ্ছে…" : "Steadfast-এ পাঠান"}</button>
          )}
        </div>
      )}

      <form onSubmit={save}>
        <div className="form-grid-2">
          <div className="field"><label>কাস্টমারের নাম</label><input value={f.customerName} onChange={set("customerName")} /></div>
          <div className="field"><label>মোবাইল নম্বর</label><input value={f.customerPhone} onChange={set("customerPhone")} /></div>
          {web && <div className="field"><label>পরিমাণ</label><input type="number" min="1" max="99" value={f.quantity} onChange={set("quantity")} /></div>}
          {web && <div className="field"><label>ডেলিভারি চার্জ (৳)</label><input type="number" min="0" value={f.deliveryCharge} onChange={set("deliveryCharge")} /></div>}
          <div className="field"><label>কুরিয়ার</label><input value={f.courierName} onChange={set("courierName")} placeholder="Steadfast / Pathao / RedX…" /></div>
          <div className="field"><label>ট্র্যাকিং / কনসাইনমেন্ট আইডি</label><input value={f.trackingId} onChange={set("trackingId")} /></div>
        </div>
        <div className="field"><label>ঠিকানা</label><textarea rows={2} value={f.customerAddress} onChange={set("customerAddress")} /></div>
        <div className="field"><label>অ্যাডমিন নোট (শুধু আপনি দেখবেন)</label><textarea rows={2} value={f.adminNote} onChange={set("adminNote")} /></div>
        {error && <ErrorText>{error}</ErrorText>}
        <button className="btn btn-primary btn-sm" disabled={busy}>{busy ? "সেভ হচ্ছে…" : "পরিবর্তন সেভ করুন"}</button>
        {msg && <span className="muted" style={{ marginLeft: 12 }}>{msg}</span>}
      </form>
    </div>
  );
}
