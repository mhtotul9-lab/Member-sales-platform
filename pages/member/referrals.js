import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/router";
import { useAuth } from "../../contexts/AuthContext";
import Nav from "../../components/Nav";
import Loading from "../../components/Loading";
import { timeAgo } from "../../lib/timeAgo";

function CopyButton({ text }) {
  const [copied, setCopied] = useState(false);
  return (
    <button
      type="button"
      className="btn btn-teal btn-sm"
      onClick={async () => {
        try {
          await navigator.clipboard.writeText(text);
          setCopied(true);
          setTimeout(() => setCopied(false), 1500);
        } catch {
          // clipboard permission denied — nothing more we can do here
        }
      }}
    >
      {copied ? "কপি হয়েছে ✓" : "কোড কপি করুন"}
    </button>
  );
}

export default function MemberReferrals() {
  const { user, profile, loading } = useAuth();
  const router = useRouter();
  const [data, setData] = useState(null);
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
      const res = await fetch("/api/member/referrals", { headers: { Authorization: `Bearer ${token}` } });
      const body = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(body.error || "লোড করা যায়নি।");
      setData(body);
    } catch (err) {
      setError(err.message);
    }
  }, [user]);

  useEffect(() => {
    if (profile?.status === "active") load();
  }, [profile, load]);

  if (loading || !profile) return null;

  return (
    <div className="shell">
      <Nav role={profile.role} active="referrals" />
      <div className="container">
        {error && <p className="error-text">{error}</p>}
        {!data && !error && <Loading />}

        {data && (
          <>
            <div className="card" style={{ marginBottom: 20 }}>
              <h1 style={{ fontSize: "1.25rem", marginBottom: 6 }}>রেফারেল প্রোগ্রাম</h1>
              <p className="muted" style={{ marginBottom: 16 }}>
                আপনার Member Code নতুন কাউকে দিন — সে রেজিস্ট্রেশনের সময় এই কোড দিলে আপনি তার রেফারার হয়ে যাবেন। সে প্রথম সফল সেল করলেই আপনি ৳২০০ বোনাস পাবেন।
              </p>
              <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                <div style={{ fontSize: "1.3rem", fontWeight: 800, fontFamily: "var(--font-display)" }}>{data.memberCode}</div>
                <CopyButton text={data.memberCode} />
              </div>
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))", gap: 14, marginBottom: 20 }}>
              <div className="card">
                <div className="muted" style={{ marginBottom: 6, fontSize: "0.85rem" }}>মোট রেফার করেছেন</div>
                <div style={{ fontSize: "1.3rem", fontWeight: 700 }}>{data.referralCount}</div>
              </div>
              <div className="card">
                <div className="muted" style={{ marginBottom: 6, fontSize: "0.85rem" }}>প্রথম সেল সম্পন্ন</div>
                <div style={{ fontSize: "1.3rem", fontWeight: 700, color: "var(--teal)" }}>{data.referralFirstSalesCount}</div>
              </div>
              <div className="card">
                <div className="muted" style={{ marginBottom: 6, fontSize: "0.85rem" }}>অপেক্ষমাণ</div>
                <div style={{ fontSize: "1.3rem", fontWeight: 700, color: "var(--gold)" }}>
                  {data.referralCount - data.referralFirstSalesCount}
                </div>
              </div>
              <div className="card">
                <div className="muted" style={{ marginBottom: 6, fontSize: "0.85rem" }}>রেফারেল আয়</div>
                <div style={{ fontSize: "1.3rem", fontWeight: 700 }}>৳{data.referralEarnings}</div>
              </div>
            </div>

            <div className="card">
              <h2 style={{ fontSize: "1.05rem", marginBottom: 14 }}>যাদের রেফার করেছেন</h2>
              {data.referred.length === 0 && <div className="empty-state">এখনো কেউ আপনার কোড ব্যবহার করে যুক্ত হয়নি।</div>}
              {data.referred.map((r) => (
                <div className="list-row" key={r.uid}>
                  <div>
                    <div style={{ fontWeight: 600 }}>{r.fullName} <span className="muted">· {r.memberId}</span></div>
                    <div className="muted" style={{ fontSize: "0.85rem" }}>যুক্ত হয়েছে: {timeAgo(r.createdAt)}</div>
                  </div>
                  <div style={{ textAlign: "right" }}>
                    <span className={`stamp ${r.firstSaleCompleted ? "stamp-active" : "stamp-pending"}`}>
                      {r.firstSaleCompleted ? "✅ প্রথম সেল সম্পন্ন" : "⏳ অপেক্ষমাণ"}
                    </span>
                    <div className="muted" style={{ fontSize: "0.8rem", marginTop: 4 }}>
                      {r.firstSaleCompleted ? "৳২০০ পেয়েছেন" : "৳০"}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
