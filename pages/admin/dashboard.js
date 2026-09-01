import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/router";
import { useAuth } from "../../contexts/AuthContext";
import Nav from "../../components/Nav";
import Loading from "../../components/Loading";
import AdminLiveSalesFeed from "../../components/AdminLiveSalesFeed";

export default function AdminDashboard() {
  const { user, profile, loading } = useAuth();
  const router = useRouter();
  const [members, setMembers] = useState(null);
  const [fetchError, setFetchError] = useState("");
  const [actingOn, setActingOn] = useState(null);

  useEffect(() => {
    if (loading) return;
    if (!user) { router.replace("/login"); return; }
    if (!profile || profile.status !== "active") { router.replace("/pending"); return; }
    if (profile.role !== "admin") { router.replace("/member/dashboard"); return; }
  }, [user, profile, loading, router]);

  const loadPending = useCallback(async () => {
    if (!user) return;
    setFetchError("");
    try {
      const token = await user.getIdToken();
      const res = await fetch("/api/admin/members?status=pending", {
        headers: { Authorization: `Bearer ${token}` },
      });
      const body = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(body.error || "লোড করা যায়নি।");
      setMembers(body.members);
    } catch (err) {
      setFetchError(err.message);
    }
  }, [user]);

  useEffect(() => {
    if (profile?.role === "admin" && profile.status === "active") loadPending();
  }, [profile, loadPending]);

  async function act(uid, status) {
    if (!user) return;
    setActingOn(uid);
    try {
      const token = await user.getIdToken();
      const res = await fetch(`/api/admin/members/${uid}/status`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ status }),
      });
      const body = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(body.error || "আপডেট করা যায়নি।");
      setMembers((list) => list.filter((m) => m.uid !== uid));
    } catch (err) {
      setFetchError(err.message);
    } finally {
      setActingOn(null);
    }
  }

  if (loading || !profile) return null;

  return (
    <div className="shell">
      <Nav role="admin" active="members" />
      <div className="container">
        <AdminLiveSalesFeed />
        <div className="card">
          <h1 style={{ fontSize: "1.25rem", marginBottom: 4 }}>মেম্বার অ্যাপ্রুভাল</h1>
          <p className="muted" style={{ marginBottom: 20 }}>নতুন রেজিস্ট্রেশনগুলো এখানে রিভিউ করুন।</p>

          {fetchError && <p className="error-text">{fetchError}</p>}

          {members === null && !fetchError && <Loading />}

          {members && members.length === 0 && (
            <div className="empty-state">এই মুহূর্তে কোনো পেন্ডিং রেজিস্ট্রেশন নেই।</div>
          )}

          {members && members.map((m) => (
            <div className="list-row" key={m.uid}>
              <div>
                <div style={{ fontWeight: 600 }}>{m.fullName} <span className="muted">· {m.memberId}</span></div>
                <div className="muted">{m.email} · {m.phone}</div>
              </div>
              <div style={{ display: "flex", gap: 8 }}>
                <button
                  className="btn btn-teal btn-sm"
                  disabled={actingOn === m.uid}
                  onClick={() => act(m.uid, "active")}
                >
                  অ্যাপ্রুভ
                </button>
                <button
                  className="btn btn-danger btn-sm"
                  disabled={actingOn === m.uid}
                  onClick={() => act(m.uid, "rejected")}
                >
                  রিজেক্ট
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
