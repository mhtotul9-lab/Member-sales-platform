import { useState, useEffect, useMemo, useRef } from "react";
import StoreLayout from "../../components/store/StoreLayout";
import ProductCard from "../../components/store/ProductCard";
import s from "../../styles/store.module.css";
import { getSettings, getPublicProductBySlug, listPublicProducts } from "../../lib/store/server";
import { fmtPrice, toBnDigits, discountPercent, calcDelivery, isInsideDhaka, normalizePhone } from "../../lib/store/shared";
import { track, newEventId, getFbCookies } from "../../lib/store/pixel";

export async function getServerSideProps({ params, res }) {
  res.setHeader("Cache-Control", "public, s-maxage=30, stale-while-revalidate=300");
  const [settings, product] = await Promise.all([getSettings(), getPublicProductBySlug(params.slug)]);
  if (!product) return { notFound: true };
  const all = await listPublicProducts();
  const related = all.filter((p) => p.id !== product.id && !p.soldOut).sort((a, b) => (b.category === product.category) - (a.category === product.category)).slice(0, 4);
  return { props: { settings, product, related } };
}

export default function ProductPage({ settings, product: p, related }) {
  const [active, setActive] = useState(0);
  const [form, setForm] = useState({ name: "", phone: "", address: "", website: "" });
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const checkoutFired = useRef(false);
  const formRef = useRef(null);
  const eventId = useRef("");

  const off = discountPercent(p.price, p.comparePrice);
  const delivery = useMemo(() => calcDelivery(settings, p.price, form.address), [settings, p.price, form.address]);
  const addressTyped = form.address.trim().length > 0;
  const total = p.price + delivery;

  useEffect(() => {
    track("ViewContent", { content_ids: [p.id], content_name: p.name, content_type: "product", content_category: p.category, value: p.price, currency: "BDT", contents: [{ id: p.id, quantity: 1, item_price: p.price }] });
  }, [p]);

  function fireCheckout() {
    if (checkoutFired.current) return;
    checkoutFired.current = true;
    track("InitiateCheckout", { content_ids: [p.id], content_name: p.name, content_type: "product", num_items: 1, value: p.price, currency: "BDT", contents: [{ id: p.id, quantity: 1, item_price: p.price }] });
  }

  function goOrder() {
    track("AddToCart", { content_ids: [p.id], content_name: p.name, content_type: "product", value: p.price, currency: "BDT", contents: [{ id: p.id, quantity: 1, item_price: p.price }] });
    formRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
    setTimeout(() => formRef.current?.querySelector("input")?.focus({ preventScroll: true }), 500);
  }

  function set(k, v) { setForm((f) => ({ ...f, [k]: v })); }

  async function submit(e) {
    e.preventDefault();
    setError("");
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
      try { sessionStorage.setItem("jr_last_order", JSON.stringify({ ...data, phone: normalizePhone(form.phone), name: form.name.trim() })); } catch (e2) {}
      window.location.href = `/order-success?o=${encodeURIComponent(data.orderNo)}`;
    } catch (err) {
      setError(err.message);
      setBusy(false);
    }
  }

  const desc = (p.shortDescription || p.description || "").slice(0, 150);

  return (
    <StoreLayout settings={settings} title={`${p.name} — ${settings.storeName}`} description={desc} image={p.images[0]}>
      <div className={s.wrap}>
        <div className={s.crumbs}><a href="/">হোম</a> › {p.category && <><a href="/">{p.category}</a> › </>}{p.name}</div>
        <div className={s.pdp}>
          <div className={s.gallery}>
            <div className={s.mainImg}>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              {p.images[active] && <img src={p.images[active]} alt={p.name} />}
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
            {p.shortDescription && <div className={s.short}>{p.shortDescription}</div>}
            <div className={s.deliveryBox}>
              🚚 ডেলিভারি চার্জ: ঢাকার ভেতরে {fmtPrice(settings.deliveryInsideDhaka)}, ঢাকার বাইরে {fmtPrice(settings.deliveryOutsideDhaka)}
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
                <input className={s.hp} tabIndex={-1} autoComplete="off" aria-hidden="true" name="website" value={form.website} onChange={(e) => set("website", e.target.value)} />

                <div className={s.sum}>
                  <div className={s.sumRow}><span>পণ্যের মূল্য</span><span>{fmtPrice(p.price)}</span></div>
                  <div className={s.sumRow}><span>ডেলিভারি চার্জ{addressTyped ? (isInsideDhaka(form.address) ? " (ঢাকার ভেতরে)" : " (ঢাকার বাইরে)") : ""}</span><span>{delivery === 0 ? "ফ্রি" : fmtPrice(delivery)}</span></div>
                  <div className={`${s.sumRow} ${s.sumTotal}`}><span>সর্বমোট</span><span>{fmtPrice(total)}</span></div>
                </div>

                {error && <p className={s.err}>{error}</p>}
                <button className={s.submit} disabled={busy}>{busy ? "অর্ডার হচ্ছে..." : `অর্ডার কনফার্ম করুন — ${fmtPrice(total)}`}</button>
                <p className={s.cod}>ক্যাশ অন ডেলিভারি • পণ্য হাতে পেয়ে টাকা দিন</p>
              </form>
            )}
          </div>
        </div>

        {p.description && <div className={s.desc}><h2>পণ্যের বিবরণ</h2>{p.description}</div>}

        {related.length > 0 && (
          <section className={s.section}>
            <div className={s.sectionHead}><h2>আরও পণ্য</h2></div>
            <div className={s.grid}>{related.map((r) => <ProductCard key={r.id} p={r} />)}</div>
          </section>
        )}
      </div>

      {!p.soldOut && (
        <div className={s.sticky}>
          <span className={s.price}>{fmtPrice(p.price)}</span>
          <button onClick={goOrder}>অর্ডার করুন</button>
        </div>
      )}
    </StoreLayout>
  );
}
