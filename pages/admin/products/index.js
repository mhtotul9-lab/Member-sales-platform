import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/router";
import { useAuth } from "../../../contexts/AuthContext";
import Nav from "../../../components/Nav";
import Loading from "../../../components/Loading";
import ErrorText from "../../../components/ErrorText";

const STATUS_LABEL = {
  active: { text: "অ্যাক্টিভ", cls: "stamp-active" },
  inactive: { text: "ইনঅ্যাক্টিভ", cls: "stamp-rejected" },
  out_of_stock: { text: "স্টক আউট", cls: "stamp-pending" },
  archived: { text: "আর্কাইভড", cls: "stamp-rejected" },
};

export default function AdminProducts() {
  const { user, profile, loading } = useAuth();
  const router = useRouter();
  const [products, setProducts] = useState(null);
  const [error, setError] = useState("");
  const [actingOn, setActingOn] = useState(null);

  useEffect(() => {
    if (loading) return;
    if (!user) { router.replace("/login"); return; }
    if (!profile || profile.status !== "active") { router.replace("/pending"); return; }
    if (profile.role !== "admin") { router.replace("/member/dashboard"); return; }
  }, [user, profile, loading, router]);

  const load = useCallback(async () => {
    if (!user) return;
    setError("");
    try {
      const token = await user.getIdToken();
      const res = await fetch("/api/admin/products", { headers: { Authorization: `Bearer ${token}` } });
      const body = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(body.error || "লোড করা যায়নি।");
      setProducts(body.products);
    } catch (err) {
      setError(err.message);
    }
  }, [user]);

  useEffect(() => {
    if (profile?.role === "admin" && profile.status === "active") load();
  }, [profile, load]);

  async function toggleStock(p, e) {
    e.stopPropagation();
    setActingOn(p.id);
    try {
      const token = await user.getIdToken();
      const nextStatus = p.status === "out_of_stock" ? "active" : "out_of_stock";
      const res = await fetch(`/api/admin/products/${p.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ status: nextStatus }),
      });
      const body = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(body.error || "আপডেট করা যায়নি।");
      load();
    } catch (err) {
      setError(err.message);
    } finally {
      setActingOn(null);
    }
  }

  async function deleteProduct(p, e) {
    e.stopPropagation();
    const confirmed = window.confirm(`"${p.name}" প্রোডাক্টটা স্থায়ীভাবে ডিলিট করতে চান? এটা ফেরত নেওয়া যাবে না।`);
    if (!confirmed) return;

    setActingOn(p.id);
    try {
      const token = await user.getIdToken();
      const res = await fetch(`/api/admin/products/${p.id}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` },
      });
      const body = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(body.error || "ডিলিট করা যায়নি।");
      load();
    } catch (err) {
      setError(err.message);
    } finally {
      setActingOn(null);
    }
  }

  if (loading || !profile) return null;

  return (
    <div className="shell">
      <Nav role="admin" active="products" />
      <div className="container">
        <div className="card">
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
            <div>
              <h1 style={{ fontSize: "1.25rem" }}>প্রোডাক্ট ম্যানেজমেন্ট</h1>
              <p className="muted">মেম্বাররা শুধু &quot;অ্যাক্টিভ&quot; প্রোডাক্ট দেখতে পাবে। প্রোডাক্টে ক্লিক করলে বিস্তারিত এডিট পেজ খুলবে।</p>
            </div>
            <a className="btn btn-primary" href="/admin/products/new">+ নতুন প্রোডাক্ট</a>
          </div>

          {error && <ErrorText>{error}</ErrorText>}
          {products === null && !error && <Loading />}
          {products && products.length === 0 && <div className="empty-state">এখনো কোনো প্রোডাক্ট যোগ করা হয়নি।</div>}

          {products && products.map((p) => {
            const st = STATUS_LABEL[p.status] || STATUS_LABEL.inactive;
            return (
              <div
                className="list-row"
                key={p.id}
                onClick={() => router.push(`/admin/products/${p.id}`)}
                style={{ cursor: "pointer" }}
              >
                <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
                  {p.mainImageUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={p.mainImageUrl}
                      alt={p.name}
                      style={{ width: 56, height: 56, objectFit: "cover", borderRadius: 8, flexShrink: 0, border: "1px solid var(--line)" }}
                    />
                  ) : (
                    <div
                      style={{
                        width: 56, height: 56, borderRadius: 8, flexShrink: 0,
                        background: "var(--paper)", border: "1px solid var(--line)",
                        display: "flex", alignItems: "center", justifyContent: "center",
                        color: "var(--ink-soft)", fontSize: "0.7rem", textAlign: "center",
                      }}
                    >
                      ছবি নেই
                    </div>
                  )}
                  <div>
                    <div style={{ fontWeight: 600 }}>
                      {p.name} <span className="muted">· ৳{p.sellingPrice}</span>
                    </div>
                    <div className="muted">
                      {p.category || "ক্যাটাগরি নেই"} · প্রফিট ৳{p.profit} · কমিশন ৳{p.memberCommission || 0}
                      {p.referralCommissionAmount > 0 && ` · রেফারেল কমিশন ৳${p.referralCommissionAmount}`}
                    </div>
                  </div>
                </div>
                <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap", justifyContent: "flex-end" }}>
                  <span className={`stamp ${st.cls}`}>{st.text}</span>
                  <button className="btn btn-outline btn-sm" disabled={actingOn === p.id} onClick={(e) => toggleStock(p, e)}>
                    {p.status === "out_of_stock" ? "স্টক আছে করুন" : "স্টক শেষ"}
                  </button>
                  <a className="btn btn-outline btn-sm" href={`/admin/products/${p.id}`} onClick={(e) => e.stopPropagation()}>এডিট</a>
                  <button className="btn btn-danger btn-sm" disabled={actingOn === p.id} onClick={(e) => deleteProduct(p, e)}>ডিলিট</button>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
