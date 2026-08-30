import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/router";
import { useAuth } from "../../contexts/AuthContext";
import Nav from "../../components/Nav";

export default function AdminProfit() {
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
      const res = await fetch("/api/admin/profit-pools", { headers: { Authorization: `Bearer ${token}` } });
      const body = await res.json();
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
      <Nav role="admin" active="profit" />
      <div className="container">
        {error && <p className="error-text">{error}</p>}
        {!data && !error && <p className="muted">লোড হচ্ছে...</p>}

        {data && (
          <>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: 14, marginBottom: 20 }}>
              <div className="card">
                <div className="muted" style={{ marginBottom: 6 }}>মোট প্রফিট পুল</div>
                <div style={{ fontSize: "1.4rem", fontWeight: 700 }}>৳{data.totals.totalPoolAmount.toFixed(2)}</div>
              </div>
              <div className="card">
                <div className="muted" style={{ marginBottom: 6 }}>বিতরণ করা প্রফিট</div>
                <div style={{ fontSize: "1.4rem", fontWeight: 700 }}>৳{data.totals.totalDistributed.toFixed(2)}</div>
              </div>
            </div>

            <div className="card">
              <h1 style={{ fontSize: "1.2rem", marginBottom: 16 }}>প্রফিট পুল হিস্ট্রি</h1>
              {data.pools.length === 0 && <div className="empty-state">এখনো কোনো প্রফিট পুল তৈরি হয়নি — একটা অর্ডার Approve করলে এখানে দেখাবে।</div>}
              {data.pools.map((p) => (
                <div className="list-row" key={p.id}>
                  <div>
                    <div style={{ fontWeight: 600 }}>{p.orderId}</div>
                    <div className="muted">
                      পুল ৳{p.poolAmount} · {p.eligibleMemberIds.length} জন eligible member
                      {p.distributed ? ` · জনপ্রতি ৳${p.perMemberShare}` : ""}
                    </div>
                    {p.reversedAt && <div className="error-text" style={{ marginTop: 4 }}>রিভার্সড (রিটার্ন/রিফান্ড)</div>}
                    {!p.distributed && <div className="muted" style={{ marginTop: 4 }}>{p.note}</div>}
                  </div>
                  <span className={`stamp ${p.reversedAt ? "stamp-rejected" : p.distributed ? "stamp-active" : "stamp-pending"}`}>
                    {p.reversedAt ? "রিভার্সড" : p.distributed ? "বিতরণ হয়েছে" : "অবিতরণকৃত"}
                  </span>
                </div>
              ))}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
