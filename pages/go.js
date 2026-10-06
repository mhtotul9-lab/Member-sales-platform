import { useEffect } from "react";
import { useRouter } from "next/router";
import { useAuth } from "../contexts/AuthContext";
import Loading from "../components/Loading";

// লগইনের পর এখানে আসে: অ্যাডমিন → অ্যাডমিন প্যানেল, মেম্বার → মেম্বার প্যানেল।
export default function Go() {
  const { user, profile, loading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (loading) return;
    if (!user) { router.replace("/login"); return; }
    if (!profile) return; // প্রোফাইল লোড হচ্ছে
    if (profile.status !== "active") router.replace("/pending");
    else if (profile.role === "admin") router.replace("/admin/dashboard");
    else router.replace("/member/dashboard");
  }, [user, profile, loading, router]);

  return <div className="container"><Loading text="আপনার প্যানেলে নেওয়া হচ্ছে..." /></div>;
}
