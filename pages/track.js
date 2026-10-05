import { useEffect, useState } from "react";
import StoreLayout from "../components/store/StoreLayout";
import { getStoreSettings, publicSettings } from "../lib/storefront";
import { ORDER_STATUS_LABELS } from "../lib/orderStatus";
import { taka } from "../components/store/ProductCard";

export async function getServerSideProps() {
  return { props: { settings: publicSettings(await getStoreSettings()) } };
}

export default function Track({ settings }) {
  const [orderId, setOrderId] = useState("");
  const [phone, setPhone] = useState("");
  const [order, setOrder] = useState(null);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => { const o = new URLSearchParams(location.search).get("o"); if (o) setOrderId(o); }, []);

  async function submit(e) {
    e.preventDefault();
    setBusy(true); setError(""); setOrder(null);
    try {
      const res = await fetch("/api/public/track", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ orderId, phone }) });
      const body = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(body.error || "খুঁজে পাওয়া যায়নি।");
      setOrder(body.order);
    } catch (err) { setError(err.message); } finally { setBusy(false); }
  }

  const label = (s) => (ORDER_STATUS_LABELS[s] || { text: s }).text;

  return (
    <StoreLayout settings={settings} title="অর্ডার ট্র্যাক">
      <div className="st-wrap st-narrow">
        <h1 className="st-h2">অর্ডার ট্র্যাক করুন</h1>
        <form className="st-form" onSubmit={submit}>
          <label>অর্ডার নম্বর<input value={orderId} onChange={(e) => setOrderId(e.target.value)} placeholder="ORD-20260101-0001" /></label>
          <label>মোবাইল নম্বর<input value={phone} onChange={(e) => setPhone(e.target.value)} type="tel" inputMode="numeric" placeholder="01XXXXXXXXX" /></label>
          {error && <p className="st-error" role="alert">{error}</p>}
          <button className="st-btn st-btn-block" disabled={busy}>{busy ? "খোঁজা হচ্ছে…" : "ট্র্যাক করুন"}</button>
        </form>
        {order && (
          <div className="st-form st-result">
            <h2>{order.orderId}</h2>
            <p>{order.productName} · {taka(order.total)}</p>
            <p className="st-status">বর্তমান অবস্থা: <b>{label(order.status)}</b></p>
            {order.trackingId && <p>কুরিয়ার: {order.courierName || "—"} · ট্র্যাকিং আইডি: <b>{order.trackingId}</b></p>}
            <ul className="st-timeline">
              {order.timeline.slice().reverse().map((t, i) => (
                <li key={i}><b>{label(t.status)}</b><span>{new Date(t.at).toLocaleString("bn-BD")}</span></li>
              ))}
            </ul>
          </div>
        )}
      </div>
    </StoreLayout>
  );
}
