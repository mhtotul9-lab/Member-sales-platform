import { useEffect } from "react";
import { useRouter } from "next/router";
import { signOut } from "firebase/auth";
import { auth } from "../lib/firebase";
import { useAuth } from "../contexts/AuthContext";
import Logo from "../components/Logo";

export default function Pending() {
  const { user, profile, loading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (loading) return;
    if (!user) { router.replace("/login"); return; }
    if (profile?.status === "active") {
      router.replace(profile.role === "admin" ? "/admin/dashboard" : "/member/dashboard");
    }
  }, [user, profile, loading, router]);

  const status = profile?.status;

  return (
    <div className="shell">
      <header className="topbar">
        <a className="brand" href="/" style={{ display: "flex", alignItems: "center", gap: 10 }}><Logo size={28} />সেলস<span>পার্টনার</span></a>
        <button className="btn btn-outline btn-sm" onClick={() => signOut(auth).then(() => router.replace("/login"))}>
          লগ আউট
        </button>
      </header>
      <div className="container" style={{ maxWidth: 480 }}>
        <div className="card" style={{ textAlign: "center" }}>
          {status === "rejected" ? (
            <>
              <span className="stamp stamp-rejected" style={{ marginBottom: 16 }}>রিজেক্টেড</span>
              <h1 style={{ fontSize: "1.2rem", margin: "12px 0" }}>আপনার রেজিস্ট্রেশন গ্রহণ করা হয়নি</h1>
              <p className="muted">বিস্তারিত জানতে অ্যাডমিনের সাথে যোগাযোগ করুন।</p>
            </>
          ) : status === "suspended" ? (
            <>
              <span className="stamp stamp-suspended" style={{ marginBottom: 16 }}>সাসপেন্ডেড</span>
              <h1 style={{ fontSize: "1.2rem", margin: "12px 0" }}>আপনার অ্যাকাউন্ট সাসপেন্ড করা হয়েছে</h1>
              <p className="muted">বিস্তারিত জানতে অ্যাডমিনের সাথে যোগাযোগ করুন।</p>
            </>
          ) : (
            <>
              <span className="stamp stamp-pending" style={{ marginBottom: 16 }}>পেন্ডিং</span>
              <h1 style={{ fontSize: "1.2rem", margin: "12px 0" }}>আপনার অ্যাকাউন্ট রিভিউ চলছে</h1>
              <p className="muted">অ্যাডমিন অ্যাপ্রুভ করলেই আপনি লগইন করে ড্যাশবোর্ড ব্যবহার করতে পারবেন।</p>
            </>
          )}
          <p style={{ marginTop: 18 }}>
            <a href="/notifications" style={{ color: "var(--teal)", fontWeight: 600, fontSize: "0.9rem" }}>নোটিফিকেশন দেখুন</a>
          </p>
        </div>
      </div>
    </div>
  );
}
