import { useEffect, useState, useMemo, useCallback } from "react";
import { useRouter } from "next/router";
import { useAuth } from "../../../contexts/AuthContext";
import Nav from "../../../components/Nav";
import Loading from "../../../components/Loading";
import ErrorText from "../../../components/ErrorText";

export default function MemberProducts() {
  const { user, profile, loading } = useAuth();
  const router = useRouter();
  const [products, setProducts] = useState(null);
  const [error, setError] = useState("");
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState("");

  useEffect(() => {
    if (loading) return;
    if (!user) { router.replace("/login"); return; }
    if (!profile || profile.status !== "active") { router.replace("/pending"); return; }
  }, [user, profile, loading, router]);

  const load = useCallback(async () => {
    if (!user) return;
    setError("");
    try {
      const token = await user.getIdToken();
      const res = await fetch("/api/member/products", { headers: { Authorization: `Bearer ${token}` } });
      const body = await res.json();
      if (!res.ok) throw new Error(body.error || "লোড করা যায়নি।");
      setProducts(body.products);
    } catch (err) {
      setError(err.message);
    }
  }, [user]);

  useEffect(() => {
    if (profile?.status === "active") load();
  }, [profile, load]);

  const categories = useMemo(() => {
    if (!products) return [];
    return [...new Set(products.map((p) => p.category).filter(Boolean))];
  }, [products]);

  const filtered = useMemo(() => {
    if (!products) return [];
    return products.filter((p) => {
      const matchesSearch = !search || p.name.toLowerCase().includes(search.toLowerCase());
      const matchesCategory = !category || p.category === category;
      return matchesSearch && matchesCategory;
    });
  }, [products, search, category]);

  if (loading || !profile) return null;

  return (
    <div className="shell">
      <Nav role={profile.role} active="products" />
      <div className="container">
        <div className="card" style={{ marginBottom: 20 }}>
          <h1 style={{ fontSize: "1.25rem", marginBottom: 16 }}>প্রোডাক্ট</h1>
          <div style={{ display: "flex", gap: 12 }}>
            <input
              placeholder="প্রোডাক্ট খুঁজুন..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              style={{ flex: 1, padding: "10px 13px", border: "1px solid var(--line)", borderRadius: 7 }}
            />
            {categories.length > 0 && (
              <select value={category} onChange={(e) => setCategory(e.target.value)} style={{ padding: "10px 13px", border: "1px solid var(--line)", borderRadius: 7 }}>
                <option value="">সব ক্যাটাগরি</option>
                {categories.map((c) => <option key={c} value={c}>{c}</option>)}
              </select>
            )}
          </div>
        </div>

        {error && <ErrorText>{error}</ErrorText>}
        {products === null && !error && <Loading />}
        {products && filtered.length === 0 && <div className="empty-state">কোনো প্রোডাক্ট পাওয়া যায়নি।</div>}

        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(220px, 1fr))", gap: 16 }}>
          {filtered.map((p) => (
            <a key={p.id} href={`/member/products/${p.id}`} className="card" style={{ display: "block", textDecoration: "none" }}>
              {p.mainImageUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={p.mainImageUrl} alt={p.name} style={{ width: "100%", height: 140, objectFit: "cover", borderRadius: 6, marginBottom: 12 }} />
              ) : (
                <div style={{ width: "100%", height: 140, background: "var(--paper)", borderRadius: 6, marginBottom: 12 }} />
              )}
              <div style={{ fontWeight: 600, marginBottom: 4 }}>{p.name}</div>
              <div className="muted">৳{p.sellingPrice}</div>
              <div style={{ color: "var(--teal)", fontWeight: 600, fontSize: "0.85rem", marginTop: 4 }}>
                কমিশন ৳{p.memberCommission || 0}
              </div>
            </a>
          ))}
        </div>
      </div>
    </div>
  );
}
