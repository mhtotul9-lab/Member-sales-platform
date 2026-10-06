import { useState, useEffect, useMemo, useRef } from "react";
import StoreLayout from "../../components/store/StoreLayout";
import ProductCard from "../../components/store/ProductCard";
import s from "../../styles/store.module.css";
import { getSettings, getPublicProductBySlug, listPublicProducts } from "../../lib/store/server";
import { fmtPrice, toBnDigits, discountPercent, calcDelivery, normalizePhone, catSlug } from "../../lib/store/shared";
import { track, newEventId, getFbCookies } from "../../lib/store/pixel";

export async function getServerSideProps({ params, res }) {
  res.setHeader("Cache-Control", "public, s-maxage=30, stale-while-revalidate=300");
  const [settings, product] = await Promise.all([getSettings(), getPublicProductBySlug(params.slug)]);
  if (!product) return { notFound: true };
  const all = await listPublicProducts();
  const related = all.filter((p) => p.id !== product.id && !p.soldOut).sort((a, b) => (b.category === product.category) - (a.category === product.category)).slice(0, 4);
  const categories = [...new Set(all.map((p) => p.category).filter(Boolean))];
  return { props: { settings, product, related, categories } };
}

export default function ProductPage({ settings, product: p, related, categories }) {
  const [active, setActive] = useState(0);
  const [zoom, setZoom] = useState(false);
  // ঢাকার বাইরে — ডিফল্ট সিলেক্টেড
  const [form, setForm] = useState({ name: "", phone: "", address: "", area: "outside", size: "", color: "", website: "" });
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const checkoutFired = useRef(false);
  const formRef = useRef(null);
  const eventId = useRef("");

  const off = discountPercent(p.price, p.comparePrice);
  const delivery = useMemo(() => calcDelivery(settings, p.price, form.area), [settings, p.price, form.area]);
  const total = p.price + delivery;
  const freeNote = settings.freeDeliveryAbove > 0 && p.price >= settings.freeDeliveryAbove;

  useEffect(() => {
    track("ViewContent", { content_ids: [p.id], content_name: p.name, content_type: "product", content_category: p.category, value: p.price, currency: "BDT", contents: [{ id: p.id, quantity: 1, item_price: p.price }] });
  }, [p]);

  useEffect(() => {
    if (!zoom) return;
    const onKey = (e) => { if (e.key === "Escape") setZoom(false); if (e.key === "ArrowRight") setActive((a) => (a + 1) % p.images.length); if (e.key === "ArrowLeft") setActive((a) => (a - 1 + p.images.length) % p.images.length); };
    window.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden";
    return () => { window.removeEventListener("keydown", onKey); document.body.style.overflow = ""; };
  }, [zoom, p.images.length]);

  function fireCheckout() {
    if (checkoutFired.current) return;
    checkoutFired.current = true;
    track("InitiateCheckout", { content_ids: [p.id], content_name: p.name, content_type: "product", num_items: 1, value: p.price, currency: "BDT", contents: [{ id: p.id, quantity: 1, item_price: p.price }] });
  }

  function goOrder() {
    track("AddToCart", { content_ids: [p.id], content_name: p.name, content_type: "product", value: p.price, currency: "BDT", contents: [{ id: p.id, quantity: 1, item_price: p.price }] });
    formRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
  }

  const set = (k, v) => setForm((f) => ({ ...f, [k]: v }));

  async function submit(e) {
    e.preventDefault();
    setError("");
    if (p.sizes.length && !form.size) return setError("সাইজ বাছাই করুন।");
    if (p.colors.length && !form.color) return setError("রং বাছাই করুন।");
    if (form.name.trim().length < 2) return setError("আপনার নাম লিখুন।");
    if (!normalizePhone(form.phone)) return setError("সঠিক ১১ ডিজিটের মোবাইল নাম্বার দিন (যেমন ০১৭XXXXXXXX)।");
    if (form.address.trim().length < 10) return setError("পূর্ণ ঠিকানা লিখুন (গ্রাম/এলাকা, থানা, জেলা সহ)।");
    setBusy(true);
    try {
      if (!eventId.current) eventId.current = newEventId();
      const res = await fetch("/api/store/order", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ productId: p.id, ...form, eventId: eventId.current, ...getFbCookies(), referrer: document.referrer, landing: location.href }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || "অর্ডার করা যায়নি। আবার চেষ্টা করুন।");
      try {
        sessionStorage.setItem("jr_last_order", JSON.stringify({ ...data, phone: normalizePhone(form.phone), name: form.name.trim() }));
        const saved = JSON.parse(localStorage.getItem("jr_my_orders") || "[]");
        localStorage.setItem("jr_my_orders", JSON.stringify([{ orderNo: data.orderNo, phone: normalizePhone(form.phone) }, ...saved].slice(0, 5)));
      } catch (e2) {}
      window.location.href = `/order-success?o=${encodeURIComponent(data.orderNo)}`;
    } catch (err) {
      setError(err.message);
      setBusy(false);
    }
  }

  const desc = (p.shortDescription || p.description || "").slice(0, 150);
  const shareUrl = typeof window !== "undefined" ? window.location.href : "";

  return (
    <StoreLayout settings={settings} title={`${p.name} — ${settings.storeName}`} description={desc} image={p.images[0]} categories={categories}>
      <div className={s.wrap}>
        <div className={s.crumbs}><a href="/">হোম</a> › {p.category && <><a href={`/category/${encodeURI(catSlug(p.category))}`}>{p.category}</a> › </>}{p.name}</div>
        <div className={s.pdp}>
          <div className={s.gallery}>
            <div className={s.mainImg} onClick={() => p.images[active] && setZoom(true)}>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              {p.images[active] && <img src={p.images[active]} alt={p.name} />}
              {p.images[active] && <span className={s.zoomHint}>🔍 বড় করে দেখুন</span>}
            </div>
            {p.images.length > 1 && (
              <div className={s.thumbs}>
                {p.images.map((src, i) => (
                  <button key={i} className={`${s.thumb} ${i === active ? s.thumbActive : ""}`} onClick={() => setActive(i)} aria-label={`ছবি ${toBnDigits(i + 1)}`}>
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={src} alt="" loading="lazy" />
                  </button>
                ))}
              </div>
            )}
          </div>

          <div className={s.pdpInfo}>
            {p.category && <span className={s.cardCat}>{p.category}</span>}
            <h1>{p.name}</h1>
            <div className={s.pdpPrice}>
              <span className={s.price}>{fmtPrice(p.price)}</span>
              {p.comparePrice > p.price && <span className={s.old}>{fmtPrice(p.comparePrice)}</span>}
              {off > 0 && <span className={s.save}>{toBnDigits(off)}% ছাড়</span>}
            </div>
            <span className={`${s.stock} ${p.soldOut ? s.stockOut : ""}`}>{p.soldOut ? "স্টক আউট" : "✓ স্টকে আছে"}</span>
            {p.stockLeft > 0 && !p.soldOut && <span className={`${s.stock} ${s.stockLow}`}>🔥 মাত্র {toBnDigits(p.stockLeft)}টি বাকি</span>}
            {p.shortDescription && <div className={s.short}>{p.shortDescription}</div>}

            {!p.soldOut && p.sizes.length > 0 && (
              <>
                <div className={s.optLabel}>সাইজ বাছাই করুন {form.size && <b>— {form.size}</b>}</div>
                <div className={s.opts}>{p.sizes.map((z) => <button type="button" key={z} className={`${s.opt} ${form.size === z ? s.optOn : ""}`} onClick={() => set("size", z)}>{z}</button>)}</div>
              </>
            )}
            {!p.soldOut && p.colors.length > 0 && (
              <>
                <div className={s.optLabel}>রং বাছাই করুন {form.color && <b>— {form.color}</b>}</div>
                <div className={s.opts}>{p.colors.map((z) => <button type="button" key={z} className={`${s.opt} ${form.color === z ? s.optOn : ""}`} onClick={() => set("color", z)}>{z}</button>)}</div>
              </>
            )}

            <div className={s.deliveryBox}>
              🚚 ডেলিভারি চার্জ: ঢাকার ভিতরে {fmtPrice(settings.deliveryInsideDhaka)}, ঢাকার বাইরে {fmtPrice(settings.deliveryOutsideDhaka)}
              {settings.freeDeliveryAbove > 0 && <> · {fmtPrice(settings.freeDeliveryAbove)} বা তার বেশি অর্ডারে ফ্রি</>}
              <br />💵 ক্যাশ অন ডেলিভারি — পণ্য হাতে পেয়ে টাকা দিন
            </div>

            {p.soldOut ? (
              <div className={s.empty}>দুঃখিত, পণ্যটি এখন স্টকে নেই।</div>
            ) : (
              <form className={s.formCard} ref={formRef} id="order" onSubmit={submit}>
                <h3>অর্ডার করতে নিচের তথ্য দিন</h3>
                <p className={s.formSub}>আমরা ফোনে কনফার্ম করে পণ্য পাঠিয়ে দেব।</p>
                <div className={s.fld}><label htmlFor="n">আপনার নাম</label><input id="n" value={form.name} onFocus={fireCheckout} onChange={(e) => set("name", e.target.value)} placeholder="আপনার নাম লিখুন" autoComplete="name" /></div>
                <div className={s.fld}><label htmlFor="ph">মোবাইল নাম্বার</label><input id="ph" type="tel" inputMode="numeric" value={form.phone} onFocus={fireCheckout} onChange={(e) => set("phone", e.target.value)} placeholder="০১XXXXXXXXX" autoComplete="tel" /></div>
                <div className={s.fld}><label htmlFor="ad">সম্পূর্ণ ঠিকানা</label><textarea id="ad" rows={3} value={form.address} onFocus={fireCheckout} onChange={(e) => set("address", e.target.value)} placeholder="বাসা/গ্রাম, এলাকা, থানা, জেলা" autoComplete="street-address" /></div>

                <span className={s.areaLabel}>ডেলিভারি এলাকা</span>
                <div className={s.areaGrid}>
                  <label className={s.areaOpt}><input type="radio" name="area" checked={form.area === "outside"} onChange={() => set("area", "outside")} /><span>ঢাকার বাইরে<small>{fmtPrice(calcDelivery(settings, p.price, "outside")) === "৳০" ? "ফ্রি" : fmtPrice(calcDelivery(settings, p.price, "outside"))}</small></span></label>
                  <label className={s.areaOpt}><input type="radio" name="area" checked={form.area === "inside"} onChange={() => set("area", "inside")} /><span>ঢাকার ভিতরে<small>{fmtPrice(calcDelivery(settings, p.price, "inside")) === "৳০" ? "ফ্রি" : fmtPrice(calcDelivery(settings, p.price, "inside"))}</small></span></label>
                </div>
                <input className={s.hp} tabIndex={-1} autoComplete="off" aria-hidden="true" name="website" value={form.website} onChange={(e) => set("website", e.target.value)} />

                <div className={s.sum}>
                  {(form.size || form.color) && <div className={s.sumRow}><span>পছন্দ</span><span>{[form.size, form.color].filter(Boolean).join(" · ")}</span></div>}
                  <div className={s.sumRow}><span>পণ্যের মূল্য</span><span>{fmtPrice(p.price)}</span></div>
                  <div className={s.sumRow}><span>ডেলিভারি চার্জ ({form.area === "inside" ? "ঢাকার ভিতরে" : "ঢাকার বাইরে"})</span><span>{delivery === 0 ? "ফ্রি" : fmtPrice(delivery)}</span></div>
                  <div className={`${s.sumRow} ${s.sumTotal}`}><span>সর্বমোট</span><span>{fmtPrice(total)}</span></div>
                </div>

                {error && <p className={s.err}>{error}</p>}
                <button className={s.submit} disabled={busy}>{busy ? "অর্ডার হচ্ছে..." : `অর্ডার কনফার্ম করুন — ${fmtPrice(total)}`}</button>
                <p className={s.cod}>ক্যাশ অন ডেলিভারি • পণ্য হাতে পেয়ে টাকা দিন</p>
              </form>
            )}

            <div className={s.shareRow}>
              শেয়ার করুন:
              <a className={s.shareBtn} target="_blank" rel="noreferrer" href={`https://wa.me/?text=${encodeURIComponent(p.name + " — " + shareUrl)}`}>WhatsApp</a>
              <a className={s.shareBtn} target="_blank" rel="noreferrer" href={`https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(shareUrl)}`}>Facebook</a>
            </div>
          </div>
        </div>

        {p.description && <div className={s.desc}><h2>পণ্যের বিবরণ</h2>{p.description}</div>}

        {related.length > 0 && (
          <section className={s.section}>
            <div className={s.sectionHead}><span style={{ color: "#B98B3C", fontWeight: 700, fontSize: ".82rem" }}>আরও দেখুন</span><h2>আপনার পছন্দ হতে পারে</h2><div className={s.divider} /></div>
            <div className={s.grid}>{related.map((r) => <ProductCard key={r.id} p={r} />)}</div>
          </section>
        )}
      </div>

      {zoom && (
        <div className={s.lightbox} onClick={() => setZoom(false)}>
          <button className={s.lbClose} aria-label="বন্ধ">×</button>
          {p.images.length > 1 && <button className={s.lbNav} style={{ left: 16 }} onClick={(e) => { e.stopPropagation(); setActive((active - 1 + p.images.length) % p.images.length); }}>‹</button>}
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={p.images[active]} alt={p.name} onClick={(e) => e.stopPropagation()} />
          {p.images.length > 1 && <button className={s.lbNav} style={{ right: 16 }} onClick={(e) => { e.stopPropagation(); setActive((active + 1) % p.images.length); }}>›</button>}
        </div>
      )}

      {!p.soldOut && (
        <div className={s.sticky}>
          <span className={s.price}>{fmtPrice(p.price)}</span>
          <button onClick={goOrder}>অর্ডার করুন</button>
        </div>
      )}
    </StoreLayout>
  );
}
