import { useEffect } from "react";
import { useRouter } from "next/router";
import { useAuth } from "../../contexts/AuthContext";
import Nav from "../../components/Nav";

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
        <div className="card">
          <span className="stamp stamp-active">অ্যাক্টিভ</span>
          <h1 style={{ fontSize: "1.3rem", margin: "14px 0 6px" }}>স্বাগতম, {profile.fullName}</h1>
          <p className="muted" style={{ marginBottom: 24 }}>
            মেম্বার আইডি: {profile.memberId}
          </p>
          <p className="muted" style={{ marginBottom: 20 }}>
            অর্ডার সাবমিশন, ওয়ালেট, উইথড্র — এই অংশগুলো পরবর্তী ফেজে যোগ করা হবে।
          </p>
          <a className="btn btn-teal" href="/member/products">প্রোডাক্ট ব্রাউজ করুন</a>{" "}
          <a className="btn btn-outline" href="/member/orders">আমার অর্ডার দেখুন</a>{" "}
          <a className="btn btn-outline" href="/member/wallet">ওয়ালেট দেখুন</a>
        </div>
      </div>
    </div>
  );
}
