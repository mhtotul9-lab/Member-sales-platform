import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/router";
import { useAuth } from "../../contexts/AuthContext";
import Nav from "../../components/Nav";
import Loading from "../../components/Loading";
import ErrorText from "../../components/ErrorText";

const METHOD_LABELS = { bkash: "বিকাশ", nagad: "নগদ", rocket: "রকেট", bank: "ব্যাংক ট্রান্সফার" };

function CalculationPreview({ form }) {
  const [costPrice, setCostPrice] = useState("500");
  const [sellingPrice, setSellingPrice] = useState("600");
  const [memberCommission, setMemberCommission] = useState(String(form.defaultMemberCommission || 0));
  const [activeMembers, setActiveMembers] = useState("5");

  const cost = Number(costPrice) || 0;
  const sell = Number(sellingPrice) || 0;
  const commission = Number(memberCommission) || 0;
  const referral = Number(form.defaultReferralCommission) || 0;
  const pool = Number(form.profitPoolShareAmount) || 0;
  const grossProfit = sell - cost;
  const companyRemaining = grossProfit - commission - referral - pool;
  const minRequired = Number(form.minimumCompanyProfit) || 0;
  const isUnsafe = form.enableNegativeProfitProtection && companyRemaining < minRequired;
  const nMembers = Math.max(1, Number(activeMembers) || 1);
  const perMemberPool = pool / nMembers;

  const minSellingPrice = cost + commission + referral + pool + minRequired;

  return (
    <div className="card" style={{ marginBottom: 20 }}>
      <h2 style={{ fontSize: "1.05rem", marginBottom: 4 }}>ক্যালকুলেশন প্রিভিউ</h2>
      <p className="muted" style={{ fontSize: "0.85rem", marginBottom: 16 }}>
        একটা নমুনা প্রোডাক্টের দাম বসিয়ে দেখুন — এই সেটিংসে সেল হলে টাকাটা ঠিক কীভাবে ভাগ হবে।
      </p>

      <div className="form-grid-2" style={{ marginBottom: 16 }}>
        <div className="field">
          <label>নমুনা Cost Price (৳)</label>
          <input type="number" value={costPrice} onChange={(e) => setCostPrice(e.target.value)} />
        </div>
        <div className="field">
          <label>নমুনা Selling Price (৳)</label>
          <input type="number" value={sellingPrice} onChange={(e) => setSellingPrice(e.target.value)} />
        </div>
        <div className="field">
          <label>নমুনা মেম্বার কমিশন (৳)</label>
          <input type="number" value={memberCommission} onChange={(e) => setMemberCommission(e.target.value)} />
        </div>
        <div className="field">
          <label>ঐ মুহূর্তে কতজন অ্যাক্টিভ মেম্বার</label>
          <input type="number" min="1" value={activeMembers} onChange={(e) => setActiveMembers(e.target.value)} />
        </div>
      </div>

      <div style={{ background: "var(--paper)", borderRadius: 8, padding: "16px 18px", fontSize: "0.92rem" }}>
        <div className="list-row" style={{ padding: "8px 0" }}><span>Selling Price</span><b>৳{sell.toFixed(2)}</b></div>
        <div className="list-row" style={{ padding: "8px 0" }}><span>− Product Cost</span><b>৳{cost.toFixed(2)}</b></div>
        <div className="list-row" style={{ padding: "8px 0", fontWeight: 700 }}><span>= Gross Profit</span><b>৳{grossProfit.toFixed(2)}</b></div>
        <div className="list-row" style={{ padding: "8px 0" }}><span>− মেম্বার কমিশন (সেলার পায়)</span><b>৳{commission.toFixed(2)}</b></div>
        <div className="list-row" style={{ padding: "8px 0" }}><span>− রেফারেল কমিশন (ডিফল্ট, মাঝেমধ্যে প্রযোজ্য)</span><b>৳{referral.toFixed(2)}</b></div>
        <div className="list-row" style={{ padding: "8px 0" }}><span>− প্রফিট পুল শেয়ার (মোট)</span><b>৳{pool.toFixed(2)}</b></div>
        <div className="list-row" style={{ padding: "8px 0", borderTop: "1px solid var(--line)", fontWeight: 700, color: isUnsafe ? "var(--red)" : "var(--teal)" }}>
          <span>= কোম্পানি রাখবে</span><b>৳{companyRemaining.toFixed(2)}</b>
        </div>
      </div>

      {isUnsafe && (
        <p className="error-text" style={{ marginTop: 12 }}>
          ⚠ এই দামে কোম্পানির লাভ আপনার সেট করা সর্বনিম্নের (৳{minRequired}) চেয়ে কম হয়ে যাচ্ছে। প্রোডাক্ট সেভ করার সময় এই প্রোটেকশন সক্রিয় থাকলে সিস্টেম আটকে দেবে।
        </p>
      )}

      <p className="muted" style={{ marginTop: 14, fontSize: "0.85rem" }}>
        {nMembers} জন অ্যাক্টিভ মেম্বার থাকলে পুলের ৳{pool.toFixed(2)} থেকে প্রত্যেকে পাবে <b>৳{perMemberPool.toFixed(2)}</b>।
      </p>

      <hr style={{ border: "none", borderTop: "1px solid var(--line)", margin: "18px 0" }} />

      <p style={{ fontSize: "0.92rem" }}>
        এই কমিশন/পুল-শেয়ার আর কমপক্ষে ৳{minRequired} কোম্পানি-প্রফিট রাখতে হলে —
        এই Cost Price-এ ন্যূনতম Selling Price হওয়া উচিত: <b>৳{minSellingPrice.toFixed(2)}</b>
        {" "}(= ৳{cost} + ৳{commission} কমিশন + ৳{referral} রেফারেল + ৳{pool} পুল + ৳{minRequired} ন্যূনতম প্রফিট)।
      </p>
    </div>
  );
}

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
      <div className="container" style={{ maxWidth: 640 }}>
        {!form && !error && <Loading />}
        {error && <ErrorText>{error}</ErrorText>}

        {form && (
          <>
            <div className="card" style={{ marginBottom: 20 }}>
              <h1 style={{ fontSize: "1.25rem", marginBottom: 6 }}>সাধারণ সেটিংস</h1>
              <p className="muted" style={{ marginBottom: 20 }}>এই মানগুলো সাথে সাথেই পুরো সিস্টেমে কার্যকর হবে।</p>

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

                <hr style={{ border: "none", borderTop: "1px solid var(--line)", margin: "22px 0" }} />
                <h2 style={{ fontSize: "1.05rem", marginBottom: 16 }}>রেফারেল ও প্রফিট সেটিংস</h2>

                <div className="field">
                  <label htmlFor="defaultReferralCommission">রেফারেল কমিশন — ডিফল্ট (৳)</label>
                  <input id="defaultReferralCommission" type="number" min="0" step="0.01" required value={form.defaultReferralCommission} onChange={(e) => setForm((f) => ({ ...f, defaultReferralCommission: Number(e.target.value) }))} />
                  <p className="muted" style={{ fontSize: "0.8rem", marginTop: 4 }}>
                    রেফার করা মেম্বারের প্রথম সফল সেলে রেফারারকে এই বোনাস দেওয়া হয়, একবারই। নতুন প্রোডাক্ট যোগ করার সময় এই মান আগে থেকে বসানো থাকবে (প্রতি প্রোডাক্টে চাইলে আলাদা করা যায়)।
                  </p>
                </div>
                <div className="field">
                  <label htmlFor="defaultMemberCommission">মেম্বার কমিশন — ডিফল্ট (৳ প্রতি ইউনিট)</label>
                  <input id="defaultMemberCommission" type="number" min="0" step="0.01" required value={form.defaultMemberCommission} onChange={(e) => setForm((f) => ({ ...f, defaultMemberCommission: Number(e.target.value) }))} />
                  <p className="muted" style={{ fontSize: "0.8rem", marginTop: 4 }}>
                    নতুন প্রোডাক্ট যোগ করার সময় আগে থেকে বসানো থাকবে (প্রতি প্রোডাক্টে চাইলে আলাদা করা যায়)।
                  </p>
                </div>
                <div className="field">
                  <label htmlFor="profitPoolShareAmount">প্রফিট পুল শেয়ার (৳, ফিক্সড — প্রতি সেলে)</label>
                  <input id="profitPoolShareAmount" type="number" min="0" step="0.01" required value={form.profitPoolShareAmount} onChange={(e) => setForm((f) => ({ ...f, profitPoolShareAmount: Number(e.target.value) }))} />
                  <p className="muted" style={{ fontSize: "0.8rem", marginTop: 4 }}>
                    প্রতিটা ভ্যালিড সেলে এই ফিক্সড টাকাটা পুলে যায় এবং সেই মুহূর্তের সব অ্যাক্টিভ মেম্বারের মধ্যে সমান ভাগ হয়। এটা % নয়, একটা নির্দিষ্ট ৳ পরিমাণ — সম্পূর্ণ আপনার নিয়ন্ত্রণে।
                  </p>
                </div>

                <hr style={{ border: "none", borderTop: "1px solid var(--line)", margin: "22px 0" }} />
                <h2 style={{ fontSize: "1.05rem", marginBottom: 16 }}>কোম্পানি প্রোটেকশন</h2>

                <div className="field">
                  <label htmlFor="minimumCompanyProfit">সর্বনিম্ন কোম্পানি প্রফিট (৳ প্রতি ইউনিট)</label>
                  <input id="minimumCompanyProfit" type="number" min="0" step="0.01" required value={form.minimumCompanyProfit} onChange={(e) => setForm((f) => ({ ...f, minimumCompanyProfit: Number(e.target.value) }))} />
                  <p className="muted" style={{ fontSize: "0.8rem", marginTop: 4 }}>
                    কমিশন, রেফারেল বোনাস আর পুল-শেয়ার বাদ দেওয়ার পরও কোম্পানির হাতে অন্তত এই টাকাটা থাকতে হবে।
                  </p>
                </div>
                <div className="field">
                  <label style={{ display: "flex", alignItems: "center", gap: 8 }}>
                    <input type="checkbox" checked={form.enableNegativeProfitProtection} onChange={(e) => setForm((f) => ({ ...f, enableNegativeProfitProtection: e.target.checked }))} />
                    Negative Profit Protection চালু রাখুন
                  </label>
                  <p className="muted" style={{ fontSize: "0.8rem", marginTop: 4 }}>
                    চালু থাকলে, কোনো প্রোডাক্টের কমিশন/রেফারেল/পুল-শেয়ার মিলিয়ে কোম্পানির লাভ সর্বনিম্নের নিচে চলে গেলে সিস্টেম সেই প্রোডাক্ট সেভ হতে দেবে না।
                  </p>
                </div>

                {success && <p className="help-text" style={{ color: "var(--teal)", marginBottom: 10 }}>সেভ হয়েছে।</p>}
                {error && <ErrorText>{error}</ErrorText>}

                <button className="btn btn-primary" type="submit" disabled={saving} style={{ marginTop: 8 }}>
                  {saving ? "সেভ হচ্ছে..." : "সেভ করুন"}
                </button>
              </form>
            </div>

            <CalculationPreview form={form} />
          </>
        )}
      </div>
    </div>
  );
}
