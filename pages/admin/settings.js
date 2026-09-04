import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/router";
import { useAuth } from "../../contexts/AuthContext";
import Nav from "../../components/Nav";
import Loading from "../../components/Loading";

const METHOD_LABELS = { bkash: "বিকাশ", nagad: "নগদ", rocket: "রকেট", bank: "ব্যাংক ট্রান্সফার" };

export default function AdminSettings() {
  const { user, profile, loading } = useAuth();
  const router = useRouter();
  const [form, setForm] = useState(null);
  const [availableMethods, setAvailableMethods] = useState([]);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (loading) return;
    if (!user) { router.replace("/login"); return; }
    if (!profile || profile.status !== "active") { router.replace("/pending"); return; }
    if (profile.role !== "admin") { router.replace("/member/dashboard"); return; }
  }, [user, profile, loading, router]);

  const load = useCallback(async () => {
    if (!user) return;
    setError("");
    try {
      const token = await user.getIdToken();
      const res = await fetch("/api/admin/settings", { headers: { Authorization: `Bearer ${token}` } });
      const body = await res.json();
      if (!res.ok) throw new Error(body.error || "লোড করা যায়নি।");
      setForm(body.settings);
      setAvailableMethods(body.availablePaymentMethods);
    } catch (err) {
      setError(err.message);
    }
  }, [user]);

  useEffect(() => {
    if (profile?.role === "admin" && profile.status === "active") load();
  }, [profile, load]);

  function toggleMethod(method) {
    setForm((f) => ({
      ...f,
      paymentMethods: f.paymentMethods.includes(method)
        ? f.paymentMethods.filter((m) => m !== method)
        : [...f.paymentMethods, method],
    }));
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setError("");
    setSuccess(false);
    setSaving(true);
    try {
      const token = await user.getIdToken();
      const res = await fetch("/api/admin/settings", {
        method: "PUT",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify(form),
      });
      const body = await res.json();
      if (!res.ok) throw new Error(body.error || "সেভ করা যায়নি।");
      setSuccess(true);
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  }

  if (loading || !profile) return null;

  return (
    <div className="shell">
      <Nav role="admin" active="settings" />
      <div className="container" style={{ maxWidth: 560 }}>
        <div className="card">
          <h1 style={{ fontSize: "1.25rem", marginBottom: 6 }}>সেটিংস</h1>
          <p className="muted" style={{ marginBottom: 20 }}>এই মানগুলো সাথে সাথেই পুরো সিস্টেমে কার্যকর হবে।</p>

          {!form && !error && <Loading />}
          {error && <p className="error-text">{error}</p>}

          {form && (
            <form onSubmit={handleSubmit}>
              <div className="field">
                <label htmlFor="activeDays">Active থাকার জন্য রোলিং উইন্ডো (দিন)</label>
                <input id="activeDays" type="number" min="1" required value={form.activeDays} onChange={(e) => setForm((f) => ({ ...f, activeDays: Number(e.target.value) }))} />
              </div>
              <div className="field">
                <label htmlFor="minApprovedSalesForActive">Active হতে প্রয়োজনীয় ন্যূনতম অ্যাপ্রুভড সেল</label>
                <input id="minApprovedSalesForActive" type="number" min="1" required value={form.minApprovedSalesForActive} onChange={(e) => setForm((f) => ({ ...f, minApprovedSalesForActive: Number(e.target.value) }))} />
              </div>
              <div className="field">
                <label htmlFor="minWithdrawalAmount">সর্বনিম্ন উইথড্র পরিমাণ (৳)</label>
                <input id="minWithdrawalAmount" type="number" min="0" required value={form.minWithdrawalAmount} onChange={(e) => setForm((f) => ({ ...f, minWithdrawalAmount: Number(e.target.value) }))} />
              </div>
              <h2 style={{ fontSize: "1.05rem", margin: "24px 0 12px" }}>রেফারেল ও প্রফিট পুল প্রোগ্রাম</h2>

              <div className="field">
                <label htmlFor="directReferralCommission">Direct Referral Commission (৳)</label>
                <input id="directReferralCommission" type="number" min="0" step="0.01" required value={form.directReferralCommission} onChange={(e) => setForm((f) => ({ ...f, directReferralCommission: Number(e.target.value) }))} />
                <p className="muted" style={{ fontSize: "0.8rem", marginTop: 4 }}>
                  রেফারার একবার পাবে, যখন তার রেফার করা মেম্বার নিচের শর্ত পূরণ করবে। প্ল্যাটফর্ম-ওয়াইড একটাই মান — প্রোডাক্ট অনুযায়ী আলাদা করে সেট করার দরকার নেই।
                </p>
              </div>

              <div className="field">
                <label htmlFor="requiredSalesForCommission">Required Sales for Commission</label>
                <input id="requiredSalesForCommission" type="number" min="1" step="1" required value={form.requiredSalesForCommission} onChange={(e) => setForm((f) => ({ ...f, requiredSalesForCommission: Number(e.target.value) }))} />
                <p className="muted" style={{ fontSize: "0.8rem", marginTop: 4 }}>রেফার করা মেম্বারের কতগুলো ভ্যালিড (অ্যাপ্রুভড) সেল হলে উপরের কমিশন দেওয়া হবে।</p>
              </div>

              <div className="field">
                <label htmlFor="profitPoolShare">Profit Pool Share (৳)</label>
                <input id="profitPoolShare" type="number" min="0" step="0.01" required value={form.profitPoolShare} onChange={(e) => setForm((f) => ({ ...f, profitPoolShare: Number(e.target.value) }))} />
                <p className="muted" style={{ fontSize: "0.8rem", marginTop: 4 }}>
                  ডাউনলাইনের প্রতিটা (একবারের বদলে প্রতি) সেলে আপলাইনের প্রতিটা লেভেল এই ফিক্সড পরিমাণ ৳ পায় — এটা প্রফিটের শতাংশ নয়, প্রতি সেলে একটা নির্দিষ্ট সংখ্যা।
                </p>
              </div>

              <div className="field">
                <label htmlFor="maxReferralLevels">Maximum Referral Levels</label>
                <select id="maxReferralLevels" required value={form.maxReferralLevels} onChange={(e) => setForm((f) => ({ ...f, maxReferralLevels: Number(e.target.value) }))}>
                  <option value={1}>1</option>
                  <option value={2}>2</option>
                  <option value={3}>3</option>
                </select>
                <p className="muted" style={{ fontSize: "0.8rem", marginTop: 4 }}>Profit Pool Share কত লেভেল উপর পর্যন্ত ক্যাসকেড করবে (রেফারারের রেফারার, তার রেফারার...)।</p>
              </div>

              <div className="field">
                <label htmlFor="minProductProfit">Minimum Product Profit (৳ প্রতি ইউনিট)</label>
                <input id="minProductProfit" type="number" min="0" step="0.01" required value={form.minProductProfit} onChange={(e) => setForm((f) => ({ ...f, minProductProfit: Number(e.target.value) }))} />
                <p className="muted" style={{ fontSize: "0.8rem", marginTop: 4 }}>এই প্রোডাক্টের প্রতি ইউনিট প্রফিট (সেলিং প্রাইস − কস্ট প্রাইস) এর চেয়ে কম হলে Direct Referral Commission ও Profit Pool Share কোনোটাই দেওয়া হবে না — এটা লোকসানি প্রোডাক্টে পেআউট আটকায়।</p>
              </div>

              <div className="field">
                <label htmlFor="maxTotalPayoutPerSale">Maximum Total Payout/Sale (৳)</label>
                <input id="maxTotalPayoutPerSale" type="number" min="0" step="0.01" required value={form.maxTotalPayoutPerSale} onChange={(e) => setForm((f) => ({ ...f, maxTotalPayoutPerSale: Number(e.target.value) }))} />
                <p className="muted" style={{ fontSize: "0.8rem", marginTop: 4 }}>একটা সেলে (সেলার কমিশন + রেফারেল বোনাস + সব লেভেলের পুল শেয়ার) সব মিলিয়ে সর্বোচ্চ কত ৳ যাবে। ০ দিলে কোনো সীমা থাকবে না।</p>
              </div>

              <div className="field" style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                <label htmlFor="commissionEnabled" style={{ marginBottom: 0 }}>Commission Enabled</label>
                <input id="commissionEnabled" type="checkbox" checked={form.commissionEnabled} onChange={(e) => setForm((f) => ({ ...f, commissionEnabled: e.target.checked }))} />
              </div>

              <div className="field" style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                <label htmlFor="profitPoolEnabled" style={{ marginBottom: 0 }}>Profit Pool Enabled</label>
                <input id="profitPoolEnabled" type="checkbox" checked={form.profitPoolEnabled} onChange={(e) => setForm((f) => ({ ...f, profitPoolEnabled: e.target.checked }))} />
              </div>

              <div className="field" style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                <label htmlFor="reverseOnRefund" style={{ marginBottom: 0 }}>রিফান্ড হলে Commission Reverse হবে</label>
                <input id="reverseOnRefund" type="checkbox" checked={form.reverseOnRefund} onChange={(e) => setForm((f) => ({ ...f, reverseOnRefund: e.target.checked }))} />
              </div>

              <div className="field" style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                <label htmlFor="adminOverrideEnabled" style={{ marginBottom: 0 }}>Admin Override</label>
                <input id="adminOverrideEnabled" type="checkbox" checked={form.adminOverrideEnabled} onChange={(e) => setForm((f) => ({ ...f, adminOverrideEnabled: e.target.checked }))} />
              </div>

              <h2 style={{ fontSize: "1.05rem", margin: "24px 0 12px" }}>সাধারণ সেটিংস</h2>

              <div className="field">
                <label>উইথড্র পেমেন্ট মেথড</label>
                <div style={{ display: "flex", gap: 14, flexWrap: "wrap", marginTop: 6 }}>
                  {availableMethods.map((m) => (
                    <label key={m} style={{ display: "flex", alignItems: "center", gap: 6, fontWeight: 500, fontSize: "0.9rem" }}>
                      <input type="checkbox" checked={form.paymentMethods.includes(m)} onChange={() => toggleMethod(m)} />
                      {METHOD_LABELS[m] || m}
                    </label>
                  ))}
                </div>
              </div>

              {success && <p className="help-text" style={{ color: "var(--teal)", marginBottom: 10 }}>সেভ হয়েছে।</p>}
              {error && <p className="error-text">{error}</p>}

              <button className="btn btn-primary" type="submit" disabled={saving} style={{ marginTop: 8 }}>
                {saving ? "সেভ হচ্ছে..." : "সেভ করুন"}
              </button>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
