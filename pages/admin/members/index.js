import { useEffect, useState, useCallback, useMemo } from "react";
import { useRouter } from "next/router";
import { useAuth } from "../../../contexts/AuthContext";
import Nav from "../../../components/Nav";
import Loading from "../../../components/Loading";
import { timeAgo } from "../../../lib/timeAgo";

const STATUS_FILTERS = [
  { value: "", label: "সব" },
  { value: "pending", label: "পেন্ডিং" },
  { value: "active", label: "অ্যাপ্রুভড" },
  { value: "suspended", label: "হোল্ড" },
  { value: "banned", label: "ব্যানড" },
  { value: "removed", label: "রিমুভড" },
  { value: "rejected", label: "রিজেক্টেড" },
];

const ACCOUNT_STATUS_LABEL = {
  pending: { text: "পেন্ডিং", cls: "stamp-pending" },
  active: { text: "অ্যাপ্রুভড", cls: "stamp-active" },
  suspended: { text: "হোল্ড", cls: "stamp-rejected" },
  banned: { text: "ব্যানড", cls: "stamp-rejected" },
  removed: { text: "রিমুভড", cls: "stamp-rejected" },
  rejected: { text: "রিজেক্টেড", cls: "stamp-rejected" },
};

const ONLINE_WINDOW_MS = 2 * 60 * 1000;

function isOnline(lastActiveAt) {
  if (!lastActiveAt) return false;
  return Date.now() - new Date(lastActiveAt).getTime() < ONLINE_WINDOW_MS;
}

