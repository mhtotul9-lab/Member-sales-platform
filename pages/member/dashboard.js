import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/router";
import { useAuth } from "../../contexts/AuthContext";
import Nav from "../../components/Nav";
import Loading from "../../components/Loading";
import LiveSalesFeed from "../../components/LiveSalesFeed";
import { ORDER_STATUS_LABELS } from "../../lib/orderStatus";
import ErrorText from "../../components/ErrorText";

export default function MemberDashboard() {
  const { user, profile, loading } = useAuth();
  const router = useRouter();
  const [stats, setStats] = useState(null);
  const [error, setError] = useState("");

  useEffect(() => {
    if (loading) return;
    if (!user) { router.replace("/login"); return; }
    if (!profile || profile.status !== "active") { router.replace("/pending"); return; }
    if (profile.role === "admin") router.replace("/admin/dashboard");
  }, [user, profile, loading, router]);

  const load = useCallback(async () => {
    if (!user) return;
    setError("");
    try {
      const token = await user.getIdToken();
      const res = await fetch("/api/member/overview", { headers: { Authorization: `Bearer ${token}` } });
      const body = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(body.error || "লোড করা যায়নি।");
      setStats(body);
    } catch (err) {
      setError(err.message);
    }
  }, [user]);

  useEffect(() => {
    if (profile?.status === "active" && profile.role !== "admin") load();
  }, [profile, load]);

  if (loading || !profile) return null;

  const maxDaily = stats ? Math.max(1, ...stats.dailySeries.map((d) => d.amount)) : 1;

  return (
    <div className="shell">
      <Nav role="member" active="dashboard" />
      <div className="container">
        <div className="card" style={{ marginBottom: 20 }}>
          <span className="stamp stamp-active">অ্যাক্টিভ</span>
          <h1 style={{ fontSize: "1.3rem", margin: "14px 0 6px" }}>স্বাগতম, {profile.fullName}</h1>
          <p className="muted" style={{ marginBottom: 20 }}>
            মেম্বার আইডি: {profile.memberId}
          </p>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 10 }}>
            <a className="btn btn-teal" href="/member/products">প্রোডাক্ট ব্রাউজ করুন</a>
            <a className="btn btn-outline" href="/member/orders">আমার অর্ডার দেখুন</a>
            <a className="btn btn-outline" href="/member/wallet">ওয়ালেট দেখুন</a>
            <a className="btn btn-outline" href="/member/withdrawals">উইথড্র করুন</a>
            <a className="btn btn-outline" href="/member/referrals">রেফারেল প্রোগ্রাম</a>
            <a className="btn btn-outline" href="/leaderboard">লিডারবোর্ড</a>
            <a className="btn btn-outline" href="/member/trainings">ট্রেনিং</a>
          </div>
        </div>

        <div className="card" style={{ marginBottom: 20 }}>
          <h2 style={{ fontSize: "1.05rem", marginBottom: 14 }}>আমার সেল সামারি</h2>

          {error && <ErrorText>{error}</ErrorText>}
          {!stats && !error && <Loading />}

          {stats && (
            <>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(150px, 1fr))", gap: 12, marginBottom: 18 }}>
                <StatCard label="ওয়ালেট ব্যালেন্স" value={`৳${(profile.availableBalance || 0).toFixed(2)}`} accent="teal" />
                <StatCard label="মোট ভ্যালিড সেল" value={`৳${stats.validSalesAmount}`} />
                <StatCard label="পেন্ডিং (অ্যাপ্রুভালের অপেক্ষায়)" value={`৳${stats.pendingSalesAmount}`} accent="gold" />
                <StatCard label="মোট প্রোডাক্ট কমিশন" value={`৳${stats.validCommissionAmount}`} accent="teal" />
                <StatCard label="মোট প্রফিট পুল শেয়ার" value={`৳${stats.validProfitAmount}`} />
                <StatCard label="রেফারেল আয়" value={`৳${(profile.referralEarnings || 0).toFixed(2)}`} />
              </div>

              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(150px, 1fr))", gap: 12, marginBottom: 20 }}>
                <StatCard label="মোট অর্ডার" value={stats.totalOrders} small />
                <StatCard label="অ্যাপ্রুভড/ভ্যালিড" value={stats.validCount} small accent="teal" />
                <StatCard label="পেন্ডিং অর্ডার" value={stats.pendingCount} small accent="gold" />
                <StatCard label="রিজেক্ট/বাতিল/রিটার্ন" value={stats.deadCount} small accent="red" />
                <StatCard label="কনভার্সন রেট" value={`${stats.conversionRate}%`} small />
                <StatCard label="এই মাসের অর্ডার" value={stats.thisMonthOrderCount} small />
              </div>

              <div style={{ marginBottom: 20 }}>
                <div className="muted" style={{ marginBottom: 8, fontSize: "0.85rem" }}>গত ১৪ দিনের ভ্যালিড সেল</div>
                <div style={{ display: "flex", alignItems: "flex-end", gap: 4, height: 90 }}>
                  {stats.dailySeries.map((d) => (
                    <div key={d.date} style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "flex-end", height: "100%" }} title={`${d.date}: ৳${d.amount}`}>
                      <div
                        style={{
                          width: "100%",
                          height: `${Math.max(3, (d.amount / maxDaily) * 100)}%`,
                          background: d.amount > 0 ? "var(--teal)" : "var(--line)",
                          borderRadius: "3px 3px 0 0",
                        }}
                      />
                    </div>
                  ))}
                </div>
                <div style={{ display: "flex", justifyContent: "space-between", fontSize: "0.7rem", color: "var(--ink-soft)", marginTop: 4 }}>
                  <span>{stats.dailySeries[0]?.date?.slice(5)}</span>
                  <span>আজ</span>
                </div>
              </div>

              <div>
                <div className="muted" style={{ marginBottom: 8, fontSize: "0.85rem" }}>সাম্প্রতিক অর্ডার</div>
                {stats.recentOrders.length === 0 && <div className="empty-state">এখনো কোনো অর্ডার নেই।</div>}
                {stats.recentOrders.map((o) => {
                  const st = ORDER_STATUS_LABELS[o.status] || ORDER_STATUS_LABELS.submitted;
                  return (
                    <div className="list-row" key={o.id}>
                      <div>
                        <div style={{ fontWeight: 600 }}>{o.productName}</div>
                        <div className="muted">{o.orderId} · ৳{o.orderAmount} · {new Date(o.createdAt).toLocaleDateString("bn-BD")}</div>
                      </div>
                      <span className={`stamp ${st.cls}`}>{st.text}</span>
                    </div>
                  );
                })}
                <div style={{ marginTop: 10 }}>
                  <a className="btn btn-outline btn-sm" href="/member/orders">সব অর্ডার দেখুন</a>
                </div>
              </div>
            </>
          )}
        </div>

        <LiveSalesFeed />
      </div>
    </div>
  );
}

function StatCard({ label, value, accent, small }) {
  return (
    <div className="card" style={{ padding: small ? "12px 14px" : "16px 18px" }}>
      <div className="muted" style={{ marginBottom: 4, fontSize: "0.78rem" }}>{label}</div>
      <div style={{ fontSize: small ? "1.1rem" : "1.35rem", fontWeight: 700, color: accent === "teal" ? "var(--teal)" : accent === "gold" ? "var(--gold)" : accent === "red" ? "var(--red)" : "inherit" }}>
        {value}
      </div>
    </div>
  );
}
