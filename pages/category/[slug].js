import { useMemo, useState, useEffect } from "react";
import StoreLayout from "../../components/store/StoreLayout";
import ProductCard from "../../components/store/ProductCard";
import s from "../../styles/store.module.css";
import { getSettings, listPublicProducts } from "../../lib/store/server";
import { catSlug, toBnDigits } from "../../lib/store/shared";

export async function getServerSideProps({ params, res }) {
  res.setHeader("Cache-Control", "public, s-maxage=30, stale-while-revalidate=300");
  const [settings, all] = await Promise.all([getSettings(), listPublicProducts()]);
  const want = catSlug(decodeURIComponent(String(params.slug)));
  const categories = [...new Set(all.map((p) => p.category).filter(Boolean))];
  const name = categories.find((c) => catSlug(c) === want);
  if (!name) return { notFound: true };
  return { props: { settings, category: name, products: all.filter((p) => p.category === name), categories } };
}

export default function CategoryPage({ settings, category, products, categories }) {
  const [sort, setSort] = useState("new");
  const list = useMemo(() => {
    if (sort === "low") return [...products].sort((a, b) => a.price - b.price);
    if (sort === "high") return [...products].sort((a, b) => b.price - a.price);
    return products;
  }, [products, sort]);

  useEffect(() => {
    // GTM এ ক্যাটাগরি দেখার ইভেন্ট (চাইলে ট্রিগার বানানো যাবে)
    try { window.dataLayer = window.dataLayer || []; window.dataLayer.push({ event: "view_item_list", item_list_name: category, ecommerce: { item_list_name: category, items: products.slice(0, 20).map((p) => ({ item_id: p.id, item_name: p.name, price: p.price, item_category: category })) } }); } catch (e) {}
  }, [category, products]);

  return (
    <StoreLayout settings={settings} title={`${category} — ${settings.storeName}`} description={`${settings.storeName} এর ${category} কালেকশন। ক্যাশ অন ডেলিভারি।`} image={products[0]?.images[0]} categories={categories}>
      <div className={s.wrap}>
        <div className={s.crumbs}><a href="/">হোম</a> › {category}</div>
        <section className={s.section} style={{ paddingTop: 10 }}>
          <div className={s.sectionHead}>
            <span style={{ color: "#B98B3C", fontWeight: 700, fontSize: ".82rem" }}>ক্যাটাগরি</span>
            <h2>{category}</h2>
            <p>{toBnDigits(products.length)}টি পণ্য</p>
            <div className={s.divider} />
          </div>
          <div className={s.toolbar}>
            <div className={s.chips}>
              <a className={s.chip} href="/#products" style={{ textDecoration: "none" }}>সব</a>
              {categories.map((c) => <a key={c} href={`/category/${encodeURI(catSlug(c))}`} className={`${s.chip} ${c === category ? s.chipActive : ""}`} style={{ textDecoration: "none" }}>{c}</a>)}
            </div>
            <select className={s.sort} value={sort} onChange={(e) => setSort(e.target.value)} aria-label="সাজান">
              <option value="new">ডিফল্ট ক্রম</option>
              <option value="low">দাম: কম → বেশি</option>
              <option value="high">দাম: বেশি → কম</option>
            </select>
          </div>
          <div className={s.grid}>{list.map((p) => <ProductCard key={p.id} p={p} />)}</div>
        </section>
      </div>
    </StoreLayout>
  );
}
