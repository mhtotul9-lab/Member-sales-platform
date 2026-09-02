import { useEffect } from "react";
import { useRouter } from "next/router";
import { useAuth } from "../../contexts/AuthContext";
import Nav from "../../components/Nav";
import LiveSalesFeed from "../../components/LiveSalesFeed";

export default function MemberDashboard() {
  const { user, profile, loading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (loading) return;
    if (!user) { router.replace("/login"); return; }
    if (!profile || profile.status !== "active") { router.replace("/pending"); return; }
    if (profile.role === "admin") router.replace("/admin/dashboard");
  }, [user, profile, loading, router]);

  if (loading || !profile) return null;

  return (
    <div className="shell">
      <Nav role="member" active="dashboard" />
      <div className="container">
        <div className="card" style={{ marginBottom: 20 }}>
          <span className="stamp stamp-active">অ্যাক্টিভ</span>
          <h1 style={{ fontSize: "1.3rem", margin: "14px 0 6px" }}>স্বাগতম, {profile.fullName}</h1>
          <p className="muted" style={{ marginBottom: 20 }}>
            মেম্বার আইডি: {profile.memberId}
          </p>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 10 }}>
            <a className="btn btn-teal" href="/member/products">প্রোডাক্ট ব্রাউজ করুন</a>
            <a className="btn btn-outline" href="/member/orders">আমার অর্ডার দেখুন</a>
            <a className="btn btn-outline" href="/member/wallet">ওয়ালেট দেখুন</a>
            <a className="btn btn-outline" href="/member/withdrawals">উইথড্র করুন</a>
            <a className="btn btn-outline" href="/member/referrals">রেফারেল প্রোগ্রাম</a>
            <a className="btn btn-outline" href="/leaderboard">লিডারবোর্ড</a>
            <a className="btn btn-outline" href="/member/trainings">ট্রেনিং</a>
          </div>
        </div>

        <LiveSalesFeed />
      </div>
    </div>
  );
}
