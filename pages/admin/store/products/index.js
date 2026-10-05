import { useEffect, useState } from "react";
import Nav from "../../../../components/Nav";
import Loading from "../../../../components/Loading";
import StoreAdminTabs from "../../../../components/store/StoreAdminTabs";
import { useStoreAdmin } from "../../../../lib/store/useStoreAdmin";
import { fmtPrice } from "../../../../lib/store/shared";

const STATUS = { active: ["চালু", "stamp-active"], out_of_stock: ["স্টক আউট", "stamp-rejected"], draft: ["ড্রাফট", "stamp-pending"], archived: ["আর্কাইভড", "stamp-pending"] };

export default function StoreProducts() {
  const { ready, api } = useStoreAdmin();
  const [products, setProducts] = useState(null);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!ready) return;
    api("/api/admin/store/products").then((d) => setProducts(d.products)).catch((e) => setError(e.message));
  }, [ready, api]);

  if (!ready) return null;

  return (
    <div className="shell">
      <Nav role="admin" active="store" />
      <div className="container" style={{ maxWidth: 1000 }}>
        <StoreAdminTabs active="products" />
        <div className="card">
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 14 }}>
            <h1 style={{ fontSize: "1.25rem", margin: 0 }}>স্টোরের প্রোডাক্ট</h1>
            <a href="/admin/store/products/new" className="btn btn-teal btn-sm">+ নতুন প্রোডাক্ট</a>
          </div>
          {error && <p className="error-text">{error}</p>}
          {!products && !error && <Loading />}
          {products && products.length === 0 && <div className="empty-state">এখনো কোনো প্রোডাক্ট নেই। “নতুন প্রোডাক্ট” চেপে প্রথমটা যোগ করুন।</div>}
          {products && products.map((p) => (
            <a key={p.id} href={`/admin/store/products/${p.id}`} className="list-row" style={{ textDecoration: "none", color: "inherit", gap: 12 }}>
              <div style={{ display: "flex", gap: 12, alignItems: "center", minWidth: 0 }}>
                <div style={{ width: 52, height: 52, borderRadius: 8, overflow: "hidden", background: "#eef1ef", flex: "none" }}>
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  {p.images?.[0] && <img src={p.images[0]} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} />}
                </div>
                <div style={{ minWidth: 0 }}>
                  <div style={{ fontWeight: 600 }}>{p.name}</div>
                  <div className="muted">{p.category || "—"} · স্টক: {p.stock === null || p.stock === undefined ? "সীমাহীন" : p.stock}</div>
                </div>
              </div>
              <div style={{ textAlign: "right", flex: "none" }}>
                <div style={{ fontWeight: 700 }}>{fmtPrice(p.price)}</div>
                <span className={`stamp ${STATUS[p.status]?.[1]}`}>{STATUS[p.status]?.[0] || p.status}</span>
              </div>
            </a>
          ))}
        </div>
      </div>
    </div>
  );
}
