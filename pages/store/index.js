import { useMemo, useState, useEffect, useRef } from "react";
import { useRouter } from "next/router";
import StoreLayout from "../../components/store/StoreLayout";
import ProductCard from "../../components/store/ProductCard";
import s from "../../styles/store.module.css";
import { getSettings, listPublicProducts } from "../../lib/store/server";
import { track } from "../../lib/store/pixel";
import { toBnDigits, catSlug } from "../../lib/store/shared";

export async function getServerSideProps({ res }) {
  res.setHeader("Cache-Control", "public, s-maxage=30, stale-while-revalidate=300");
  try {
    const [settings, all] = await Promise.all([getSettings(), listPublicProducts()]);
    // হোমে কার্ডের জন্য যা লাগে শুধু তা পাঠাই — পেজ হালকা থাকে
    const products = all.map(({ description, shortDescription, sizes, colors, ...rest }) => rest);
    return { props: { settings, products } };
  } catch (e) {
    console.error(e);
    const { DEFAULT_SETTINGS } = await import("../../lib/store/shared");
    return { props: { settings: DEFAULT_SETTINGS, products: [], loadError: true } };
  }
}

const PER_CATEGORY = 8; // হোম পেজে প্রতি ক্যাটাগরিতে কয়টি পণ্য দেখাবে

const TRUST = [
  { icon: "💵", t: "ক্যাশ অন ডেলিভারি", d: "হাতে পেয়ে টাকা দিন" },
  { icon: "🚚", t: "সারা দেশে ডেলিভারি", d: "ঢাকা ও ঢাকার বাইরে" },
  { icon: "✅", t: "ফোনে কনফার্মেশন", d: "অর্ডারের পর কল করা হয়" },
  { icon: "📞", t: "সাপোর্ট", d: "যেকোনো প্রশ্নে কল করুন" },
];

