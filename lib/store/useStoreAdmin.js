import { useEffect, useCallback } from "react";
import { useRouter } from "next/router";
import { useAuth } from "../../contexts/AuthContext";

// অ্যাডমিন পেজের গার্ড (আগের অ্যাডমিন পেজগুলোর মতোই) + টোকেন সহ fetch হেল্পার।
export function useStoreAdmin() {
  const { user, profile, loading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (loading) return;
    if (!user) { router.replace("/login"); return; }
    if (!profile || profile.status !== "active") { router.replace("/pending"); return; }
    if (profile.role !== "admin") router.replace("/member/dashboard");
  }, [user, profile, loading, router]);

  const ready = !loading && !!profile && profile.role === "admin" && profile.status === "active";

  const api = useCallback(
    async (url, options = {}) => {
      const token = await user.getIdToken();
      const res = await fetch(url, {
        ...options,
        headers: { Authorization: `Bearer ${token}`, ...(options.body ? { "Content-Type": "application/json" } : {}) },
        body: options.body ? JSON.stringify(options.body) : undefined,
      });
      if (options.raw) {
        if (!res.ok) throw new Error("ডাউনলোড করা যায়নি।");
        return res;
      }
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || "কিছু একটা সমস্যা হয়েছে।");
      return data;
    },
    [user]
  );

  return { user, ready, api };
}
