import { useEffect, useState } from "react";
import { useRouter } from "next/router";
import { useStoreAdmin } from "../../../lib/store/useStoreAdmin";
import { fmtPrice } from "../../../lib/store/shared";

// প্যাকিং/ইনভয়েস স্লিপ — Ctrl+P চেপে প্রিন্ট বা PDF করুন।
export default function Invoice() {
  const { ready, api } = useStoreAdmin();
  const { id } = useRouter().query;
  const [o, setO] = useState(null);
  const [name, setName] = useState("জলরাশি");
  useEffect(() => {
    if (!ready || !id) return;
    api(`/api/admin/store/orders/${id}`).then((d) => setO(d.order));
    api("/api/admin/store/settings").then((d) => setName(d.settings.storeName));
  }, [ready, id, api]);
  if (!o) return <p style={{ padding: 24 }}>লোড হচ্ছে...</p>;
  const it = o.items[0];
  return (
    <div style={{ maxWidth: 560, margin: "20px auto", padding: 24, border: "1px solid #ccc", fontFamily: "var(--font-body), sans-serif" }}>
      <div style={{ display: "flex", justifyContent: "space-between", borderBottom: "2px solid #000", paddingBottom: 10 }}>
        <h2 style={{ margin: 0 }}>{name}</h2><div style={{ textAlign: "right" }}><b>{o.orderNo}</b><div>{new Date(o.createdAt).toLocaleDateString("bn-BD", { timeZone: "Asia/Dhaka" })}</div></div>
      </div>
      <p style={{ lineHeight: 1.8 }}><b>প্রাপক:</b> {o.customer.name}<br /><b>মোবাইল:</b> {o.customer.phone}<br /><b>ঠিকানা:</b> {o.customer.address}</p>
      <table style={{ width: "100%", borderCollapse: "collapse" }}>
        <tbody>
          <tr style={{ borderBottom: "1px solid #ddd" }}><td style={{ padding: 8 }}>{it.name}{it.variant && <><br /><small>{it.variant}</small></>}</td><td>× {it.qty}</td><td style={{ textAlign: "right" }}>{fmtPrice(it.price * it.qty)}</td></tr>
          <tr><td colSpan={2} style={{ padding: 8 }}>ডেলিভারি চার্জ</td><td style={{ textAlign: "right" }}>{fmtPrice(o.deliveryCharge)}</td></tr>
          <tr style={{ borderTop: "2px solid #000", fontWeight: 800, fontSize: "1.15rem" }}><td colSpan={2} style={{ padding: 8 }}>কুরিয়ারে নেবেন (COD)</td><td style={{ textAlign: "right" }}>{fmtPrice(o.total)}</td></tr>
        </tbody>
      </table>
      <button className="no-print" onClick={() => window.print()} style={{ marginTop: 18, padding: "10px 20px" }}>🖨️ প্রিন্ট</button>
      <style>{`@media print { .no-print { display: none; } }`}</style>
    </div>
  );
}