export default function StoreHome({ settings, products, loadError }) {
  const router = useRouter();
  const [q, setQ] = useState("");
  const [cat, setCat] = useState("");
  const [sort, setSort] = useState("new");
  const [openOther, setOpenOther] = useState(false);
  const searchTimer = useRef(null);

  useEffect(() => { if (router.query.cat) setCat(String(router.query.cat)); }, [router.query.cat]);

  const categories = useMemo(() => [...new Set(products.map((p) => p.category).filter(Boolean))], [products]);
  const catTiles = useMemo(() => categories.map((c) => ({ name: c, count: products.filter((p) => p.category === c).length, image: products.find((p) => p.category === c && p.images[0])?.images[0] })), [categories, products]);
  const hero = useMemo(() => products.filter((p) => p.images[0]).slice(0, 2), [products]);

  const list = useMemo(() => {
    let l = products.filter((p) => (!cat || p.category === cat) && (!q.trim() || (p.name + " " + p.category).toLowerCase().includes(q.trim().toLowerCase())));
    if (sort === "low") l = [...l].sort((a, b) => a.price - b.price);
    if (sort === "high") l = [...l].sort((a, b) => b.price - a.price);
    return l;
  }, [products, q, cat, sort]);

  // সার্চ/ক্যাটাগরি ফিল্টার না থাকলে ক্যাটাগরি ধরে ভাগ করে দেখাই (প্রতিটিতে PER_CATEGORY টি)
  const grouped = useMemo(() => {
    if (cat || q.trim()) return null;
    const sorted = (l) => (sort === "low" ? [...l].sort((a, b) => a.price - b.price) : sort === "high" ? [...l].sort((a, b) => b.price - a.price) : l);
    const groups = categories.map((c) => ({ name: c, items: sorted(products.filter((p) => p.category === c)) }));
    const other = products.filter((p) => !p.category);
    if (other.length) groups.push({ name: "", items: sorted(other) });
    return groups;
  }, [products, categories, cat, q, sort]);

  useEffect(() => {
    clearTimeout(searchTimer.current);
    if (q.trim().length >= 2) searchTimer.current = setTimeout(() => track("Search", { search_string: q.trim() }), 1000);
    return () => clearTimeout(searchTimer.current);
  }, [q]);

  function pickCat(c) {
    setCat(c);
    document.getElementById("products")?.scrollIntoView({ behavior: "smooth" });
  }

  return (
    <StoreLayout settings={settings} title={`${settings.storeName} — অনলাইন শপ`} search={q} onSearch={setQ} image={products[0]?.images[0]} categories={categories}>
      <section className={s.hero}>
        <div className={`${s.wrap} ${s.heroInner}`}>
          <div>
            <span className={s.eyebrow}>নতুন কালেকশন</span>
            <h1>{settings.heroTitle}</h1>
            <p>{settings.heroSub}</p>
            <div className={s.heroBtns}>
              <a href="#products" className={s.btnGold}>কালেকশন দেখুন ↓</a>
              <a href="/track" className={s.btnGhost}>অর্ডার ট্র্যাক করুন</a>
            </div>
            <div className={s.heroStats}>
              <div><b>{toBnDigits(products.length)}+</b><span>পণ্য</span></div>
              <div><b>COD</b><span>ক্যাশ অন ডেলিভারি</span></div>
              <div><b>৬৪</b><span>জেলায় ডেলিভারি</span></div>
            </div>
          </div>
          <div className={s.collage}>
            {[0, 1].map((i) => (
              <div className={s.arch} key={i}>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                {hero[i] ? <img src={hero[i].images[0]} alt={hero[i].name} /> : <div className={s.archPlaceholder}>👗</div>}
              </div>
            ))}
          </div>
        </div>
      </section>

      <div className={s.wrap}>
        <div className={s.trust}>
          {TRUST.map((t) => (
            <div className={s.trustItem} key={t.t}><span className={s.trustIcon}>{t.icon}</span><div><b>{t.t}</b><span>{t.d}</span></div></div>
          ))}
        </div>

        {catTiles.length > 1 && (
          <section className={s.section}>
            <div className={s.sectionHead}><span className="kicker" style={{ color: "#B98B3C", fontWeight: 700, fontSize: ".82rem" }}>ক্যাটাগরি</span><h2>পছন্দের ধরন বাছুন</h2><div className={s.divider} /></div>
            <div className={s.cats}>
              {catTiles.map((c) => (
                <a key={c.name} className={s.catTile} href={`/category/${encodeURI(catSlug(c.name))}`}>
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  {c.image && <img src={c.image} alt={c.name} loading="lazy" />}
                  <div className={s.catLabel}><b>{c.name}</b><span>{toBnDigits(c.count)}টি পণ্য</span></div>
                </a>
              ))}
            </div>
          </section>
        )}

        <section className={s.section} id="products">
          <div className={s.sectionHead}><span style={{ color: "#B98B3C", fontWeight: 700, fontSize: ".82rem" }}>আমাদের কালেকশন</span><h2>সব পণ্য</h2><div className={s.divider} /></div>
          <div className={s.toolbar}>
            <div className={s.chips}>
              <button className={`${s.chip} ${!cat ? s.chipActive : ""}`} onClick={() => setCat("")}>সব</button>
              {categories.map((c) => <a key={c} href={`/category/${encodeURI(catSlug(c))}`} className={`${s.chip} ${cat === c ? s.chipActive : ""}`} style={{ textDecoration: "none" }}>{c}</a>)}
            </div>
            <select className={s.sort} value={sort} onChange={(e) => setSort(e.target.value)} aria-label="সাজান">
              <option value="new">ডিফল্ট ক্রম</option>
              <option value="low">দাম: কম → বেশি</option>
              <option value="high">দাম: বেশি → কম</option>
            </select>
          </div>
          {list.length === 0 ? (
            <div className={s.empty}>{loadError ? "পণ্য লোড করা যায়নি। একটু পরে আবার চেষ্টা করুন।" : products.length === 0 ? "শীঘ্রই নতুন পণ্য আসছে।" : "কোনো পণ্য পাওয়া যায়নি।"}</div>
          ) : grouped ? (
            grouped.map((g) => {
              const isOther = !g.name;
              const shown = isOther && openOther ? g.items : g.items.slice(0, PER_CATEGORY);
              const more = g.items.length - shown.length;
              const href = isOther ? null : `/category/${encodeURI(catSlug(g.name))}`;
              return (
                <div key={g.name || "other"} style={{ marginBottom: 34 }}>
                  {categories.length > 0 && (
                    <div style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between", gap: 12, margin: "0 0 14px" }}>
                      <h3 style={{ margin: 0, fontFamily: '"Noto Serif Bengali", serif', fontSize: "1.2rem" }}>{g.name || "অন্যান্য"}</h3>
                      {href && <a href={href} style={{ color: "#B98B3C", fontWeight: 700, fontSize: ".9rem", textDecoration: "none" }}>সব দেখুন →</a>}
                    </div>
                  )}
                  <div className={s.grid}>{shown.map((p) => <ProductCard key={p.id} p={p} />)}</div>
                  {more > 0 && (
                    <div style={{ textAlign: "center", marginTop: 18 }}>
                      {href ? (
                        <a href={href} className={s.btnGold}>আরও দেখুন ({toBnDigits(more)}টি) →</a>
                      ) : (
                        <button type="button" className={s.btnGold} style={{ border: 0, cursor: "pointer" }} onClick={() => setOpenOther(true)}>আরও দেখুন ({toBnDigits(more)}টি) ↓</button>
                      )}
                    </div>
                  )}
                </div>
              );
            })
          ) : (
            <div className={s.grid}>{list.map((p) => <ProductCard key={p.id} p={p} />)}</div>
          )}
        </section>

        <section className={s.section}>
          <div className={s.sectionHead}><span style={{ color: "#B98B3C", fontWeight: 700, fontSize: ".82rem" }}>কেন আমরা</span><h2>আপনার ভরসার কারণ</h2><div className={s.divider} /></div>
          <div className={s.feat}>
            <div className={s.featItem}><div className="ic" style={{}}><span className={s.trustIcon} style={{ margin: "0 auto 10px" }}>🧵</span></div><h3>মানসম্পন্ন কাপড়</h3><p>বাছাই করা কাপড় ও সূক্ষ্ম ফিনিশিং</p></div>
            <div className={s.featItem}><div><span className={s.trustIcon} style={{ margin: "0 auto 10px" }}>💵</span></div><h3>হাতে পেয়ে টাকা</h3><p>আগে পণ্য দেখুন, তারপর পেমেন্ট</p></div>
            <div className={s.featItem}><div><span className={s.trustIcon} style={{ margin: "0 auto 10px" }}>🚚</span></div><h3>দ্রুত ডেলিভারি</h3><p>Steadfast কুরিয়ারে সারা দেশে</p></div>
            <div className={s.featItem}><div><span className={s.trustIcon} style={{ margin: "0 auto 10px" }}>🎧</span></div><h3>পাশে আছি</h3><p>অর্ডার থেকে ডেলিভারি, ফোনে সহায়তা</p></div>
          </div>
        </section>

        <section className={s.section}>
          <div className={s.sectionHead}><span style={{ color: "#B98B3C", fontWeight: 700, fontSize: ".82rem" }}>সহজ ৩ ধাপ</span><h2>কীভাবে অর্ডার করবেন</h2><div className={s.divider} /></div>
          <div className={s.how}>
            <div className={s.howItem}><div className={s.howNum}>১</div><h3>পণ্য বাছুন</h3><p>পছন্দের পণ্যে ক্লিক করে ছবি ও বিবরণ দেখুন।</p></div>
            <div className={s.howItem}><div className={s.howNum}>২</div><h3>তথ্য দিন</h3><p>নাম, মোবাইল নাম্বার ও ঠিকানা লিখে অর্ডার করুন।</p></div>
            <div className={s.howItem}><div className={s.howNum}>৩</div><h3>হাতে পেয়ে পেমেন্ট</h3><p>আমরা ফোনে কনফার্ম করে পাঠিয়ে দেব।</p></div>
          </div>
        </section>

        <div className={s.cta}>
          <h2>পছন্দের পোশাকটি আজই অর্ডার করুন</h2>
          <p>কোনো অগ্রিম টাকা লাগবে না — পণ্য হাতে পেয়ে মূল্য পরিশোধ করুন।</p>
          <a href="#products" className={s.btnGold}>কালেকশন দেখুন ↑</a>
        </div>
      </div>
    </StoreLayout>
  );
}
