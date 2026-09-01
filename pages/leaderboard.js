import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/router";
import { useAuth } from "../contexts/AuthContext";
import Nav from "../components/Nav";
import Loading from "../components/Loading";

const TABS = [
  { value: "week", label: "সাপ্তাহিক" },
  { value: "month", label: "মাসিক" },
  { value: "all", label: "অল-টাইম" },
];

export default function Leaderboard() {
  const { user, profile, loading } = useAuth();
  const router = useRouter();
  const [range, setRange] = useState("week");
  const [rows, setRows] = useState(null);
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
      const res = await fetch(`/api/leaderboard?range=${range}`, { headers: { Authorization: `Bearer ${token}` } });
      const body = await res.json();
      if (!res.ok) throw new Error(body.error || "লোড করা যায়নি।");
      setRows(body.leaderboard);
    } catch (err) {
      setError(err.message);
    }
  }, [user, range]);

  useEffect(() => {
    if (profile?.status === "active") load();
  }, [profile, load]);

  if (loading || !profile) return null;

  return (
    <div className="shell">
      <Nav role={profile.role} active="leaderboard" />
      <div className="container">
        <div className="card">
          <h1 style={{ fontSize: "1.25rem", marginBottom: 14 }}>লিডারবোর্ড</h1>
          <div style={{ display: "flex", gap: 8, marginBottom: 20 }}>
            {TABS.map((t) => (
              <button
                key={t.value}
                className={range === t.value ? "btn btn-primary btn-sm" : "btn btn-outline btn-sm"}
                onClick={() => setRange(t.value)}
              >
                {t.label}
              </button>
            ))}
          </div>

          {error && <p className="error-text">{error}</p>}
          {rows === null && !error && <Loading />}
          {rows && rows.length === 0 && <div className="empty-state">এই সময়ে কোনো ভ্যালিড সেল নেই।</div>}

          {rows && rows.map((r) => (
            <div className="list-row" key={r.memberId}>
              <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
                <div
                  style={{
                    width: 32, height: 32, borderRadius: "50%",
                    background: r.rank <= 3 ? "var(--gold-soft)" : "var(--paper)",
                    color: r.rank <= 3 ? "var(--gold)" : "var(--ink-soft)",
                    display: "flex", alignItems: "center", justifyContent: "center",
                    fontWeight: 700, fontSize: "0.9rem",
                  }}
                >
                  {r.rank}
                </div>
                <div>
                  <div style={{ fontWeight: 600 }}>{r.fullName}</div>
                  <div className="muted">{r.memberCode} · {r.totalOrders} অর্ডার</div>
                </div>
              </div>
              <div style={{ fontWeight: 700 }}>৳{r.totalSales}</div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
