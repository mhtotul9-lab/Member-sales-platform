import { useEffect, useMemo, useRef, useState } from "react";
import StoreLayout from "../components/store/StoreLayout";
import ProductCard from "../components/store/ProductCard";
import { getStoreProducts, getStoreSettings, publicSettings, toCard } from "../lib/storefront";
import { track } from "../lib/pixel";

export async function getServerSideProps({ res }) {
  res.setHeader("Cache-Control", "public, s-maxage=30, stale-while-revalidate=120");
  const [settings, items] = await Promise.all([getStoreSettings(), getStoreProducts()]);
  return { props: { settings: publicSettings(settings), products: items.map((i) => toCard(i.id, i.data)) } };
}

const TRUST = [
  ["ক্যাশ অন ডেলিভারি", "পণ্য হাতে পেয়ে টাকা দিন"],
  ["সারাদেশে ডেলিভারি", "যেকোনো জেলা-উপজেলায়"],
  ["সহজ অর্ডার", "শুধু নাম, নম্বর ও ঠিকানা"],
  ["সরাসরি সাপোর্ট", "হটলাইন ও হোয়াটসঅ্যাপে"],
];

export default function Home({ settings, products }) {
  const [q, setQ] = useState("");
  const [cat, setCat] = useState("");
  const searched = useRef("");

  const cats = useMemo(() => [...new Set(products.map((p) => p.category).filter(Boolean))], [products]);
  const list = useMemo(() => {
    const t = q.trim().toLowerCase();
    return products.filter((p) => (!cat || p.category === cat) && (!t || p.name.toLowerCase().includes(t)));
  }, [products, q, cat]);

  useEffect(() => {
    const t = q.trim();
    if (t.length < 2 || t === searched.current) return;
    const id = setTimeout(() => { searched.current = t; track("Search", { search_string: t }); }, 1200);
    return () => clearTimeout(id);
  }, [q]);

  return (
    <StoreLayout settings={settings} description={settings.heroSubtitle}>
      <section className="st-hero">
        <div className="st-wrap st-hero-in">
          <div>
            <h1>{settings.heroTitle}</h1>
            <p>{settings.heroSubtitle}</p>
            <a href="#products" className="st-btn st-btn-gold">সব প্রোডাক্ট দেখুন</a>
          </div>
          {settings.heroImageUrl && (
            // eslint-disable-next-line @next/next/no-img-element
            <img className="st-hero-img" src={settings.heroImageUrl} alt="" />
          )}
        </div>
      </section>

      <section className="st-wrap st-trust">
        {TRUST.map(([t, d]) => (<div key={t}><b>{t}</b><span>{d}</span></div>))}
      </section>

      <section className="st-wrap" id="products">
        <div className="st-bar">
          <h2>আমাদের প্রোডাক্ট</h2>
          <input className="st-search" type="search" placeholder="প্রোডাক্ট খুঁজুন…" value={q} onChange={(e) => setQ(e.target.value)} />
        </div>
        {cats.length > 0 && (
          <div className="st-chips">
            <button className={!cat ? "on" : ""} onClick={() => setCat("")}>সব</button>
            {cats.map((c) => (<button key={c} className={cat === c ? "on" : ""} onClick={() => setCat(c)}>{c}</button>))}
          </div>
        )}
        {list.length === 0 ? (
          <div className="st-empty">{products.length === 0 ? "শীঘ্রই নতুন প্রোডাক্ট আসছে।" : "কোনো প্রোডাক্ট পাওয়া যায়নি।"}</div>
        ) : (
          <div className="st-grid">{list.map((p) => <ProductCard key={p.id} p={p} />)}</div>
        )}
      </section>

      <section className="st-wrap st-steps">
        <h2>অর্ডার করবেন যেভাবে</h2>
        <ol>
          <li><b>প্রোডাক্ট বাছুন</b><span>পছন্দের প্রোডাক্টে ক্লিক করুন</span></li>
          <li><b>তথ্য দিন</b><span>নাম, মোবাইল নম্বর ও ঠিকানা লিখে কনফার্ম করুন</span></li>
          <li><b>হাতে পেয়ে টাকা দিন</b><span>আমাদের প্রতিনিধি ফোন করে কনফার্ম করবেন</span></li>
        </ol>
      </section>
    </StoreLayout>
  );
}