export default function AdminMembers() {
  const { user, profile, loading } = useAuth();
  const router = useRouter();
  const [members, setMembers] = useState(null);
  const [filter, setFilter] = useState("");
  const [search, setSearch] = useState("");
  const [error, setError] = useState("");
  const [actingOn, setActingOn] = useState(null);
  const [confirmDeleteUid, setConfirmDeleteUid] = useState(null);
  const [deleteConfirmText, setDeleteConfirmText] = useState("");

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
      const url = filter ? `/api/admin/members?status=${filter}` : "/api/admin/members";
      const res = await fetch(url, { headers: { Authorization: `Bearer ${token}` } });
      const body = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(body.error || "লোড করা যায়নি।");
      setMembers(body.members);
    } catch (err) {
      setError(err.message);
    }
  }, [user, filter]);

  useEffect(() => {
    if (profile?.role === "admin" && profile.status === "active") load();
  }, [profile, load]);

  async function act(uid, status) {
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
      load();
    } catch (err) {
      setError(err.message);
    } finally {
      setActingOn(null);
    }
  }

  async function hardDelete(uid) {
    setActingOn(uid);
    try {
      const token = await user.getIdToken();
      const res = await fetch(`/api/admin/members/${uid}/delete`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
      });
      const body = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(body.error || "ডিলিট করা যায়নি।");
      setConfirmDeleteUid(null);
      setDeleteConfirmText("");
      load();
    } catch (err) {
      setError(err.message);
    } finally {
      setActingOn(null);
    }
  }

  // Online members first (most-recently-active first), then everyone else
  // sorted by their most recent activity. Within "offline", members with a
  // status other than active (hold/banned/removed/rejected) sink to the
  // bottom so the admin's eye lands on real, reachable members first.
  const filtered = useMemo(() => {
    if (!members) return [];
    const q = search.trim().toLowerCase();
    const base = q
      ? members.filter((m) =>
          m.fullName?.toLowerCase().includes(q) ||
          m.email?.toLowerCase().includes(q) ||
          m.phone?.includes(q) ||
          m.memberId?.toLowerCase().includes(q)
        )
      : members;

    return [...base].sort((a, b) => {
      const aOnline = isOnline(a.lastActiveAt);
      const bOnline = isOnline(b.lastActiveAt);
      if (aOnline !== bOnline) return aOnline ? -1 : 1;

      const aInactive = a.status !== "active";
      const bInactive = b.status !== "active";
      if (!aOnline && aInactive !== bInactive) return aInactive ? 1 : -1;

      const aTime = a.lastActiveAt ? new Date(a.lastActiveAt).getTime() : 0;
      const bTime = b.lastActiveAt ? new Date(b.lastActiveAt).getTime() : 0;
      return bTime - aTime;
    });
  }, [members, search]);

  if (loading || !profile) return null;

  return (
    <div className="shell">
      <Nav role="admin" active="members" />
      <div className="container">
        <div className="card">
          <h1 style={{ fontSize: "1.25rem", marginBottom: 4 }}>মেম্বার</h1>
          <p className="muted" style={{ marginBottom: 18 }}>
            অ্যাকাউন্ট স্ট্যাটাস, সেলস অ্যাক্টিভিটি, এবং কে এখন অনলাইনে আছে — সব একসাথে।
          </p>

          <div style={{ display: "flex", gap: 8, marginBottom: 14, flexWrap: "wrap" }}>
            {STATUS_FILTERS.map((f) => (
              <button
                key={f.value}
                className={filter === f.value ? "btn btn-primary btn-sm" : "btn btn-outline btn-sm"}
                onClick={() => setFilter(f.value)}
              >
                {f.label}
              </button>
            ))}
          </div>

          <input
            placeholder="নাম, ইমেইল, ফোন বা মেম্বার আইডি দিয়ে খুঁজুন..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            style={{ width: "100%", padding: "10px 13px", border: "1px solid var(--line)", borderRadius: 7, marginBottom: 18 }}
          />

          {error && <p className="error-text">{error}</p>}
          {members === null && !error && <Loading />}
          {members && filtered.length === 0 && <div className="empty-state">কোনো মেম্বার পাওয়া যায়নি।</div>}

          {filtered.map((m) => {
            const acc = ACCOUNT_STATUS_LABEL[m.status] || ACCOUNT_STATUS_LABEL.pending;
            const online = isOnline(m.lastActiveAt);
            return (
              <div className="list-row" key={m.uid} style={{ flexDirection: "column", alignItems: "stretch" }}>
                <div style={{ display: "flex", justifyContent: "space-between", flexWrap: "wrap", gap: 10 }}>
                  <div>
                    <div style={{ fontWeight: 600, display: "flex", alignItems: "center", gap: 8 }}>
                      <span
                        title={online ? "অনলাইন" : "অফলাইন"}
                        style={{
                          width: 9, height: 9, borderRadius: "50%", flexShrink: 0,
                          background: online ? "var(--teal)" : "var(--line)",
                        }}
                      />
                      {m.fullName} <span className="muted">· {m.memberId}</span>
                    </div>
                    <div className="muted" style={{ fontSize: "0.88rem" }}>{m.email} · {m.phone}</div>
                    <div className="muted" style={{ fontSize: "0.8rem", marginTop: 2 }}>
                      {online ? "এখন অনলাইনে আছে" : m.lastActiveAt ? `শেষ সক্রিয়: ${timeAgo(m.lastActiveAt)}` : "কখনো লগইন করেনি"}
                      {m.lastLoginAt && ` · শেষ লগইন: ${timeAgo(m.lastLoginAt)}`}
                    </div>
                    {(m.referredByMemberCode || m.referralCount > 0) && (
                      <div className="muted" style={{ fontSize: "0.8rem", marginTop: 2 }}>
                        {m.referredByMemberCode && `রেফারার: ${m.referredByMemberCode}`}
                        {m.referredByMemberCode && m.referralCount > 0 && " · "}
                        {m.referralCount > 0 && `রেফার করেছে ${m.referralCount} জন (${m.referralFirstSalesCount || 0}টা প্রথম সেল সম্পন্ন)`}
                      </div>
                    )}
                  </div>
                  <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                    <span className={`stamp ${acc.cls}`}>{acc.text}</span>
                    {m.status === "active" && (
                      <span className={`stamp ${m.liveActivityStatus === "active" ? "stamp-active" : "stamp-rejected"}`}>
                        সেলস {m.liveActivityStatus === "active" ? "অ্যাক্টিভ" : "ইনঅ্যাক্টিভ"}
                      </span>
                    )}
                  </div>
                </div>

                <div style={{ display: "flex", gap: 8, marginTop: 10, flexWrap: "wrap" }}>
                  {m.status === "pending" && (
                    <>
                      <button className="btn btn-teal btn-sm" disabled={actingOn === m.uid} onClick={() => act(m.uid, "active")}>অ্যাপ্রুভ</button>
                      <button className="btn btn-danger btn-sm" disabled={actingOn === m.uid} onClick={() => act(m.uid, "rejected")}>রিজেক্ট</button>
                    </>
                  )}
                  {m.status === "active" && (
                    <>
                      <button className="btn btn-outline btn-sm" disabled={actingOn === m.uid} onClick={() => act(m.uid, "suspended")}>হোল্ড করুন</button>
                      <button className="btn btn-danger btn-sm" disabled={actingOn === m.uid} onClick={() => act(m.uid, "banned")}>ব্যান করুন</button>
                      <button className="btn btn-danger btn-sm" disabled={actingOn === m.uid} onClick={() => act(m.uid, "removed")}>রিমুভ করুন</button>
                    </>
                  )}
                  {(m.status === "suspended" || m.status === "banned" || m.status === "removed") && (
                    <button className="btn btn-teal btn-sm" disabled={actingOn === m.uid} onClick={() => act(m.uid, "active")}>পুনরায় সক্রিয় করুন</button>
                  )}
                  {m.status === "rejected" && (
                    <button className="btn btn-outline btn-sm" disabled={actingOn === m.uid} onClick={() => act(m.uid, "pending")}>পেন্ডিং-এ ফেরত পাঠান</button>
                  )}
                  {confirmDeleteUid !== m.uid && (
                    <button
                      className="btn btn-danger btn-sm"
                      style={{ marginLeft: "auto" }}
                      disabled={actingOn === m.uid}
                      onClick={() => { setConfirmDeleteUid(m.uid); setDeleteConfirmText(""); }}
                    >
                      অ্যাকাউন্ট ডিলিট করুন
                    </button>
                  )}
                </div>

                {confirmDeleteUid === m.uid && (
                  <div style={{ marginTop: 10, padding: 12, borderRadius: 8, background: "var(--red-soft)" }}>
                    <p style={{ fontSize: "0.85rem", marginBottom: 8 }}>
                      এই অ্যাকাউন্ট পুরোপুরি ডিলিট হয়ে যাবে — এটা আর ফিরিয়ে আনা যাবে না। নিশ্চিত করতে নিচে <strong>{m.memberId}</strong> লিখুন।
                    </p>
                    <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                      <input
                        value={deleteConfirmText}
                        onChange={(e) => setDeleteConfirmText(e.target.value)}
                        placeholder={m.memberId}
                        style={{ flex: "1 1 160px", padding: "8px 10px", border: "1px solid var(--line)", borderRadius: 7 }}
                      />
                      <button
                        className="btn btn-danger btn-sm"
                        disabled={actingOn === m.uid || deleteConfirmText.trim() !== m.memberId}
                        onClick={() => hardDelete(m.uid)}
                      >
                        চিরতরে ডিলিট করুন
                      </button>
                      <button className="btn btn-outline btn-sm" disabled={actingOn === m.uid} onClick={() => setConfirmDeleteUid(null)}>বাতিল</button>
                    </div>
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
