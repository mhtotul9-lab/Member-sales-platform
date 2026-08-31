import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/router";
import { useAuth } from "../../../contexts/AuthContext";
import Nav from "../../../components/Nav";

export default function AdminTrainings() {
  const { user, profile, loading } = useAuth();
  const router = useRouter();
  const [trainings, setTrainings] = useState(null);
  const [form, setForm] = useState({ title: "", content: "", videoUrl: "", pdfUrl: "" });
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);

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
      const res = await fetch("/api/admin/trainings", { headers: { Authorization: `Bearer ${token}` } });
      const body = await res.json();
      if (!res.ok) throw new Error(body.error || "লোড করা যায়নি।");
      setTrainings(body.trainings);
    } catch (err) {
      setError(err.message);
    }
  }, [user]);

  useEffect(() => {
    if (profile?.role === "admin" && profile.status === "active") load();
  }, [profile, load]);

  async function handleSubmit(e) {
    e.preventDefault();
    setError("");
    setSubmitting(true);
    try {
      const token = await user.getIdToken();
      const res = await fetch("/api/admin/trainings", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify(form),
      });
      const body = await res.json();
      if (!res.ok) throw new Error(body.error || "সেভ করা যায়নি।");
      setForm({ title: "", content: "", videoUrl: "", pdfUrl: "" });
      load();
    } catch (err) {
      setError(err.message);
    } finally {
      setSubmitting(false);
    }
  }

  if (loading || !profile) return null;

  return (
    <div className="shell">
      <Nav role="admin" active="trainings" />
      <div className="container" style={{ maxWidth: 640 }}>
        <div className="card" style={{ marginBottom: 20 }}>
          <h1 style={{ fontSize: "1.25rem", marginBottom: 20 }}>নতুন ট্রেনিং যোগ করুন</h1>
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
              <label htmlFor="videoUrl">ভিডিও URL (ঐচ্ছিক)</label>
              <input id="videoUrl" value={form.videoUrl} onChange={(e) => setForm((f) => ({ ...f, videoUrl: e.target.value }))} placeholder="https://youtu.be/..." />
            </div>
            <div className="field">
              <label htmlFor="pdfUrl">PDF URL (ঐচ্ছিক)</label>
              <input id="pdfUrl" value={form.pdfUrl} onChange={(e) => setForm((f) => ({ ...f, pdfUrl: e.target.value }))} placeholder="https://..." />
            </div>
            {error && <p className="error-text">{error}</p>}
            <button className="btn btn-primary" type="submit" disabled={submitting}>
              {submitting ? "সেভ হচ্ছে..." : "ট্রেনিং তৈরি করুন"}
            </button>
          </form>
        </div>

        <div className="card">
          <h2 style={{ fontSize: "1.05rem", marginBottom: 14 }}>সব ট্রেনিং</h2>
          {trainings === null && <p className="muted">লোড হচ্ছে...</p>}
          {trainings && trainings.length === 0 && <div className="empty-state">এখনো কোনো ট্রেনিং যোগ করা হয়নি।</div>}
          {trainings && trainings.map((t) => (
            <div className="list-row" key={t.id}>
              <div style={{ fontWeight: 600 }}>{t.order}. {t.title}</div>
              <a className="btn btn-outline btn-sm" href={`/admin/trainings/${t.id}`}>বিস্তারিত</a>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
