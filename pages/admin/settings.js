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
              <div className="field">
                <label htmlFor="poolProfitSharePercent">কোম্পানির প্রফিটের কত % পুলে ভাগ হবে (%)</label>
                <input id="poolProfitSharePercent" type="number" min="0" max="100" required value={form.poolProfitSharePercent} onChange={(e) => setForm((f) => ({ ...f, poolProfitSharePercent: Number(e.target.value) }))} />
                <p className="muted" style={{ fontSize: "0.8rem", marginTop: 4 }}>
                  প্রতিটা সেলের কোম্পানি-প্রফিটের এই শতাংশ সব অ্যাক্টিভ মেম্বারের মধ্যে সমান ভাগ হয়। এটা প্রোডাক্টের নিজস্ব ফিক্সড মেম্বার কমিশন থেকে আলাদা — কমিশন সবসময় শুধু যে সেল করেছে সে-ই পুরোটা পায়।
                </p>
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
