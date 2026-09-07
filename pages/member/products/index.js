import { useEffect, useState, useMemo, useCallback } from "react";
import { useRouter } from "next/router";
import { useAuth } from "../../../contexts/AuthContext";
import Nav from "../../../components/Nav";
import Loading from "../../../components/Loading";
import ErrorText from "../../../components/ErrorText";

const PAGE_SIZE = 24;

const SORT_OPTIONS = [
  { value: "newest", label: "সর্বশেষ যোগ হওয়া" },
  { value: "name_asc", label: "নাম (A-Z)" },
  { value: "price_asc", label: "দাম (কম থেকে বেশি)" },
  { value: "price_desc", label: "দাম (বেশি থেকে কম)" },
];

export default function MemberProducts() {
  const { user, profile, loading } = useAuth();
  const router = useRouter();
  const [products, setProducts] = useState(null);
  const [error, setError] = useState("");
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState("");
  const [stockFilter, setStockFilter] = useState("all"); // all | in_stock
  const [sortBy, setSortBy] = useState("newest");
  const [visibleCount, setVisibleCount] = useState(PAGE_SIZE);

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

  useEffect(() => { setVisibleCount(PAGE_SIZE); }, [search, category, stockFilter, sortBy]);

  const categories = useMemo(() => {
    if (!products) return [];
    return [...new Set(products.map((p) => p.category).filter(Boolean))];
  }, [products]);

  const filtered = useMemo(() => {
    if (!products) return [];
    let list = products.filter((p) => {
      const matchesSearch = !search || p.name.toLowerCase().includes(search.toLowerCase()) || p.sku?.toLowerCase().includes(search.toLowerCase());
      const matchesCategory = !category || p.category === category;
      const matchesStock = stockFilter === "all" || p.status === "active";
      return matchesSearch && matchesCategory && matchesStock;
    });

    list = [...list].sort((a, b) => {
      if (sortBy === "name_asc") return a.name.localeCompare(b.name);
      if (sortBy === "price_asc") return a.sellingPrice - b.sellingPrice;
      if (sortBy === "price_desc") return b.sellingPrice - a.sellingPrice;
      return new Date(b.createdAt) - new Date(a.createdAt);
    });

    return list;
  }, [products, search, category, stockFilter, sortBy]);

  const visible = filtered.slice(0, visibleCount);

  if (loading || !profile) return null;

  return (
    <div className="shell">
      <Nav role={profile.role} active="products" />
      <div className="container">
        <div className="card" style={{ marginBottom: 20 }}>
          <h1 style={{ fontSize: "1.25rem", marginBottom: 16 }}>প্রোডাক্ট {products && `(${filtered.length})`}</h1>
          <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
            <input
              placeholder="নাম বা SKU দিয়ে খুঁজুন..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              style={{ flex: "1 1 200px", padding: "10px 13px", border: "1px solid var(--line)", borderRadius: 7 }}
            />
            {categories.length > 0 && (
              <select value={category} onChange={(e) => setCategory(e.target.value)} style={{ padding: "10px 13px", border: "1px solid var(--line)", borderRadius: 7 }}>
                <option value="">সব ক্যাটাগরি</option>
                {categories.map((c) => <option key={c} value={c}>{c}</option>)}
              </select>
            )}
            <select value={sortBy} onChange={(e) => setSortBy(e.target.value)} style={{ padding: "10px 13px", border: "1px solid var(--line)", borderRadius: 7 }}>
              {SORT_OPTIONS.map((s) => <option key={s.value} value={s.value}>{s.label}</option>)}
            </select>
            <label style={{ display: "flex", alignItems: "center", gap: 6, fontSize: "0.9rem", fontWeight: 500 }}>
              <input type="checkbox" checked={stockFilter === "in_stock"} onChange={(e) => setStockFilter(e.target.checked ? "in_stock" : "all")} />
              শুধু স্টকে আছে এমন দেখান
            </label>
          </div>
        </div>

        {error && <ErrorText>{error}</ErrorText>}
        {products === null && !error && <Loading />}
        {products && filtered.length === 0 && <div className="empty-state">কোনো প্রোডাক্ট পাওয়া যায়নি।</div>}

        <div className="product-grid" style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(220px, 1fr))", gap: 16 }}>
          {visible.map((p) => {
            const outOfStock = p.status === "out_of_stock";
            return (
              <a key={p.id} href={`/member/products/${p.id}`} className="card" style={{ display: "block", textDecoration: "none", opacity: outOfStock ? 0.7 : 1, position: "relative" }}>
                {p.mainImageUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={p.mainImageUrl} alt={p.name} style={{ width: "100%", height: 140, objectFit: "cover", borderRadius: 6, marginBottom: 12 }} />
                ) : (
                  <div style={{ width: "100%", height: 140, background: "var(--paper)", borderRadius: 6, marginBottom: 12 }} />
                )}
                {outOfStock && (
                  <span className="stamp stamp-rejected" style={{ position: "absolute", top: 10, right: 10 }}>স্টক শেষ</span>
                )}
                <div style={{ fontWeight: 600, marginBottom: 4 }}>{p.name}</div>
                <div className="muted">৳{p.sellingPrice}</div>
                <div style={{ color: "var(--teal)", fontWeight: 600, fontSize: "0.85rem", marginTop: 4 }}>
                  কমিশন ৳{p.memberCommission || 0}
                </div>
              </a>
            );
          })}
        </div>

        {filtered.length > visible.length && (
          <div style={{ textAlign: "center", marginTop: 20 }}>
            <button className="btn btn-outline" onClick={() => setVisibleCount((c) => c + PAGE_SIZE)}>
              আরও দেখুন ({filtered.length - visible.length} টা বাকি)
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
