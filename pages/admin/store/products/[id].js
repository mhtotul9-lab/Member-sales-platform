import { useEffect, useState } from "react";
import { useRouter } from "next/router";
import Nav from "../../../../components/Nav";
import Loading from "../../../../components/Loading";
import StoreAdminTabs from "../../../../components/store/StoreAdminTabs";
import StoreProductForm from "../../../../components/store/StoreProductForm";
import { useStoreAdmin } from "../../../../lib/store/useStoreAdmin";

export default function EditStoreProduct() {
  const { ready, api } = useStoreAdmin();
  const router = useRouter();
  const { id } = router.query;
  const [product, setProduct] = useState(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!ready || !id) return;
    api(`/api/admin/store/products/${id}`).then((d) => setProduct(d.product)).catch((e) => setError(e.message));
  }, [ready, id, api]);

  if (!ready) return null;

  async function save(form) {
    setBusy(true); setError("");
    try {
      await api(`/api/admin/store/products/${id}`, { method: "PUT", body: form });
      router.push("/admin/store/products");
    } catch (e) { setError(e.message); setBusy(false); }
  }

  async function remove() {
    if (!confirm("এই প্রোডাক্ট মুছে ফেলবেন? (পুরনো অর্ডার ঠিক থাকবে)")) return;
    try { await api(`/api/admin/store/products/${id}`, { method: "DELETE" }); router.push("/admin/store/products"); } catch (e) { setError(e.message); }
  }

  return (
    <div className="shell">
      <Nav role="admin" active="store" />
      <div className="container">
        <StoreAdminTabs active="products" />
        <div className="card">
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 18, gap: 10, flexWrap: "wrap" }}>
            <h1 style={{ fontSize: "1.25rem", margin: 0 }}>প্রোডাক্ট এডিট</h1>
            {product && <div style={{ display: "flex", gap: 8 }}>
              <a href={`/p/${product.slug}`} target="_blank" rel="noreferrer" className="btn btn-outline btn-sm">পেজ দেখুন ↗</a>
              <button className="btn btn-danger btn-sm" onClick={remove}>মুছুন</button>
            </div>}
          </div>
          {!product ? (error ? <p className="error-text">{error}</p> : <Loading />) : (
            <StoreProductForm api={api} initial={product} onSubmit={save} submitting={busy} error={error} submitLabel="পরিবর্তন সেভ করুন" />
          )}
        </div>
      </div>
    </div>
  );
}
