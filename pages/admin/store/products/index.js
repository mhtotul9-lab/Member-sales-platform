import { useEffect, useMemo, useState, useCallback } from "react";
import Nav from "../../../../components/Nav";
import Loading from "../../../../components/Loading";
import StoreAdminTabs from "../../../../components/store/StoreAdminTabs";
import { useStoreAdmin } from "../../../../lib/store/useStoreAdmin";
import { fmtPrice } from "../../../../lib/store/shared";

const STATUS = { active: ["চালু", "stamp-active"], out_of_stock: ["স্টক আউট", "stamp-rejected"], draft: ["ড্রাফট", "stamp-pending"], archived: ["আর্কাইভড", "stamp-pending"] };

export default function StoreProducts() {
  const { ready, api } = useStoreAdmin();
  const [products, setProducts] = useState(null);
  const [error, setError] = useState("");
  const [msg, setMsg] = useState("");
  const [q, setQ] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [sel, setSel] = useState({});
  const [editId, setEditId] = useState(null);
  const [draft, setDraft] = useState({});
  const [busy, setBusy] = useState(false);

  const load = useCallback(() => api("/api/admin/store/products").then((d) => setProducts(d.products)).catch((e) => setError(e.message)), [api]);
  useEffect(() => { if (ready) load(); }, [ready, load]);

  const list = useMemo(() => (products || []).filter((p) => (!statusFilter || p.status === statusFilter) && (!q.trim() || `${p.name} ${p.category}`.toLowerCase().includes(q.trim().toLowerCase()))), [products, q, statusFilter]);
  const ids = Object.keys(sel).filter((k) => sel[k]);

  async function act(fn, ok) {
    setBusy(true); setError(""); setMsg("");
    try { await fn(); setMsg(ok || "হয়েছে ✓"); await load(); } catch (e) { setError(e.message); }
    setBusy(false);
  }

  function openEdit(p) {
    setEditId(editId === p.id ? null : p.id);
    setDraft({ name: p.name, category: p.category || "", price: p.price, comparePrice: p.comparePrice || "", costPrice: p.costPrice ?? "", stock: p.stock ?? "", status: p.status });
  }

  if (!ready) return null;

  return (
    <div className="shell">
      <Nav role="admin" active="store" />
      <div className="container" style={{ maxWidth: 1000 }}>
        <StoreAdminTabs active="products" />
        <div className="card">
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 14, flexWrap: "wrap", gap: 10 }}>
            <h1 style={{ fontSize: "1.25rem", margin: 0 }}>স্টোরের প্রোডাক্ট ({products?.length || 0})</h1>
            <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
              <a href="/admin/store/import" className="btn btn-outline btn-sm">⚡ রিসেলিং থেকে ইম্পোর্ট</a>
              <a href="/admin/store/products/new" className="btn btn-teal btn-sm">+ নতুন প্রোডাক্ট</a>
            </div>
          </div>

          <div style={{ display: "flex", gap: 10, flexWrap: "wrap", marginBottom: 12 }}>
            <input style={{ flex: 1, minWidth: 180 }} value={q} onChange={(e) => setQ(e.target.value)} placeholder="নাম বা ক্যাটাগরি দিয়ে খুঁজুন" />
            <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}>
              <option value="">সব স্ট্যাটাস</option>
              {Object.entries(STATUS).map(([k, v]) => <option key={k} value={k}>{v[0]}</option>)}
            </select>
          </div>

          {ids.length > 0 && (
            <div style={{ display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center", padding: 10, background: "var(--paper)", borderRadius: 10, marginBottom: 12 }}>
              <b>{ids.length}টি বাছাই:</b>
              <button className="btn btn-outline btn-sm" disabled={busy} onClick={() => act(() => api("/api/admin/store/products", { method: "PATCH", body: { ids, action: "activate" } }).then(() => setSel({})), "চালু হয়েছে ✓")}>চালু করুন</button>
              <button className="btn btn-outline btn-sm" disabled={busy} onClick={() => act(() => api("/api/admin/store/products", { method: "PATCH", body: { ids, action: "out_of_stock" } }).then(() => setSel({})), "স্টক আউট করা হয়েছে ✓")}>স্টক আউট</button>
              <button className="btn btn-outline btn-sm" disabled={busy} onClick={() => act(() => api("/api/admin/store/products", { method: "PATCH", body: { ids, action: "draft" } }).then(() => setSel({})), "ড্রাফটে নেওয়া হয়েছে ✓")}>লুকান (ড্রাফট)</button>
              <button className="btn btn-danger btn-sm" disabled={busy} onClick={() => { if (confirm(`${ids.length}টি প্রোডাক্ট মুছে ফেলবেন? (পুরনো অর্ডার ঠিক থাকবে)`)) act(() => api("/api/admin/store/products", { method: "PATCH", body: { ids, action: "delete" } }).then(() => setSel({})), "মুছে ফেলা হয়েছে ✓"); }}>মুছুন</button>
            </div>
          )}

          {msg && <p style={{ color: "var(--teal)", fontWeight: 600 }}>{msg}</p>}
          {error && <p className="error-text">{error}</p>}
          {!products && !error && <Loading />}
          {products && list.length === 0 && <div className="empty-state">{products.length === 0 ? "এখনো কোনো প্রোডাক্ট নেই। “নতুন প্রোডাক্ট” বা “ইম্পোর্ট” চেপে শুরু করুন।" : "কিছু পাওয়া যায়নি।"}</div>}
          {list.length > 0 && <label style={{ display: "flex", gap: 8, alignItems: "center", fontSize: ".85rem", margin: "0 0 6px" }}><input type="checkbox" checked={list.every((p) => sel[p.id])} onChange={(e) => setSel(e.target.checked ? Object.fromEntries(list.map((p) => [p.id, true])) : {})} /> সব বাছুন</label>}

          {list.map((p) => (
            <div key={p.id} style={{ borderBottom: "1px solid var(--line)", padding: "10px 0" }}>
              <div style={{ display: "flex", gap: 10, alignItems: "center", flexWrap: "wrap" }}>
                <input type="checkbox" checked={!!sel[p.id]} onChange={(e) => setSel({ ...sel, [p.id]: e.target.checked })} />
                <div style={{ width: 52, height: 52, borderRadius: 8, overflow: "hidden", background: "#eef1ef", flex: "none" }}>
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  {p.images?.[0] && <img src={p.images[0]} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} />}
                </div>
                <div style={{ flex: 1, minWidth: 150 }}>
                  <div style={{ fontWeight: 600 }}>{p.name}</div>
                  <div className="muted">{p.category || "—"} · স্টক: {p.stock === null || p.stock === undefined ? "সীমাহীন" : p.stock}{p.costPrice ? ` · লাভ ${fmtPrice(p.price - p.costPrice)}` : ""}</div>
                </div>
                <div style={{ textAlign: "right" }}>
                  <div style={{ fontWeight: 700 }}>{fmtPrice(p.price)}</div>
                  <span className={`stamp ${STATUS[p.status]?.[1]}`}>{STATUS[p.status]?.[0] || p.status}</span>
                </div>
                <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                  <button className="btn btn-teal btn-sm" onClick={() => openEdit(p)}>{editId === p.id ? "বন্ধ" : "দ্রুত এডিট"}</button>
                  <a className="btn btn-outline btn-sm" href={`/admin/store/products/${p.id}`}>সম্পূর্ণ এডিট</a>
                  <button className="btn btn-outline btn-sm" disabled={busy} onClick={() => act(() => api(`/api/admin/store/products/${p.id}`, { method: "POST" }), "কপি হয়েছে (ড্রাফট) ✓")}>কপি</button>
                  <button className="btn btn-danger btn-sm" disabled={busy} onClick={() => { if (confirm(`“${p.name}” মুছে ফেলবেন? (পুরনো অর্ডার ঠিক থাকবে)`)) act(() => api(`/api/admin/store/products/${p.id}`, { method: "DELETE" }), "মুছে ফেলা হয়েছে ✓"); }}>মুছুন</button>
                </div>
              </div>

              {editId === p.id && (
                <div style={{ marginTop: 12, padding: 14, background: "var(--paper)", borderRadius: 12 }}>
                  <div className="form-grid-2">
                    <div className="field"><label>নাম</label><input value={draft.name} onChange={(e) => setDraft({ ...draft, name: e.target.value })} /></div>
                    <div className="field"><label>ক্যাটাগরি</label><input value={draft.category} onChange={(e) => setDraft({ ...draft, category: e.target.value })} /></div>
                    <div className="field"><label>বিক্রয় মূল্য (৳)</label><input type="number" value={draft.price} onChange={(e) => setDraft({ ...draft, price: e.target.value })} /></div>
                    <div className="field"><label>আগের দাম (৳)</label><input type="number" value={draft.comparePrice} onChange={(e) => setDraft({ ...draft, comparePrice: e.target.value })} /></div>
                    <div className="field"><label>কেনা দাম (৳)</label><input type="number" value={draft.costPrice} onChange={(e) => setDraft({ ...draft, costPrice: e.target.value })} /></div>
                    <div className="field"><label>স্টক (খালি = সীমাহীন)</label><input type="number" value={draft.stock} onChange={(e) => setDraft({ ...draft, stock: e.target.value })} /></div>
                    <div className="field"><label>স্ট্যাটাস</label>
                      <select value={draft.status} onChange={(e) => setDraft({ ...draft, status: e.target.value })}>
                        <option value="active">চালু</option><option value="out_of_stock">স্টক আউট</option><option value="draft">ড্রাফট</option><option value="archived">আর্কাইভড</option>
                      </select>
                    </div>
                  </div>
                  <p className="muted" style={{ margin: "0 0 10px" }}>ছবি, সাইজ-রং, বিবরণ বদলাতে “সম্পূর্ণ এডিট” চাপুন।</p>
                  <button className="btn btn-teal btn-sm" disabled={busy} onClick={() => act(async () => { await api(`/api/admin/store/products/${p.id}`, { method: "PATCH", body: draft }); setEditId(null); }, "সেভ হয়েছে ✓")}>{busy ? "সেভ হচ্ছে..." : "সেভ করুন"}</button>
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
