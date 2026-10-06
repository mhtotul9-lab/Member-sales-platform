import { useEffect, useState } from "react";
import Nav from "../../../components/Nav";
import Loading from "../../../components/Loading";
import StoreAdminTabs from "../../../components/store/StoreAdminTabs";
import { useStoreAdmin } from "../../../lib/store/useStoreAdmin";
import { fmtPrice } from "../../../lib/store/shared";

export default function StoreImport() {
  const { ready, api } = useStoreAdmin();
  const [list, setList] = useState(null);
  const [sel, setSel] = useState({});
  const [activate, setActivate] = useState(true);
  const [msg, setMsg] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  const load = () => api("/api/admin/store/import").then((d) => setList(d.products)).catch((e) => setError(e.message));
  useEffect(() => { if (ready) load(); /* eslint-disable-next-line */ }, [ready]);
  if (!ready) return null;

  const ids = Object.keys(sel).filter((k) => sel[k]);
  const available = (list || []).filter((p) => !p.imported);

  async function run() {
    setBusy(true); setMsg(""); setError("");
    try { const r = await api("/api/admin/store/import", { method: "POST", body: { ids, activate } }); setMsg(`${r.count}টি প্রোডাক্ট স্টোরে যোগ হয়েছে ✓`); setSel({}); await load(); } catch (e) { setError(e.message); }
    setBusy(false);
  }

  return (
    <div className="shell">
      <Nav role="admin" active="store" />
      <div className="container" style={{ maxWidth: 1000 }}>
        <StoreAdminTabs active="import" />
        <div className="card">
          <h1 style={{ fontSize: "1.25rem", marginBottom: 6 }}>রিসেলিং প্রোডাক্ট → স্টোরে ইম্পোর্ট</h1>
          <p className="muted" style={{ marginBottom: 14 }}>আপনার রিসেলার সিস্টেমে আগে থেকে যেসব প্রোডাক্ট আছে, সেগুলোর নাম, দাম, কেনা দাম, ছবি আর বিবরণ কপি হয়ে স্টোরে চলে আসবে। মূল প্রোডাক্টে কোনো পরিবর্তন হয় না। ইম্পোর্টের পর প্রোডাক্ট এডিট করে সাইজ, স্টক, কাটা দাম যোগ করতে পারবেন।</p>
          {error && <p className="error-text">{error}</p>}
          {!list && !error && <Loading />}
          {list && list.length === 0 && <div className="empty-state">রিসেলিং সিস্টেমে কোনো প্রোডাক্ট নেই।</div>}
          {list && list.length > 0 && (
            <>
              <div style={{ display: "flex", gap: 10, flexWrap: "wrap", alignItems: "center", marginBottom: 12 }}>
                <button className="btn btn-outline btn-sm" onClick={() => setSel(Object.fromEntries(available.map((p) => [p.id, true])))}>সব বাছুন</button>
                <button className="btn btn-outline btn-sm" onClick={() => setSel({})}>বাতিল</button>
                <label style={{ display: "flex", gap: 6, alignItems: "center", fontSize: ".9rem" }}><input type="checkbox" checked={activate} onChange={(e) => setActivate(e.target.checked)} /> সাথে সাথে সাইটে চালু করুন</label>
                <button className="btn btn-teal" style={{ marginLeft: "auto" }} disabled={busy || !ids.length} onClick={run}>{busy ? "যোগ হচ্ছে..." : `বাছাইকৃত ${ids.length}টি স্টোরে যোগ করুন`}</button>
              </div>
              {msg && <p style={{ color: "var(--teal)", fontWeight: 600 }}>{msg}</p>}
              {list.map((p) => (
                <label key={p.id} className="list-row" style={{ gap: 12, cursor: p.imported ? "default" : "pointer", opacity: p.imported ? 0.55 : 1 }}>
                  <div style={{ display: "flex", gap: 12, alignItems: "center", minWidth: 0 }}>
                    <input type="checkbox" disabled={p.imported} checked={!!sel[p.id]} onChange={(e) => setSel({ ...sel, [p.id]: e.target.checked })} />
                    <div style={{ width: 52, height: 52, borderRadius: 8, overflow: "hidden", background: "#eef1ef", flex: "none" }}>
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      {p.image && <img src={p.image} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} />}
                    </div>
                    <div style={{ minWidth: 0 }}><div style={{ fontWeight: 600 }}>{p.name}</div><div className="muted">{p.category || "—"}</div></div>
                  </div>
                  <div style={{ textAlign: "right", flex: "none" }}>
                    <b>{fmtPrice(p.sellingPrice)}</b>
                    <div className="muted">{p.imported ? "✓ স্টোরে আছে" : `কেনা ${fmtPrice(p.costPrice)}`}</div>
                  </div>
                </label>
              ))}
            </>
          )}
        </div>
      </div>
    </div>
  );
}
