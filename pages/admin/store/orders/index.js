import { useEffect, useState, useMemo, useCallback } from "react";
import Nav from "../../../../components/Nav";
import Loading from "../../../../components/Loading";
import StoreAdminTabs from "../../../../components/store/StoreAdminTabs";
import { useStoreAdmin } from "../../../../lib/store/useStoreAdmin";
import { fmtPrice, ORDER_STATUSES, COURIER_STATUS_TEXT } from "../../../../lib/store/shared";

export default function StoreOrders() {
  const { ready, api } = useStoreAdmin();
  const [orders, setOrders] = useState(null);
  const [filter, setFilter] = useState("");
  const [q, setQ] = useState("");
  const [error, setError] = useState("");
  const [exportFrom, setExportFrom] = useState("");
  const [exportTo, setExportTo] = useState("");

  const load = useCallback(() => api("/api/admin/store/orders").then((d) => setOrders(d.orders)).catch((e) => setError(e.message)), [api]);
  useEffect(() => { if (ready) load(); }, [ready, load]);

  const list = useMemo(() => (orders || []).filter((o) => (!filter || o.status === filter) && (!q.trim() || `${o.orderNo} ${o.customer.name} ${o.customer.phone}`.toLowerCase().includes(q.trim().toLowerCase()))), [orders, filter, q]);

  async function exportCsv() {
    try {
      const params = new URLSearchParams({ status: "delivered" });
      if (exportFrom) params.set("from", exportFrom);
      if (exportTo) params.set("to", exportTo);
      const res = await api(`/api/admin/store/export?${params}`, { raw: true });
      const blob = await res.blob();
      const a = document.createElement("a");
      a.href = URL.createObjectURL(blob);
      a.download = `jolrasi-store-orders.csv`;
      a.click();
    } catch (e) { setError(e.message); }
  }

  if (!ready) return null;
  const counts = {};
  (orders || []).forEach((o) => { counts[o.status] = (counts[o.status] || 0) + 1; });

  return (
    <div className="shell">
      <Nav role="admin" active="store" />
      <div className="container" style={{ maxWidth: 1000 }}>
        <StoreAdminTabs active="orders" />
        <div className="card">
          <h1 style={{ fontSize: "1.25rem", marginBottom: 14 }}>স্টোরের অর্ডার</h1>
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 12 }}>
            <button className={`btn btn-sm ${!filter ? "btn-teal" : "btn-outline"}`} onClick={() => setFilter("")}>সব ({orders?.length || 0})</button>
            {Object.entries(ORDER_STATUSES).map(([k, v]) => (
              <button key={k} className={`btn btn-sm ${filter === k ? "btn-teal" : "btn-outline"}`} onClick={() => setFilter(k)}>{v.text} ({counts[k] || 0})</button>
            ))}
          </div>
          <div className="field"><input value={q} onChange={(e) => setQ(e.target.value)} placeholder="অর্ডার নাম্বার, নাম বা মোবাইল দিয়ে খুঁজুন" /></div>
          {error && <p className="error-text">{error}</p>}
          {!orders && !error && <Loading />}
          {orders && list.length === 0 && <div className="empty-state">কোনো অর্ডার নেই।</div>}
          {list.map((o) => (
            <a key={o.id} href={`/admin/store/orders/${o.id}`} className="list-row" style={{ textDecoration: "none", color: "inherit", gap: 12, flexWrap: "wrap" }}>
              <div style={{ minWidth: 0 }}>
                <div style={{ fontWeight: 700 }}>{o.orderNo} <span className={`stamp ${ORDER_STATUSES[o.status]?.cls}`} style={{ marginLeft: 6 }}>{ORDER_STATUSES[o.status]?.text || o.status}</span></div>
                <div>{o.customer.name} · {o.customer.phone}{o.phoneOrderCount > 1 && <span style={{ color: "var(--gold)", fontWeight: 600 }}> · {o.phoneOrderCount}টি অর্ডার</span>}</div>
                <div className="muted">{o.items[0].name} × {o.items[0].qty} · {new Date(o.createdAt).toLocaleString("bn-BD", { timeZone: "Asia/Dhaka", dateStyle: "medium", timeStyle: "short" })}{o.courier && ` · কুরিয়ার: ${COURIER_STATUS_TEXT[o.courier.status] || o.courier.status}`}</div>
              </div>
              <div style={{ fontWeight: 800 }}>{fmtPrice(o.total)}</div>
            </a>
          ))}
        </div>

        <div className="card" style={{ marginTop: 16 }}>
          <h2 style={{ fontSize: "1.05rem", marginBottom: 6 }}>Cash-Flow এ হিসাব পাঠান (এক্সেল/CSV)</h2>
          <p className="muted" style={{ marginBottom: 12 }}>ডেলিভার্ড অর্ডারগুলো Cash-Flow এর “এক্সেল আপলোড” যে ফরম্যাট চায়, ঠিক সেই ফরম্যাটে ডাউনলোড হবে। ডাউনলোড করা ফাইলটা Cash-Flow → অর্ডার → এক্সেল আপলোডে দিন।</p>
          <div style={{ display: "flex", gap: 10, flexWrap: "wrap", alignItems: "flex-end" }}>
            <div className="field" style={{ margin: 0 }}><label>শুরুর তারিখ</label><input type="date" value={exportFrom} onChange={(e) => setExportFrom(e.target.value)} /></div>
            <div className="field" style={{ margin: 0 }}><label>শেষ তারিখ</label><input type="date" value={exportTo} onChange={(e) => setExportTo(e.target.value)} /></div>
            <button className="btn btn-outline" onClick={exportCsv}>⬇ CSV ডাউনলোড</button>
          </div>
        </div>
      </div>
    </div>
  );
}
