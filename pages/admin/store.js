import { useEffect, useState } from "react";
import { useRouter } from "next/router";
import { useAuth } from "../../contexts/AuthContext";
import Nav from "../../components/Nav";
import Loading from "../../components/Loading";
import ErrorText from "../../components/ErrorText";

export default function AdminStore() {
  const { user, profile, loading } = useAuth();
  const router = useRouter();
  const [f, setF] = useState(null);
  const [error, setError] = useState("");
  const [msg, setMsg] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (loading) return;
    if (!user) { router.replace("/login"); return; }
    if (!profile || profile.status !== "active") { router.replace("/pending"); return; }
    if (profile.role !== "admin") { router.replace("/member/dashboard"); return; }
  }, [user, profile, loading, router]);

  useEffect(() => {
    if (!user || profile?.role !== "admin") return;
    (async () => {
      try {
        const token = await user.getIdToken();
        const res = await fetch("/api/admin/store-settings", { headers: { Authorization: `Bearer ${token}` } });
        const body = await res.json();
        if (!res.ok) throw new Error(body.error || "লোড করা যায়নি।");
        const s = body.settings;
        setF({ ...s, deliveryCharge: String(s.deliveryCharge ?? 0), freeDeliveryAbove: String(s.freeDeliveryAbove ?? 0), blockedPhonesText: (s.blockedPhones || []).join("\n") });
      } catch (err) { setError(err.message); }
    })();
  }, [user, profile]);

  const set = (k) => (e) => setF((x) => ({ ...x, [k]: e.target.value }));

  async function save(e) {
    e.preventDefault();
    setBusy(true); setError(""); setMsg("");
    try {
      const token = await user.getIdToken();
      const { blockedPhones, updatedAt, ...payload } = f;
      const res = await fetch("/api/admin/store-settings", { method: "PUT", headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` }, body: JSON.stringify(payload) });
      const body = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(body.error || "সেভ করা যায়নি।");
      setMsg("সেভ হয়েছে ✓ — স্টোরে ১–২ মিনিটের মধ্যে দেখা যাবে।");
    } catch (err) { setError(err.message); } finally { setBusy(false); }
  }

  if (loading || !profile) return null;

  return (
    <div className="shell">
      <Nav role="admin" active="store" />
      <div className="container" style={{ maxWidth: 680 }}>
        <div className="card">
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
            <h1 style={{ fontSize: "1.25rem" }}>স্টোর সেটিংস</h1>
            <a className="btn btn-outline btn-sm" href="/" target="_blank" rel="noreferrer">স্টোর দেখুন ↗</a>
          </div>
          {error && <ErrorText>{error}</ErrorText>}
          {!f && !error && <Loading />}
          {f && (
            <form onSubmit={save}>
              <div className="form-grid-2">
                <div className="field"><label>স্টোরের নাম</label><input value={f.storeName} onChange={set("storeName")} /></div>
                <div className="field"><label>ট্যাগলাইন</label><input value={f.tagline} onChange={set("tagline")} /></div>
                <div className="field"><label>হটলাইন নম্বর</label><input value={f.hotline} onChange={set("hotline")} placeholder="01XXXXXXXXX" /></div>
                <div className="field"><label>হোয়াটসঅ্যাপ নম্বর</label><input value={f.whatsapp} onChange={set("whatsapp")} placeholder="8801XXXXXXXXX" /></div>
                <div className="field"><label>ফেসবুক পেজ লিংক</label><input value={f.facebookUrl} onChange={set("facebookUrl")} /></div>
                <div className="field"><label>ঠিকানা (ফুটারে)</label><input value={f.address} onChange={set("address")} /></div>
              </div>
              <div className="field"><label>উপরের অ্যানাউন্সমেন্ট বার (খালি রাখলে দেখাবে না)</label><input value={f.announcement} onChange={set("announcement")} placeholder="যেমন: আজ সব অর্ডারে ফ্রি ডেলিভারি!" /></div>

              <hr style={{ border: "none", borderTop: "1px solid var(--line)", margin: "18px 0" }} />
              <div className="field"><label>হোম পেজ হেডলাইন</label><input value={f.heroTitle} onChange={set("heroTitle")} /></div>
              <div className="field"><label>হোম পেজ সাবটাইটেল</label><input value={f.heroSubtitle} onChange={set("heroSubtitle")} /></div>
              <div className="field"><label>ব্যানার ছবির URL (ঐচ্ছিক)</label><input value={f.heroImageUrl} onChange={set("heroImageUrl")} placeholder="https://..." /></div>

              <hr style={{ border: "none", borderTop: "1px solid var(--line)", margin: "18px 0" }} />
              <div className="form-grid-2">
                <div className="field"><label>ডেলিভারি চার্জ (৳)</label><input type="number" min="0" value={f.deliveryCharge} onChange={set("deliveryCharge")} /></div>
                <div className="field"><label>এর উপরে অর্ডারে ফ্রি ডেলিভারি (৳, ০ = বন্ধ)</label><input type="number" min="0" value={f.freeDeliveryAbove} onChange={set("freeDeliveryAbove")} /></div>
              </div>
              <div className="field">
                <label><input type="checkbox" checked={f.orderingEnabled !== false} onChange={(e) => setF((x) => ({ ...x, orderingEnabled: e.target.checked }))} style={{ width: "auto", marginRight: 8 }} />অর্ডার নেওয়া চালু আছে</label>
              </div>
              <div className="field">
                <label>ব্লক করা নম্বর (প্রতি লাইনে একটা) — ফেক/ঝামেলাপূর্ণ কাস্টমার</label>
                <textarea rows={3} value={f.blockedPhonesText} onChange={set("blockedPhonesText")} />
              </div>
              <button className="btn btn-primary" disabled={busy}>{busy ? "সেভ হচ্ছে…" : "সেভ করুন"}</button>
              {msg && <span className="muted" style={{ marginLeft: 12 }}>{msg}</span>}
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
