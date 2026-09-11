import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/router";
import { useAuth } from "../contexts/AuthContext";
import Nav from "../components/Nav";
import Loading from "../components/Loading";
import ErrorText from "../components/ErrorText";

export default function Notices() {
  const { user, profile, loading } = useAuth();
  const router = useRouter();
  const [notices, setNotices] = useState(null);
  const [error, setError] = useState("");
  const [form, setForm] = useState({ title: "", message: "" });
  const [submitting, setSubmitting] = useState(false);
  const [deletingId, setDeletingId] = useState(null);

  useEffect(() => {
    if (loading) return;
    if (!user) { router.replace("/login"); return; }
    if (!profile || profile.status !== "active") { router.replace("/pending"); return; }
  }, [user, profile, loading, router]);

  const isAdmin = profile?.role === "admin";

  const load = useCallback(async () => {
    if (!user) return;
    setError("");
    try {
      const token = await user.getIdToken();
      const res = await fetch("/api/notices", { headers: { Authorization: `Bearer ${token}` } });
      const body = await res.json();
      if (!res.ok) throw new Error(body.error || "লোড করা যায়নি।");
      setNotices(body.notices);
    } catch (err) {
      setError(err.message);
    }
  }, [user]);

  useEffect(() => {
    if (profile?.status === "active") load();
  }, [profile, load]);

  async function handleSubmit(e) {
    e.preventDefault();
    setError("");
    setSubmitting(true);
    try {
      const token = await user.getIdToken();
      const res = await fetch("/api/admin/notices", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify(form),
      });
      const body = await res.json();
      if (!res.ok) throw new Error(body.error || "পোস্ট করা যায়নি।");
      setForm({ title: "", message: "" });
      load();
    } catch (err) {
      setError(err.message);
    } finally {
      setSubmitting(false);
    }
  }

  async function handleDelete(id) {
    setDeletingId(id);
    try {
      const token = await user.getIdToken();
      const res = await fetch(`/api/admin/notices/${id}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` },
      });
      const body = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(body.error || "মুছা যায়নি।");
      load();
    } catch (err) {
      setError(err.message);
    } finally {
      setDeletingId(null);
    }
  }

  if (loading || !profile) return null;

  return (
    <div className="shell">
      <Nav role={profile.role} active="notices" />
      <div className="container" style={{ maxWidth: 680 }}>
        {isAdmin && (
          <div className="card" style={{ marginBottom: 20 }}>
            <h1 style={{ fontSize: "1.25rem", marginBottom: 16 }}>নতুন নোটিস দিন</h1>
            <p className="muted" style={{ marginBottom: 16, fontSize: "0.88rem" }}>
              এখানে যা লিখবেন তা সব অ্যাক্টিভ মেম্বার নোটিফিকেশন বেলে সাথে সাথে দেখতে পাবে, আর এই পেজে সবসময় থেকে যাবে।
            </p>
            <form onSubmit={handleSubmit}>
              <div className="field">
                <label htmlFor="title">শিরোনাম</label>
                <input id="title" required value={form.title} onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))} />
              </div>
              <div className="field">
                <label htmlFor="message">বার্তা</label>
                <textarea id="message" rows={4} required value={form.message} onChange={(e) => setForm((f) => ({ ...f, message: e.target.value }))} />
              </div>
              {error && <ErrorText>{error}</ErrorText>}
              <button className="btn btn-primary" type="submit" disabled={submitting}>
                {submitting ? "পোস্ট হচ্ছে..." : "নোটিস পোস্ট করুন"}
              </button>
            </form>
          </div>
        )}

        <div className="card">
          <h2 style={{ fontSize: "1.05rem", marginBottom: 16 }}>{isAdmin ? "সব নোটিস" : "নোটিস"}</h2>
          {!isAdmin && error && <ErrorText>{error}</ErrorText>}
          {notices === null && !error && <Loading />}
          {notices && notices.length === 0 && <div className="empty-state">এখনো কোনো নোটিস দেওয়া হয়নি।</div>}

          {notices && notices.map((n) => (
            <div className="list-row" key={n.id} style={{ flexDirection: "column", alignItems: "stretch" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 10, flexWrap: "wrap" }}>
                <div style={{ fontWeight: 700, fontSize: "1.02rem" }}>{n.title}</div>
                <span className="muted" style={{ fontSize: "0.8rem", whiteSpace: "nowrap" }}>
                  {new Date(n.createdAt).toLocaleString("bn-BD")}
                </span>
              </div>
              <p style={{ marginTop: 8, whiteSpace: "pre-wrap", lineHeight: 1.7, fontSize: "0.95rem" }}>{n.message}</p>
              {isAdmin && (
                <button
                  className="btn btn-danger btn-sm"
                  style={{ alignSelf: "flex-start", marginTop: 10 }}
                  disabled={deletingId === n.id}
                  onClick={() => handleDelete(n.id)}
                >
                  মুছে ফেলুন
                </button>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
