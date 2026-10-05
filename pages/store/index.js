import { useMemo, useState, useEffect, useRef } from "react";
import StoreLayout from "../../components/store/StoreLayout";
import ProductCard from "../../components/store/ProductCard";
import s from "../../styles/store.module.css";
import { getSettings, listPublicProducts } from "../../lib/store/server";
import { track } from "../../lib/store/pixel";

export async function getServerSideProps({ res }) {
  res.setHeader("Cache-Control", "public, s-maxage=30, stale-while-revalidate=300");
  try {
    const [settings, products] = await Promise.all([getSettings(), listPublicProducts()]);
    return { props: { settings, products } };
  } catch (e) {
    console.error(e);
    const { DEFAULT_SETTINGS } = await import("../../lib/store/shared");
    return { props: { settings: DEFAULT_SETTINGS, products: [], loadError: true } };
  }
}

const TRUST = [
  { icon: "💵", t: "ক্যাশ অন ডেলিভারি", d: "হাতে পেয়ে টাকা দিন" },
  { icon: "🚚", t: "সারা দেশে ডেলিভারি", d: "ঢাকা ও ঢাকার বাইরে" },
  { icon: "✅", t: "অর্ডার কনফার্মেশন", d: "ফোনে নিশ্চিত করা হয়" },
  { icon: "📞", t: "সাপোর্ট", d: "যেকোনো প্রশ্নে কল করুন" },
];

export default function StoreHome({ settings, products, loadError }) {
  const [q, setQ] = useState("");
  const [cat, setCat] = useState("");
  const [sort, setSort] = useState("new");
  const searchTimer = useRef(null);

  const categories = useMemo(() => [...new Set(products.map((p) => p.category).filter(Boolean))], [products]);

  const list = useMemo(() => {
    let l = products.filter((p) => (!cat || p.category === cat) && (!q.trim() || (p.name + " " + p.category).toLowerCase().includes(q.trim().toLowerCase())));
    if (sort === "low") l = [...l].sort((a, b) => a.price - b.price);
    if (sort === "high") l = [...l].sort((a, b) => b.price - a.price);
    return l;
  }, [products, q, cat, sort]);

  // সার্চ ইভেন্ট (টাইপ থামার ১ সেকেন্ড পর)
  useEffect(() => {
    clearTimeout(searchTimer.current);
    if (q.trim().length >= 2) searchTimer.current = setTimeout(() => track("Search", { search_string: q.trim() }), 1000);
    return () => clearTimeout(searchTimer.current);
  }, [q]);

  return (
    <StoreLayout settings={settings} title={`${settings.storeName} — অনলাইন শপ`} search={q} onSearch={setQ} image={products[0]?.images[0]}>
      <section className={s.hero}>
        <div className={`${s.wrap} ${s.heroInner}`}>
          <div>
            <h1>{settings.heroTitle}</h1>
            <p>{settings.heroSub}</p>
            <a href="#products" className={s.heroBtn}>পণ্য দেখুন ↓</a>
          </div>
          <div className={s.heroCard}>
            <div className={s.heroStep}><span className={s.heroStepNum}>১</span><div>পছন্দের পণ্যে ক্লিক করুন</div></div>
            <div className={s.heroStep}><span className={s.heroStepNum}>২</span><div>নাম, মোবাইল নাম্বার ও ঠিকানা দিন</div></div>
            <div className={s.heroStep}><span className={s.heroStepNum}>৩</span><div>পণ্য হাতে পেয়ে টাকা দিন</div></div>
          </div>
        </div>
      </section>

      <div className={s.wrap}>
        <div className={s.trust}>
          {TRUST.map((t) => (
            <div className={s.trustItem} key={t.t}><span className={s.trustIcon}>{t.icon}</span><div><b>{t.t}</b><span>{t.d}</span></div></div>
          ))}
        </div>

        <section className={s.section} id="products">
          <div className={s.sectionHead}>
            <h2>আমাদের পণ্য</h2>
            <select className={s.sort} value={sort} onChange={(e) => setSort(e.target.value)} aria-label="সাজান">
              <option value="new">নতুন আগে</option>
              <option value="low">দাম: কম → বেশি</option>
              <option value="high">দাম: বেশি → কম</option>
            </select>
          </div>
          {categories.length > 0 && (
            <div className={s.chips} style={{ marginBottom: 16 }}>
              <button className={`${s.chip} ${!cat ? s.chipActive : ""}`} onClick={() => setCat("")}>সব</button>
              {categories.map((c) => (
                <button key={c} className={`${s.chip} ${cat === c ? s.chipActive : ""}`} onClick={() => setCat(c)}>{c}</button>
              ))}
            </div>
          )}
          {list.length === 0 ? (
            <div className={s.empty}>{loadError ? "পণ্য লোড করা যায়নি। একটু পরে আবার চেষ্টা করুন।" : products.length === 0 ? "শীঘ্রই নতুন পণ্য আসছে।" : "কোনো পণ্য পাওয়া যায়নি।"}</div>
          ) : (
            <div className={s.grid}>{list.map((p) => <ProductCard key={p.id} p={p} />)}</div>
          )}
        </section>

        <section className={s.section}>
          <div className={s.sectionHead}><h2>কীভাবে অর্ডার করবেন</h2></div>
          <div className={s.how}>
            <div className={s.howItem}><div className={s.howNum}>১</div><h3>পণ্য বাছুন</h3><p>পছন্দের পণ্যে ক্লিক করে বিস্তারিত দেখুন।</p></div>
            <div className={s.howItem}><div className={s.howNum}>২</div><h3>তথ্য দিন</h3><p>শুধু নাম, মোবাইল নাম্বার ও ঠিকানা লিখে অর্ডার করুন।</p></div>
            <div className={s.howItem}><div className={s.howNum}>৩</div><h3>হাতে পেয়ে পেমেন্ট</h3><p>আমরা ফোনে কনফার্ম করে পাঠিয়ে দেব। পণ্য হাতে পেয়ে টাকা দিন।</p></div>
          </div>
        </section>
      </div>
    </StoreLayout>
  );
}
