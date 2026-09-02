import { useEffect } from "react";
import { useRouter } from "next/router";
import { useAuth } from "../contexts/AuthContext";
import Logo from "../components/Logo";

export default function Home() {
  const { user, profile, loading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (loading) return;
    if (!user) return; // stay on landing, show login/register links
    if (!profile) return; // profile doc still loading or missing
    if (profile.status === "pending") router.replace("/pending");
    else if (profile.status !== "active") router.replace("/pending");
    else if (profile.role === "admin") router.replace("/admin/dashboard");
    else router.replace("/member/dashboard");
  }, [user, profile, loading, router]);

  return (
    <div className="shell">
      <header className="topbar">
        <div className="brand" style={{ display: "flex", alignItems: "center", gap: 10 }}><Logo size={28} />সেলস<span className="brand-accent">পার্টনার</span></div>
      </header>
      <div className="container">
        <div className="card" style={{ textAlign: "center", padding: "60px 28px" }}>
          <h1 style={{ fontSize: "1.6rem", marginBottom: 12 }}>মেম্বার সেলস ও প্রফিট-শেয়ারিং প্ল্যাটফর্ম</h1>
          <p className="muted" style={{ marginBottom: 28 }}>
            প্রোডাক্ট মার্কেটিং করুন, অর্ডার সাবমিট করুন, আর ভ্যালিড সেলের প্রফিট নিন।
          </p>
          <div style={{ display: "flex", gap: 12, justifyContent: "center" }}>
            <a className="btn btn-primary" href="/login">লগইন করুন</a>
            <a className="btn btn-outline" href="/register">নতুন মেম্বার রেজিস্ট্রেশন</a>
          </div>
        </div>
      </div>
    </div>
  );
}
