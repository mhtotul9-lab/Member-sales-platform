import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/router";
import { useAuth } from "../../contexts/AuthContext";
import Nav from "../../components/Nav";
import Loading from "../../components/Loading";
import ErrorText from "../../components/ErrorText";

const TXN_LABEL = {
  referral_bonus: { text: "রেফারেল বোনাস", cls: "stamp-active" },
  referral_bonus_reversal: { text: "বোনাস রিভার্সড", cls: "stamp-rejected" },
};

export default function AdminReferrals() {
  const { user, profile, loading } = useAuth();
  const router = useRouter();
  const [data, setData] = useState(null);
  const [error, setError] = useState("");

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
      const res = await fetch("/api/admin/referrals", { headers: { Authorization: `Bearer ${token}` } });
      const body = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(body.error || "লোড করা যায়নি।");
      setData(body);
    } catch (err) {
      setError(err.message);
    }
  }, [user]);

  useEffect(() => {
    if (profile?.role === "admin" && profile.status === "active") load();
  }, [profile, load]);

  if (loading || !profile) return null;

  return (
    <div className="shell">
      <Nav role="admin" active="referrals" />
      <div className="container">
        {error && <ErrorText>{error}</ErrorText>}
        {!data && !error && <Loading />}

        {data && (
          <>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(170px, 1fr))", gap: 14, marginBottom: 20 }}>
              <div className="card">
                <div className="muted" style={{ marginBottom: 6, fontSize: "0.85rem" }}>মোট রেফারড মেম্বার</div>
                <div style={{ fontSize: "1.3rem", fontWeight: 700 }}>{data.totalReferredMembers}</div>
              </div>
              <div className="card">
                <div className="muted" style={{ marginBottom: 6, fontSize: "0.85rem" }}>প্রথম সেল সম্পন্ন</div>
                <div style={{ fontSize: "1.3rem", fontWeight: 700, color: "var(--teal)" }}>{data.totalFirstSalesCompleted}</div>
              </div>
              <div className="card">
                <div className="muted" style={{ marginBottom: 6, fontSize: "0.85rem" }}>মোট বোনাস প্রদান</div>
                <div style={{ fontSize: "1.3rem", fontWeight: 700 }}>৳{data.totalBonusesPaid}</div>
              </div>
              <div className="card">
                <div className="muted" style={{ marginBottom: 6, fontSize: "0.85rem" }}>নেট বোনাস (রিভার্সালের পর)</div>
                <div style={{ fontSize: "1.3rem", fontWeight: 700 }}>৳{data.netBonusesPaid}</div>
              </div>
            </div>

            <div className="card">
              <h1 style={{ fontSize: "1.2rem", marginBottom: 16 }}>রেফারেল ট্রানজেকশন</h1>
              {data.transactions.length === 0 && <div className="empty-state">এখনো কোনো রেফারেল বোনাস তৈরি হয়নি।</div>}
              {data.transactions.map((t) => {
                const label = TXN_LABEL[t.type] || { text: t.type, cls: "stamp-pending" };
                return (
                  <div className="list-row" key={t.id}>
                    <div>
                      <div style={{ fontWeight: 600 }}>{t.description}</div>
                      <div className="muted" style={{ fontSize: "0.82rem" }}>{new Date(t.createdAt).toLocaleString("bn-BD")} · অর্ডার: {t.refOrderCode}</div>
                    </div>
                    <div style={{ textAlign: "right" }}>
                      <span className={`stamp ${label.cls}`}>{label.text}</span>
                      <div style={{ fontWeight: 700, marginTop: 4, color: t.amount >= 0 ? "var(--teal)" : "var(--red)" }}>
                        {t.amount >= 0 ? "+" : ""}৳{t.amount}
                      </div>
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
