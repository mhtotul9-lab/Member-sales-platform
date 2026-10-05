import { useEffect, useState } from "react";
import Nav from "../../../components/Nav";
import Loading from "../../../components/Loading";
import StoreAdminTabs from "../../../components/store/StoreAdminTabs";
import { useStoreAdmin } from "../../../lib/store/useStoreAdmin";
import { fmtPrice, ORDER_STATUSES } from "../../../lib/store/shared";

function Stat({ label, value, accent }) {
  return (
    <div className="card" style={{ padding: 18 }}>
      <div className="muted">{label}</div>
      <div style={{ fontSize: "1.5rem", fontWeight: 800, fontFamily: "var(--font-display)", color: accent ? `var(--${accent})` : undefined }}>{value}</div>
    </div>
  );
}

export default function StoreOverview() {
  const { ready, api } = useStoreAdmin();
  const [d, setD] = useState(null);
  const [error, setError] = useState("");
  const [balance, setBalance] = useState("");

  useEffect(() => { if (ready) api("/api/admin/store/overview").then(setD).catch((e) => setError(e.message)); }, [ready, api]);
  if (!ready) return null;

  async function checkBalance() {
    setBalance("...");
    try { const r = await api("/api/admin/store/steadfast", { method: "POST", body: { action: "balance" } }); setBalance(fmtPrice(r.balance)); } catch (e) { setBalance(""); setError(e.message); }
  }

  return (
    <div className="shell">
      <Nav role="admin" active="store" />
      <div className="container" style={{ maxWidth: 1000 }}>
        <StoreAdminTabs active="overview" />
        {error && <p className="error-text" style={{ whiteSpace: "pre-wrap" }}>{error}</p>}
        {!d && !error && <Loading />}
        {d && (
          <>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: 14, marginBottom: 16 }}>
              <Stat label="আজকের অর্ডার" value={d.todayCount} accent="teal" />
              <Stat label="আজকের অর্ডার মূল্য" value={fmtPrice(d.todayValue)} />
              <Stat label="নতুন (কনফার্ম বাকি)" value={d.counts.new || 0} accent="gold" />
              <Stat label="কুরিয়ারে আছে" value={d.counts.shipped || 0} />
              <Stat label="ডেলিভার্ড আয়" value={fmtPrice(d.deliveredRevenue)} accent="teal" />
              <Stat label="ডেলিভার্ড থেকে লাভ (পণ্যে)" value={fmtPrice(d.deliveredProfit)} accent="teal" />
            </div>

            <div className="card" style={{ marginBottom: 16 }}>
              <h2 style={{ fontSize: "1.05rem", marginBottom: 12 }}>অর্ডার স্ট্যাটাস</h2>
              <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                {Object.entries(ORDER_STATUSES).map(([k, v]) => <a key={k} href="/admin/store/orders" className={`stamp ${v.cls}`} style={{ textDecoration: "none" }}>{v.text}: {d.counts[k] || 0}</a>)}
              </div>
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(300px, 1fr))", gap: 16, marginBottom: 16 }}>
              <div className="card">
                <h2 style={{ fontSize: "1.05rem", marginBottom: 8 }}>সবচেয়ে বেশি বিক্রি</h2>
                {d.topProducts.length === 0 && <p className="muted">এখনো ডেটা নেই।</p>}
                {d.topProducts.map((p) => <div key={p.name} className="list-row"><span>{p.name}</span><b>{p.qty}টি · {fmtPrice(p.revenue)}</b></div>)}
              </div>
              <div className="card">
                <h2 style={{ fontSize: "1.05rem", marginBottom: 8 }}>সাম্প্রতিক অর্ডার</h2>
                {d.recent.length === 0 && <p className="muted">এখনো কোনো অর্ডার আসেনি।</p>}
                {d.recent.map((o) => <a key={o.id} href={`/admin/store/orders/${o.id}`} className="list-row" style={{ textDecoration: "none", color: "inherit" }}><span>{o.customer.name}<br /><span className="muted">{o.orderNo}</span></span><b>{fmtPrice(o.total)}</b></a>)}
              </div>
            </div>

            <div className="card">
              <h2 style={{ fontSize: "1.05rem", marginBottom: 8 }}>Steadfast ব্যালেন্স</h2>
              <button className="btn btn-outline btn-sm" onClick={checkBalance}>ব্যালেন্স দেখুন</button> <b style={{ marginLeft: 10 }}>{balance}</b>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
