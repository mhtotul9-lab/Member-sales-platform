import { useEffect, useState } from "react";
import { useRouter } from "next/router";
import { useAuth } from "../../../contexts/AuthContext";
import Nav from "../../../components/Nav";
import ProductForm from "../../../components/ProductForm";
import Loading from "../../../components/Loading";

export default function EditProduct() {
  const { user, profile, loading } = useAuth();
  const router = useRouter();
  const { id } = router.query;
  const [product, setProduct] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [loadError, setLoadError] = useState("");

  useEffect(() => {
    if (loading) return;
    if (!user) { router.replace("/login"); return; }
    if (!profile || profile.status !== "active") { router.replace("/pending"); return; }
    if (profile.role !== "admin") { router.replace("/member/dashboard"); return; }
  }, [user, profile, loading, router]);

  useEffect(() => {
    if (!user || !id) return;
    (async () => {
      try {
        const token = await user.getIdToken();
        const res = await fetch(`/api/admin/products/${id}`, { headers: { Authorization: `Bearer ${token}` } });
        const body = await res.json();
        if (!res.ok) throw new Error(body.error || "লোড করা যায়নি।");
        setProduct(body.product);
      } catch (err) {
        setLoadError(err.message);
      }
    })();
  }, [user, id]);

  async function handleSubmit(values) {
    setError("");
    setSubmitting(true);
    try {
      const token = await user.getIdToken();
      const res = await fetch(`/api/admin/products/${id}`, {
        method: "PATCH",
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
          <h1 style={{ fontSize: "1.25rem", marginBottom: 20 }}>প্রোডাক্ট এডিট করুন</h1>
          {loadError && <p className="error-text">{loadError}</p>}
          {!product && !loadError && <Loading />}
          {product && (
            <ProductForm initial={product} submitting={submitting} error={error} onSubmit={handleSubmit} submitLabel="পরিবর্তন সেভ করুন" />
          )}
        </div>
      </div>
    </div>
  );
}
