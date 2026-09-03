import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/router";
import { useAuth } from "../../contexts/AuthContext";
import Nav from "../../components/Nav";
import Loading from "../../components/Loading";

const TXN_LABEL = {
  profit_earned: { text: "প্রফিট পুল শেয়ার", sign: "+" },
  profit_adjustment: { text: "প্রফিট পুল এডজাস্টমেন্ট", sign: "" },
  product_commission: { text: "প্রোডাক্ট কমিশন", sign: "+" },
  product_commission_reversal: { text: "কমিশন এডজাস্টমেন্ট", sign: "" },
  referral_bonus: { text: "রেফারেল বোনাস", sign: "+" },
  referral_bonus_reversal: { text: "রেফারেল বোনাস এডজাস্টমেন্ট", sign: "" },
  withdrawal: { text: "উইথড্র", sign: "" },
};

export default function MemberWallet() {
  const { user, profile, loading } = useAuth();
  const router = useRouter();
  const [wallet, setWallet] = useState(null);
  const [error, setError] = useState("");

  useEffect(() => {
    if (loading) return;
    if (!user) { router.replace("/login"); return; }
    if (!profile || profile.status !== "active") { router.replace("/pending"); return; }
  }, [user, profile, loading, router]);

  const load = useCallback(async () => {
    if (!user) return;
    setError("");
    try {
      const token = await user.getIdToken();
      const res = await fetch("/api/member/wallet", { headers: { Authorization: `Bearer ${token}` } });
      const body = await res.json();
      if (!res.ok) throw new Error(body.error || "লোড করা যায়নি।");
      setWallet(body);
    } catch (err) {
      setError(err.message);
    }
  }, [user]);

  useEffect(() => {
    if (profile?.status === "active") load();
  }, [profile, load]);

  if (loading || !profile) return null;

  return (
    <div className="shell">
      <Nav role={profile.role} active="wallet" />
      <div className="container">
        {error && <p className="error-text">{error}</p>}
        {!wallet && !error && <Loading />}

        {wallet && (
          <>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: 14, marginBottom: 20 }}>
              <div className="card">
                <div className="muted" style={{ marginBottom: 6 }}>সেলস স্ট্যাটাস</div>
                <span className={`stamp ${wallet.activityStatus === "active" ? "stamp-active" : "stamp-rejected"}`}>
                  {wallet.activityStatus === "active" ? "অ্যাক্টিভ" : "ইনঅ্যাক্টিভ"}
                </span>
                <div className="muted" style={{ marginTop: 8, fontSize: "0.82rem" }}>
                  গত {wallet.activeDays} দিনে অন্তত ১টি অ্যাপ্রুভড সেল প্রয়োজন
                </div>
              </div>
              <div className="card">
                <div className="muted" style={{ marginBottom: 6 }}>বর্তমান ব্যালেন্স</div>
                <div style={{ fontSize: "1.4rem", fontWeight: 700 }}>৳{wallet.availableBalance}</div>
              </div>
              <div className="card">
                <div className="muted" style={{ marginBottom: 6 }}>মোট প্রফিট পুল আয়</div>
                <div style={{ fontSize: "1.4rem", fontWeight: 700 }}>৳{wallet.totalProfitEarned}</div>
              </div>
              <div className="card">
                <div className="muted" style={{ marginBottom: 6 }}>মোট কমিশন আয়</div>
                <div style={{ fontSize: "1.4rem", fontWeight: 700, color: "var(--teal)" }}>৳{wallet.totalCommissionEarned}</div>
              </div>
              <div className="card">
                <div className="muted" style={{ marginBottom: 6 }}>মোট সেল</div>
                <div style={{ fontSize: "1.4rem", fontWeight: 700 }}>৳{wallet.totalSales}</div>
              </div>
            </div>

            <div className="card">
              <h2 style={{ fontSize: "1.05rem", marginBottom: 14 }}>ট্রানজেকশন হিস্ট্রি</h2>
              {wallet.transactions.length === 0 && <div className="empty-state">এখনো কোনো ট্রানজেকশন নেই।</div>}
              {wallet.transactions.map((t) => {
                const label = TXN_LABEL[t.type] || { text: t.type, sign: "" };
                const positive = t.amount >= 0;
                return (
                  <div className="list-row" key={t.id}>
                    <div>
                      <div style={{ fontWeight: 600 }}>{label.text}</div>
                      <div className="muted">{t.description}</div>
                      <div className="muted" style={{ fontSize: "0.82rem" }}>{new Date(t.createdAt).toLocaleString("bn-BD")}</div>
                    </div>
                    <div style={{ fontWeight: 700, color: positive ? "var(--teal)" : "var(--red)" }}>
                      {positive ? "+" : ""}৳{t.amount}
                    </div>
                  </div>
                );
              })}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
