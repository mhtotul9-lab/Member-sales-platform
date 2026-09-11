import { useEffect, useState } from "react";
import { useRouter } from "next/router";
import { useAuth } from "../../../contexts/AuthContext";
import Nav from "../../../components/Nav";
import Loading from "../../../components/Loading";
import ErrorText from "../../../components/ErrorText";

export default function AdminTrainingDetail() {
  const { user, profile, loading } = useAuth();
  const router = useRouter();
  const { id } = router.query;
  const [form, setForm] = useState(null);
  const [completedCount, setCompletedCount] = useState(null);
  const [members, setMembers] = useState(null);
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (loading) return;
    if (!user) { router.replace("/login"); return; }
    if (!profile || profile.status !== "active") { router.replace("/pending"); return; }
    if (profile.role !== "admin") { router.replace("/member/dashboard"); return; }
  }, [user, profile, loading, router]);

  useEffect(() => {
    if (!user || !id) return;
    (async () => {
      try {
        const token = await user.getIdToken();
        const res = await fetch(`/api/admin/trainings/${id}`, { headers: { Authorization: `Bearer ${token}` } });
        const body = await res.json();
        if (!res.ok) throw new Error(body.error || "লোড করা যায়নি।");
        setForm(body.training);
        setCompletedCount(body.completedCount);
        setMembers(body.members || null);
      } catch (err) {
        setError(err.message);
      }
    })();
  }, [user, id]);

  async function handleSubmit(e) {
    e.preventDefault();
    setError("");
    setSaving(true);
    try {
      const token = await user.getIdToken();
      const res = await fetch(`/api/admin/trainings/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify(form),
      });
      const body = await res.json();
      if (!res.ok) throw new Error(body.error || "সেভ করা যায়নি।");
      router.replace("/admin/trainings");
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  }

  if (loading || !profile) return null;

  return (
    <div className="shell">
      <Nav role="admin" active="trainings" />
      <div className="container" style={{ maxWidth: 560 }}>
        <div className="card">
          <h1 style={{ fontSize: "1.25rem", marginBottom: 6 }}>ট্রেনিং এডিট করুন</h1>
          {completedCount !== null && <p className="muted" style={{ marginBottom: 20 }}>{completedCount} জন মেম্বার সম্পন্ন করেছে</p>}

          {!form && !error && <Loading />}
          {error && <ErrorText>{error}</ErrorText>}

          {form && (
            <form onSubmit={handleSubmit}>
              <div className="field">
                <label htmlFor="title">টাইটেল</label>
                <input id="title" required value={form.title} onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))} />
              </div>
              <div className="field">
                <label htmlFor="content">বিস্তারিত/নির্দেশনা</label>
                <textarea id="content" rows={4} value={form.content} onChange={(e) => setForm((f) => ({ ...f, content: e.target.value }))} />
              </div>
              <div className="field">
                <label htmlFor="videoUrl">ভিডিও URL</label>
                <input id="videoUrl" value={form.videoUrl} onChange={(e) => setForm((f) => ({ ...f, videoUrl: e.target.value }))} />
              </div>
              <div className="field">
                <label htmlFor="pdfUrl">PDF URL</label>
                <input id="pdfUrl" value={form.pdfUrl} onChange={(e) => setForm((f) => ({ ...f, pdfUrl: e.target.value }))} />
              </div>
              <button className="btn btn-primary" type="submit" disabled={saving}>
                {saving ? "সেভ হচ্ছে..." : "পরিবর্তন সেভ করুন"}
              </button>
            </form>
          )}
        </div>

        {members && (
          <div className="card" style={{ marginTop: 20 }}>
            <h2 style={{ fontSize: "1.05rem", marginBottom: 4 }}>মেম্বার সম্পন্ন করেছে কি না</h2>
            <p className="muted" style={{ marginBottom: 16, fontSize: "0.85rem" }}>
              {completedCount} / {members.length} জন অ্যাক্টিভ মেম্বার এই ট্রেনিং সম্পন্ন করেছে
            </p>
            {members.length === 0 && <div className="empty-state">কোনো অ্যাক্টিভ মেম্বার নেই।</div>}
            {members.map((m) => (
              <div className="list-row" key={m.uid}>
                <div>
                  <div style={{ fontWeight: 600 }}>{m.fullName} <span className="muted">· {m.memberId}</span></div>
                  <div className="muted" style={{ fontSize: "0.85rem" }}>{m.phone}</div>
                </div>
                <span className={`stamp ${m.completed ? "stamp-active" : "stamp-rejected"}`}>
                  {m.completed ? "সম্পন্ন করেছে" : "করেনি"}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
