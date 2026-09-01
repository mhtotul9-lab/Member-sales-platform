import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/router";
import { useAuth } from "../../../contexts/AuthContext";
import Nav from "../../../components/Nav";
import Loading from "../../../components/Loading";

const STATUS_LABEL = {
  not_started: { text: "শুরু হয়নি", cls: "stamp-rejected" },
  in_progress: { text: "চলছে", cls: "stamp-pending" },
  completed: { text: "সম্পন্ন", cls: "stamp-active" },
};

export default function MemberTrainings() {
  const { user, profile, loading } = useAuth();
  const router = useRouter();
  const [trainings, setTrainings] = useState(null);
  const [error, setError] = useState("");
  const [acting, setActing] = useState(null);

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
      const res = await fetch("/api/member/trainings", { headers: { Authorization: `Bearer ${token}` } });
      const body = await res.json();
      if (!res.ok) throw new Error(body.error || "লোড করা যায়নি।");
      setTrainings(body.trainings);
    } catch (err) {
      setError(err.message);
    }
  }, [user]);

  useEffect(() => {
    if (profile?.status === "active") load();
  }, [profile, load]);

  async function markComplete(id) {
    setActing(id);
    try {
      const token = await user.getIdToken();
      const res = await fetch(`/api/member/trainings/${id}/complete`, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
      });
      const body = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(body.error || "আপডেট করা যায়নি।");
      load();
    } catch (err) {
      setError(err.message);
    } finally {
      setActing(null);
    }
  }

  if (loading || !profile) return null;

  return (
    <div className="shell">
      <Nav role={profile.role} active="trainings" />
      <div className="container">
        <div className="card">
          <h1 style={{ fontSize: "1.25rem", marginBottom: 16 }}>ট্রেনিং</h1>
          {error && <p className="error-text">{error}</p>}
          {trainings === null && !error && <Loading />}
          {trainings && trainings.length === 0 && <div className="empty-state">এখনো কোনো ট্রেনিং যোগ করা হয়নি।</div>}

          {trainings && trainings.map((t) => {
            const st = STATUS_LABEL[t.progressStatus];
            return (
              <div className="list-row" key={t.id} style={{ flexDirection: "column", alignItems: "stretch" }}>
                <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 8 }}>
                  <div style={{ fontWeight: 600 }}>{t.order}. {t.title}</div>
                  <span className={`stamp ${st.cls}`}>{st.text}</span>
                </div>
                {t.content && <p className="muted" style={{ marginBottom: 8 }}>{t.content}</p>}
                <div style={{ display: "flex", gap: 8 }}>
                  {t.videoUrl && <a className="btn btn-outline btn-sm" href={t.videoUrl} target="_blank" rel="noreferrer">ভিডিও দেখুন</a>}
                  {t.pdfUrl && <a className="btn btn-outline btn-sm" href={t.pdfUrl} target="_blank" rel="noreferrer">PDF দেখুন</a>}
                  {t.progressStatus !== "completed" && (
                    <button className="btn btn-teal btn-sm" disabled={acting === t.id} onClick={() => markComplete(t.id)}>
                      সম্পন্ন করলাম
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
