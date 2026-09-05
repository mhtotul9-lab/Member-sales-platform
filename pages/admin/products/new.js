import { useEffect, useState } from "react";
import { useRouter } from "next/router";
import { useAuth } from "../../../contexts/AuthContext";
import Nav from "../../../components/Nav";
import ProductForm from "../../../components/ProductForm";

export default function NewProduct() {
  const { user, profile, loading } = useAuth();
  const router = useRouter();
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [defaults, setDefaults] = useState(null);

  useEffect(() => {
    if (loading) return;
    if (!user) { router.replace("/login"); return; }
    if (!profile || profile.status !== "active") { router.replace("/pending"); return; }
    if (profile.role !== "admin") { router.replace("/member/dashboard"); return; }
  }, [user, profile, loading, router]);

  useEffect(() => {
    if (!user) return;
    (async () => {
      try {
        const token = await user.getIdToken();
        const res = await fetch("/api/admin/settings", { headers: { Authorization: `Bearer ${token}` } });
        const body = await res.json();
        if (res.ok) {
          setDefaults({
            memberCommission: body.settings.defaultMemberCommission ?? 0,
            referralCommissionAmount: body.settings.defaultReferralCommission ?? 0,
          });
        }
      } catch {
        // non-critical — form just falls back to blank/0 fields
      }
    })();
  }, [user]);

  async function handleSubmit(values) {
    setError("");
    setSubmitting(true);
    try {
      const token = await user.getIdToken();
      const res = await fetch("/api/admin/products", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify(values),
      });
      const body = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(body.error || "সেভ করা যায়নি।");
      router.replace("/admin/products");
    } catch (err) {
      setError(err.message);
    } finally {
      setSubmitting(false);
    }
  }

  if (loading || !profile) return null;

  return (
    <div className="shell">
      <Nav role="admin" active="products" />
      <div className="container" style={{ maxWidth: 640 }}>
        <div className="card">
          <h1 style={{ fontSize: "1.25rem", marginBottom: 20 }}>নতুন প্রোডাক্ট যোগ করুন</h1>
          {defaults ? (
            <ProductForm initial={defaults} submitting={submitting} error={error} onSubmit={handleSubmit} submitLabel="প্রোডাক্ট তৈরি করুন" />
          ) : (
            <p className="muted">লোড হচ্ছে...</p>
          )}
        </div>
      </div>
    </div>
  );
}
