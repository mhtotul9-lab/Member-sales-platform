import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/router";
import { useAuth } from "../../../contexts/AuthContext";
import Nav from "../../../components/Nav";

const STATUS_LABEL = {
  pending: { text: "পেন্ডিং", cls: "stamp-pending" },
  approved: { text: "অ্যাপ্রুভড", cls: "stamp-active" },
  paid: { text: "পেইড", cls: "stamp-active" },
  rejected: { text: "রিজেক্টেড", cls: "stamp-rejected" },
};

export default function AdminWithdrawals() {
  const { user, profile, loading } = useAuth();
  const router = useRouter();
  const [withdrawals, setWithdrawals] = useState(null);
  const [error, setError] = useState("");
  const [acting, setActing] = useState(null);
  const [refInput, setRefInput] = useState({});

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
      const res = await fetch("/api/admin/withdrawals", { headers: { Authorization: `Bearer ${token}` } });
      const body = await res.json();
      if (!res.ok) throw new Error(body.error || "লোড করা যায়নি।");
      setWithdrawals(body.withdrawals);
    } catch (err) {
      setError(err.message);
    }
  }, [user]);

  useEffect(() => {
    if (profile?.role === "admin" && profile.status === "active") load();
  }, [profile, load]);

  async function act(id, status) {
    setActing(id);
    try {
      const token = await user.getIdToken();
      const res = await fetch(`/api/admin/withdrawals/${id}/status`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ status, paymentReference: refInput[id] || null }),
      });
      const body = await res.json();
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
      <Nav role="admin" active="withdrawals" />
      <div className="container">
        <div className="card">
          <h1 style={{ fontSize: "1.25rem", marginBottom: 20 }}>উইথড্র ম্যানেজমেন্ট</h1>
          {error && <p className="error-text">{error}</p>}
          {withdrawals === null && !error && <p className="muted">লোড হচ্ছে...</p>}
          {withdrawals && withdrawals.length === 0 && <div className="empty-state">কোনো উইথড্র রিকোয়েস্ট নেই।</div>}

          {withdrawals && withdrawals.map((w) => {
            const st = STATUS_LABEL[w.status] || STATUS_LABEL.pending;
            return (
              <div className="list-row" key={w.id} style={{ flexDirection: "column", alignItems: "stretch" }}>
                <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 8 }}>
                  <div>
                    <div style={{ fontWeight: 600 }}>{w.memberName} · ৳{w.amount}</div>
                    <div className="muted">{w.method} · {w.accountNumber}</div>
                    <div className="muted">{new Date(w.requestedAt).toLocaleString("bn-BD")}</div>
                  </div>
                  <span className={`stamp ${st.cls}`}>{st.text}</span>
                </div>
                {w.status !== "paid" && w.status !== "rejected" && (
                  <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
                    {w.status === "pending" && (
                      <button className="btn btn-teal btn-sm" disabled={acting === w.id} onClick={() => act(w.id, "approved")}>
                        অ্যাপ্রুভ
                      </button>
                    )}
                    {w.status === "approved" && (
                      <>
                        <input
                          placeholder="পেমেন্ট রেফারেন্স (ঐচ্ছিক)"
                          value={refInput[w.id] || ""}
                          onChange={(e) => setRefInput((r) => ({ ...r, [w.id]: e.target.value }))}
                          style={{ padding: "8px 10px", border: "1px solid var(--line)", borderRadius: 6, fontSize: "0.85rem" }}
                        />
                        <button className="btn btn-teal btn-sm" disabled={acting === w.id} onClick={() => act(w.id, "paid")}>
                          পেইড হিসেবে মার্ক করুন
                        </button>
                      </>
                    )}
                    <button className="btn btn-danger btn-sm" disabled={acting === w.id} onClick={() => act(w.id, "rejected")}>
                      রিজেক্ট
                    </button>
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
