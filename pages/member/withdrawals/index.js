import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/router";
import { useAuth } from "../../../contexts/AuthContext";
import Nav from "../../../components/Nav";
import Loading from "../../../components/Loading";

const METHOD_LABELS = {
  bkash: "বিকাশ", nagad: "নগদ", rocket: "রকেট", bank: "ব্যাংক ট্রান্সফার",
};

const STATUS_LABEL = {
  pending: { text: "পেন্ডিং", cls: "stamp-pending" },
  approved: { text: "অ্যাপ্রুভড", cls: "stamp-active" },
  paid: { text: "পেইড", cls: "stamp-active" },
  rejected: { text: "রিজেক্টেড", cls: "stamp-rejected" },
};

export default function MemberWithdrawals() {
  const { user, profile, loading } = useAuth();
  const router = useRouter();
  const [balance, setBalance] = useState(null);
  const [withdrawals, setWithdrawals] = useState(null);
  const [settings, setSettings] = useState(null);
  const [form, setForm] = useState({ amount: "", method: "", accountNumber: "" });
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (loading) return;
    if (!user) { router.replace("/login"); return; }
    if (!profile || profile.status !== "active") { router.replace("/pending"); return; }
  }, [user, profile, loading, router]);

  const load = useCallback(async () => {
    if (!user) return;
    try {
      const token = await user.getIdToken();
      const [walletRes, wRes, settingsRes] = await Promise.all([
        fetch("/api/member/wallet", { headers: { Authorization: `Bearer ${token}` } }),
        fetch("/api/member/withdrawals", { headers: { Authorization: `Bearer ${token}` } }),
        fetch("/api/member/settings", { headers: { Authorization: `Bearer ${token}` } }),
      ]);
      const walletBody = await walletRes.json();
      const wBody = await wRes.json();
      const settingsBody = await settingsRes.json();
      if (walletRes.ok) setBalance(walletBody.availableBalance);
      if (wRes.ok) setWithdrawals(wBody.withdrawals);
      if (settingsRes.ok) {
        setSettings(settingsBody);
        setForm((f) => (f.method ? f : { ...f, method: settingsBody.paymentMethods[0] || "" }));
      }
    } catch {
      setError("লোড করা যায়নি।");
    }
  }, [user]);

  useEffect(() => {
    if (profile?.status === "active") load();
  }, [profile, load]);

  async function handleSubmit(e) {
    e.preventDefault();
    setError("");
    setSubmitting(true);
    try {
      const token = await user.getIdToken();
      const res = await fetch("/api/member/withdrawals", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify(form),
      });
      const body = await res.json();
      if (!res.ok) throw new Error(body.error || "সাবমিট করা যায়নি।");
      setForm({ amount: "", method: "bkash", accountNumber: "" });
      load();
    } catch (err) {
      setError(err.message);
    } finally {
      setSubmitting(false);
    }
  }

  if (loading || !profile) return null;

  return (
    <div className="shell">
      <Nav role={profile.role} active="withdrawals" />
      <div className="container" style={{ maxWidth: 560 }}>
        <div className="card" style={{ marginBottom: 20 }}>
          <h1 style={{ fontSize: "1.25rem", marginBottom: 6 }}>উইথড্র রিকোয়েস্ট</h1>
          {balance !== null && (
            <p className="muted" style={{ marginBottom: 20 }}>
              বর্তমান ব্যালেন্স: ৳{balance}
              {settings && ` · সর্বনিম্ন উইথড্র ৳${settings.minWithdrawalAmount}`}
            </p>
          )}

          <form onSubmit={handleSubmit}>
            <div className="field">
              <label htmlFor="amount">পরিমাণ (৳)</label>
              <input id="amount" type="number" step="0.01" required value={form.amount} onChange={(e) => setForm((f) => ({ ...f, amount: e.target.value }))} />
            </div>
            <div className="field">
              <label htmlFor="method">পেমেন্ট মেথড</label>
              <select id="method" value={form.method} onChange={(e) => setForm((f) => ({ ...f, method: e.target.value }))}>
                {(settings?.paymentMethods || []).map((m) => <option key={m} value={m}>{METHOD_LABELS[m] || m}</option>)}
              </select>
            </div>
            <div className="field">
              <label htmlFor="accountNumber">অ্যাকাউন্ট / ওয়ালেট নম্বর</label>
              <input id="accountNumber" required value={form.accountNumber} onChange={(e) => setForm((f) => ({ ...f, accountNumber: e.target.value }))} />
            </div>
            {error && <p className="error-text">{error}</p>}
            <button className="btn btn-primary" type="submit" disabled={submitting} style={{ width: "100%", marginTop: 6 }}>
              {submitting ? "সাবমিট হচ্ছে..." : "রিকোয়েস্ট সাবমিট করুন"}
            </button>
          </form>
        </div>

        <div className="card">
          <h2 style={{ fontSize: "1.05rem", marginBottom: 14 }}>উইথড্র হিস্ট্রি</h2>
          {withdrawals === null && <Loading />}
          {withdrawals && withdrawals.length === 0 && <div className="empty-state">এখনো কোনো উইথড্র রিকোয়েস্ট নেই।</div>}
          {withdrawals && withdrawals.map((w) => {
            const st = STATUS_LABEL[w.status] || STATUS_LABEL.pending;
            return (
              <div className="list-row" key={w.id}>
                <div>
                  <div style={{ fontWeight: 600 }}>৳{w.amount} · {w.method}</div>
                  <div className="muted">{new Date(w.requestedAt).toLocaleString("bn-BD")}</div>
                  {w.adminNote && <div className="muted" style={{ marginTop: 4 }}>নোট: {w.adminNote}</div>}
                </div>
                <span className={`stamp ${st.cls}`}>{st.text}</span>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
