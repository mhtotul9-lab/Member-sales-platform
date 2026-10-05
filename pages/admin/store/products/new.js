import { useState } from "react";
import { useRouter } from "next/router";
import Nav from "../../../../components/Nav";
import StoreAdminTabs from "../../../../components/store/StoreAdminTabs";
import StoreProductForm from "../../../../components/store/StoreProductForm";
import { useStoreAdmin } from "../../../../lib/store/useStoreAdmin";

export default function NewStoreProduct() {
  const { ready, api } = useStoreAdmin();
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  if (!ready) return null;

  async function save(form) {
    setBusy(true); setError("");
    try {
      await api("/api/admin/store/products", { method: "POST", body: form });
      router.push("/admin/store/products");
    } catch (e) { setError(e.message); setBusy(false); }
  }

  return (
    <div className="shell">
      <Nav role="admin" active="store" />
      <div className="container">
        <StoreAdminTabs active="products" />
        <div className="card">
          <h1 style={{ fontSize: "1.25rem", marginBottom: 18 }}>নতুন প্রোডাক্ট</h1>
          <StoreProductForm api={api} onSubmit={save} submitting={busy} error={error} submitLabel="প্রোডাক্ট যোগ করুন" />
        </div>
      </div>
    </div>
  );
}
