import { useEffect, useState, useCallback, useMemo } from "react";
import { useRouter } from "next/router";
import { useAuth } from "../../../contexts/AuthContext";
import Nav from "../../../components/Nav";
import Loading from "../../../components/Loading";
import ErrorText from "../../../components/ErrorText";
import { timeAgo } from "../../../lib/timeAgo";

export default function AdminTrainingProgress() {
  const { user, profile, loading } = useAuth();
  const router = useRouter();
  const [data, setData] = useState(null);
  const [search, setSearch] = useState("");
  const [openUid, setOpenUid] = useState(null);
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
      const res = await fetch("/api/admin/trainings/progress", { headers: { Authorization: `Bearer ${token}` } });
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

  // অ্যাক্টিভ মেম্বার আগে, তারপর কম সম্পন্ন করা মেম্বার উপরে — যাদের ফলোআপ দরকার তারা চোখে পড়বে সবার আগে
  const filtered = useMemo(() => {
    if (!data) return [];
    const q = search.trim().toLowerCase();
    const base = q
      ? data.members.filter((m) =>
          m.fullName?.toLowerCase().includes(q) || m.memberId?.toLowerCase().includes(q) || m.phone?.includes(q)
        )
      : data.members;
    return [...base].sort((a, b) => {
      const aActive = a.status === "active";
      const bActive = b.status === "active";
      if (aActive !== bActive) return aActive ? -1 : 1;
      return a.completedCount - b.completedCount;
    });
  }, [data, search]);

  if (loading || !profile) return null;

  return (
    <div className="shell">
      <Nav role="admin" active="trainings" />
      <div className="container">
        <div className="card">
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 4, flexWrap: "wrap", gap: 10 }}>
            <h1 style={{ fontSize: "1.25rem" }}>মেম্বার ট্রেনিং প্রগ্রেস</h1>
            <a className="btn btn-outline btn-sm" href="/admin/trainings">← ট্রেনিং তালিকায় ফিরুন</a>
          </div>
          {data && (
            <p className="muted" style={{ marginBottom: 16 }}>
              মোট {data.totalTrainings} টা ট্রেনিং আছে — কে কতগুলো সম্পন্ন করেছে তা নিচে দেখুন।
            </p>
          )}

          <input
            placeholder="নাম, মেম্বার আইডি বা ফোন দিয়ে খুঁজুন..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            style={{ width: "100%", padding: "10px 13px", border: "1px solid var(--line)", borderRadius: 7, marginBottom: 18 }}
          />

          {error && <ErrorText>{error}</ErrorText>}
          {data === null && !error && <Loading />}
          {data && filtered.length === 0 && <div className="empty-state">কোনো মেম্বার পাওয়া যায়নি।</div>}

          {filtered.map((m) => {
            const total = data.totalTrainings;
            const pct = total > 0 ? Math.round((m.completedCount / total) * 100) : 0;
            const isOpen = openUid === m.uid;
            return (
              <div className="list-row" key={m.uid} style={{ flexDirection: "column", alignItems: "stretch" }}>
                <div
                  style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 10, cursor: "pointer" }}
                  onClick={() => setOpenUid(isOpen ? null : m.uid)}
                >
                  <div>
                    <div style={{ fontWeight: 600 }}>{m.fullName} <span className="muted">· {m.memberId}</span></div>
                    <div className="muted" style={{ fontSize: "0.85rem" }}>{m.phone}</div>
                  </div>
                  <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                    <div style={{ width: 110, height: 8, borderRadius: 4, background: "var(--paper)", overflow: "hidden" }}>
                      <div style={{ width: `${pct}%`, height: "100%", background: pct === 100 ? "var(--teal)" : "var(--brand, #2563eb)" }} />
                    </div>
                    <span className={`stamp ${m.completedCount === total && total > 0 ? "stamp-active" : "stamp-pending"}`}>
                      {m.completedCount} / {total} সম্পন্ন
                    </span>
                  </div>
                </div>

                {isOpen && (
                  <div style={{ marginTop: 10, paddingTop: 10, borderTop: "1px solid var(--line)" }}>
                    {m.completedTrainings.length === 0 ? (
                      <p className="muted" style={{ fontSize: "0.85rem" }}>এই মেম্বার এখনো কোনো ট্রেনিং সম্পন্ন করেনি।</p>
                    ) : (
                      m.completedTrainings.map((t) => (
                        <div key={t.id} style={{ display: "flex", justifyContent: "space-between", fontSize: "0.88rem", padding: "6px 0" }}>
                          <span>✓ {t.title}</span>
                          <span className="muted">{timeAgo(t.completedAt)}</span>
                        </div>
                      ))
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
