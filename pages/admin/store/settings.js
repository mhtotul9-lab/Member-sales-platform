import { useEffect, useState } from "react";
import Nav from "../../../components/Nav";
import Loading from "../../../components/Loading";
import StoreAdminTabs from "../../../components/store/StoreAdminTabs";
import { useStoreAdmin } from "../../../lib/store/useStoreAdmin";

const TEXT_FIELDS = [
  ["storeName", "স্টোরের নাম"],
  ["tagline", "ট্যাগলাইন (ফুটারে ও গুগলে দেখায়)"],
  ["announcement", "সবার উপরের ঘোষণা বার (খালি রাখলে দেখাবে না)"],
  ["heroTitle", "হোম পেজের বড় শিরোনাম"],
  ["heroSub", "হোম পেজের ছোট লেখা"],
  ["phone", "ফোন নাম্বার (কল বাটনের জন্য)"],
  ["whatsapp", "WhatsApp নাম্বার (দেশের কোড সহ, যেমন 8801712345678)"],
  ["address", "দোকান/অফিসের ঠিকানা"],
  ["facebookUrl", "Facebook পেজের লিংক"],
  ["deliveryNote", "ডেলিভারি সম্পর্কে লেখা"],
];
const NUM_FIELDS = [
  ["deliveryInsideDhaka", "ঢাকার ভেতরে ডেলিভারি চার্জ (৳)"],
  ["deliveryOutsideDhaka", "ঢাকার বাইরে ডেলিভারি চার্জ (৳)"],
  ["freeDeliveryAbove", "এই টাকার বেশি অর্ডারে ফ্রি ডেলিভারি (৳) — ০ দিলে বন্ধ"],
];

export default function StoreSettings() {
  const { ready, api } = useStoreAdmin();
  const [s, setS] = useState(null);
  const [msg, setMsg] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => { if (ready) api("/api/admin/store/settings").then((d) => setS(d.settings)).catch((e) => setError(e.message)); }, [ready, api]);
  if (!ready) return null;

  async function save(e) {
    e.preventDefault(); setBusy(true); setMsg(""); setError("");
    try { await api("/api/admin/store/settings", { method: "PUT", body: s }); setMsg("সেভ হয়েছে ✓ (সাইটে ১ মিনিটের মধ্যে দেখাবে)"); } catch (err) { setError(err.message); }
    setBusy(false);
  }

  return (
    <div className="shell">
      <Nav role="admin" active="store" />
      <div className="container">
        <StoreAdminTabs active="settings" />
        <div className="card">
          <h1 style={{ fontSize: "1.25rem", marginBottom: 16 }}>স্টোর সেটিংস</h1>
          {!s ? (error ? <p className="error-text">{error}</p> : <Loading />) : (
            <form onSubmit={save}>
              {TEXT_FIELDS.map(([k, label]) => <div className="field" key={k}><label>{label}</label><input value={s[k] ?? ""} onChange={(e) => setS({ ...s, [k]: e.target.value })} /></div>)}
              <div className="form-grid-2">
                {NUM_FIELDS.map(([k, label]) => <div className="field" key={k}><label>{label}</label><input type="number" min="0" value={s[k] ?? 0} onChange={(e) => setS({ ...s, [k]: e.target.value })} /></div>)}
              </div>
              {msg && <p style={{ color: "var(--teal)", fontWeight: 600 }}>{msg}</p>}
              {error && <p className="error-text">{error}</p>}
              <button className="btn btn-teal" disabled={busy}>{busy ? "সেভ হচ্ছে..." : "সেভ করুন"}</button>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
