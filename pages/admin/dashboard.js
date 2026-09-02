import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/router";
import { useAuth } from "../../contexts/AuthContext";
import Nav from "../../components/Nav";
import Loading from "../../components/Loading";
import AdminLiveSalesFeed from "../../components/AdminLiveSalesFeed";

const ORDER_BUCKETS = [
  { label: "রিভিউ বাকি", keys: ["submitted", "under_review"], cls: "stamp-pending" },
  { label: "ভ্যালিড সেল", keys: ["approved", "processing", "delivered", "completed"], cls: "stamp-active" },
  { label: "রিজেক্ট/বাতিল", keys: ["rejected", "cancelled"], cls: "stamp-rejected" },
  { label: "রিটার্ন/রিফান্ড", keys: ["returned", "refunded"], cls: "stamp-rejected" },
];

function sumKeys(counts, keys) {
  return keys.reduce((sum, k) => sum + (counts[k] || 0), 0);
}

export default function AdminOverview() {
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
      const res = await fetch("/api/admin/overview", { headers: { Authorization: `Bearer ${token}` } });
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
      <Nav role="admin" active="overview" />
      <div className="container">
        {error && <p className="error-text">{error}</p>}
        {!data && !error && <Loading />}

        {data && (
          <>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: 14, marginBottom: 20 }}>
              <SummaryCard label="মোট সেল" value={`৳${data.totalSales.toFixed(2)}`} />
              <SummaryCard label="কোম্পানির প্রফিট" value={`৳${data.totalCompanyProfit.toFixed(2)}`} />
              <SummaryCard label="প্রফিট পুলে বিতরণ" value={`৳${data.totalDistributedProfit.toFixed(2)}`} />
              <SummaryCard label="প্রোডাক্ট কমিশন পেইড" value={`৳${data.totalCommissionPaid.toFixed(2)}`} accent="teal" />
              <SummaryCard label="মোট উইথড্র (পেইড)" value={`৳${data.totalWithdrawn.toFixed(2)}`} />
              <SummaryCard label="পেন্ডিং উইথড্র" value={`৳${data.pendingWithdrawalAmount.toFixed(2)}`} accent="gold" />
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: 14, marginBottom: 20 }}>
              <SummaryCard label="মোট মেম্বার (অ্যাপ্রুভড)" value={data.memberStatusCounts.active} />
              <SummaryCard label="সেলস-অ্যাক্টিভ মেম্বার" value={data.activeSalesMemberCount} accent="teal" />
              <SummaryCard label="পেন্ডিং রেজিস্ট্রেশন" value={data.memberStatusCounts.pending} accent="gold" />
              <SummaryCard label="হোল্ড করা আছে" value={data.memberStatusCounts.suspended} accent="red" />
              <SummaryCard label="ব্যান করা আছে" value={data.memberStatusCounts.banned} accent="red" />
              <SummaryCard label="রিমুভড" value={data.memberStatusCounts.removed} accent="red" />
            </div>

            <div className="card" style={{ marginBottom: 20 }}>
              <h2 style={{ fontSize: "1.05rem", marginBottom: 14 }}>অর্ডার সারসংক্ষেপ</h2>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(150px, 1fr))", gap: 12 }}>
                {ORDER_BUCKETS.map((b) => (
                  <div key={b.label}>
                    <span className={`stamp ${b.cls}`}>{b.label}</span>
                    <div style={{ fontSize: "1.3rem", fontWeight: 700, marginTop: 8 }}>{sumKeys(data.orderStatusCounts, b.keys)}</div>
                  </div>
                ))}
              </div>
            </div>

            <div className="card" style={{ marginBottom: 20 }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 14 }}>
                <h2 style={{ fontSize: "1.05rem" }}>টপ সেলার</h2>
                <a className="btn btn-outline btn-sm" href="/leaderboard">সম্পূর্ণ লিডারবোর্ড</a>
              </div>
              {data.topSellers.length === 0 && <div className="empty-state">এখনো কোনো ভ্যালিড সেল নেই।</div>}
              {data.topSellers.map((s, i) => (
                <div className="list-row" key={s.uid}>
                  <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
                    <div
                      style={{
                        width: 30, height: 30, borderRadius: "50%",
                        background: i < 3 ? "var(--gold-soft)" : "var(--paper)",
                        color: i < 3 ? "var(--gold)" : "var(--ink-soft)",
                        display: "flex", alignItems: "center", justifyContent: "center",
                        fontWeight: 700, fontSize: "0.85rem", flexShrink: 0,
                      }}
                    >
                      {i + 1}
                    </div>
                    <div>
                      <div style={{ fontWeight: 600 }}>{s.fullName}</div>
                      <div className="muted">{s.memberId} · {s.totalOrders} অর্ডার</div>
                    </div>
                  </div>
                  <div style={{ fontWeight: 700 }}>৳{s.totalSales}</div>
                </div>
              ))}
            </div>
          </>
        )}

        <AdminLiveSalesFeed />
      </div>
    </div>
  );
}

function SummaryCard({ label, value, accent }) {
  const color = accent === "teal" ? "var(--teal)" : accent === "gold" ? "var(--gold)" : accent === "red" ? "var(--red)" : "var(--ink)";
  return (
    <div className="card">
      <div className="muted" style={{ marginBottom: 6, fontSize: "0.85rem" }}>{label}</div>
      <div style={{ fontSize: "1.3rem", fontWeight: 700, color }}>{value}</div>
    </div>
  );
}
