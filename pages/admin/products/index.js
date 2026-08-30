import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/router";
import { useAuth } from "../../../contexts/AuthContext";
import Nav from "../../../components/Nav";

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
      if (!res.ok) throw new Error("লোড করা যায়নি।");
      const body = await res.json();
      setProducts(body.products);
    } catch (err) {
      setError(err.message);
    }
  }, [user]);

  useEffect(() => {
    if (profile?.role === "admin" && profile.status === "active") load();
  }, [profile, load]);

  if (loading || !profile) return null;

  return (
    <div className="shell">
      <Nav role="admin" active="products" />
      <div className="container">
        <div className="card">
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
            <div>
              <h1 style={{ fontSize: "1.25rem" }}>প্রোডাক্ট ম্যানেজমেন্ট</h1>
              <p className="muted">মেম্বাররা শুধু &quot;অ্যাক্টিভ&quot; প্রোডাক্ট দেখতে পাবে।</p>
            </div>
            <a className="btn btn-primary" href="/admin/products/new">+ নতুন প্রোডাক্ট</a>
          </div>

          {error && <p className="error-text">{error}</p>}
          {products === null && !error && <p className="muted">লোড হচ্ছে...</p>}
          {products && products.length === 0 && <div className="empty-state">এখনো কোনো প্রোডাক্ট যোগ করা হয়নি।</div>}

          {products && products.map((p) => {
            const st = STATUS_LABEL[p.status] || STATUS_LABEL.inactive;
            return (
              <div className="list-row" key={p.id}>
                <div>
                  <div style={{ fontWeight: 600 }}>
                    {p.name} <span className="muted">· ৳{p.sellingPrice}</span>
                  </div>
                  <div className="muted">
                    {p.category || "ক্যাটাগরি নেই"} · প্রফিট ৳{p.profit}
                  </div>
                </div>
                <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                  <span className={`stamp ${st.cls}`}>{st.text}</span>
                  <a className="btn btn-outline btn-sm" href={`/admin/products/${p.id}`}>এডিট</a>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
