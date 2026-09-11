import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/router";
import { useAuth } from "../../../contexts/AuthContext";
import Nav from "../../../components/Nav";
import Loading from "../../../components/Loading";
import ErrorText from "../../../components/ErrorText";

const STATUS_LABEL = {
  not_started: { text: "শুরু হয়নি", cls: "stamp-rejected" },
  in_progress: { text: "চলছে", cls: "stamp-pending" },
  completed: { text: "সম্পন্ন", cls: "stamp-active" },
};

function getYoutubeEmbedUrl(url) {
  const match = url.match(/(?:youtu\.be\/|youtube\.com\/(?:watch\?v=|embed\/|shorts\/))([a-zA-Z0-9_-]{11})/);
  return match ? `https://www.youtube.com/embed/${match[1]}` : null;
}

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
          {error && <ErrorText>{error}</ErrorText>}
          {trainings === null && !error && <Loading />}
          {trainings && trainings.length === 0 && <div className="empty-state">এখনো কোনো ট্রেনিং যোগ করা হয়নি।</div>}

          {trainings && trainings.map((t) => {
            const st = STATUS_LABEL[t.progressStatus];
            const yt = t.videoUrl ? getYoutubeEmbedUrl(t.videoUrl) : null;
            return (
              <div className="list-row" key={t.id} style={{ flexDirection: "column", alignItems: "stretch" }}>
                <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 8 }}>
                  <div style={{ fontWeight: 600, fontSize: "1.05rem" }}>{t.order}. {t.title}</div>
                  <span className={`stamp ${st.cls}`}>{st.text}</span>
                </div>

                {t.content && (
                  <p style={{ marginBottom: 14, whiteSpace: "pre-wrap", lineHeight: 1.75, fontSize: "0.96rem" }}>
                    {t.content}
                  </p>
                )}

                {t.videoUrl && (
                  <div style={{ marginBottom: 14 }}>
                    {yt ? (
                      <iframe
                        width="100%"
                        style={{ aspectRatio: "16/9", maxWidth: 640, borderRadius: 10, border: "1px solid var(--line)" }}
                        src={yt}
                        title={t.title}
                        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                        allowFullScreen
                      />
                    ) : (
                      <video
                        controls
                        style={{ width: "100%", maxWidth: 640, borderRadius: 10, border: "1px solid var(--line)", background: "#000" }}
                        src={t.videoUrl}
                      />
                    )}
                  </div>
                )}

                <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                  {t.videoUrl && <a className="btn btn-outline btn-sm" href={t.videoUrl} target="_blank" rel="noreferrer">ভিডিও লিংক (নতুন ট্যাবে)</a>}
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
