import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/router";
import StoreLayout from "../../components/store/StoreLayout";
import ProductCard, { taka, discountPct } from "../../components/store/ProductCard";
import { getStoreProduct, getStoreProducts, getStoreSettings, publicSettings, toCard, toDetail, deliveryFor } from "../../lib/storefront";
import { normalizeBdPhone, isValidBdPhone } from "../../lib/phone";
import { track, setUserData, getFbIds, getUtm, PIXEL_ID } from "../../lib/pixel";

export async function getServerSideProps({ params, res }) {
  const found = await getStoreProduct(params.id);
  if (!found) return { notFound: true };
  res.setHeader("Cache-Control", "public, s-maxage=30, stale-while-revalidate=120");
  const [settings, all] = await Promise.all([getStoreSettings(), getStoreProducts()]);
  const product = toDetail(found.id, found.data);
  const others = all.filter((i) => i.id !== found.id);
  others.sort((a, b) => (b.data.category === product.category) - (a.data.category === product.category));
  return {
    props: {
      settings: publicSettings(settings), product,
      delivery: deliveryFor(settings, product.sellingPrice),
      related: others.slice(0, 4).map((i) => toCard(i.id, i.data)),
    },
  };
}

function ytEmbed(url) {
  const m = url.match(/(?:youtu\.be\/|youtube\.com\/(?:watch\?v=|embed\/|shorts\/))([a-zA-Z0-9_-]{11})/);
  return m ? `https://www.youtube.com/embed/${m[1]}` : null;
}

export default function ProductPage({ settings, product, delivery, related }) {
  const router = useRouter();
  const images = [product.mainImageUrl, ...product.imageUrls].filter(Boolean);
  const [active, setActive] = useState(0);
  const [form, setForm] = useState({ name: "", phone: "", address: "", website: "" });
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const startedCheckout = useRef(false);
  const total = product.sellingPrice + delivery;
  const off = discountPct(product);
  const canOrder = !product.outOfStock && settings.orderingEnabled !== false;
  const content = { content_ids: [product.id], content_type: "product", content_name: product.name, value: product.sellingPrice, currency: "BDT", contents: [{ id: product.id, quantity: 1, item_price: product.sellingPrice }] };

  useEffect(() => { track("ViewContent", content); /* eslint-disable-next-line */ }, [product.id]);

  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }));

  function startCheckout() {
    if (startedCheckout.current) return;
    startedCheckout.current = true;
    track("InitiateCheckout", { ...content, num_items: 1 });
  }

  function jumpToForm() {
    track("AddToCart", content);
    document.getElementById("order-form")?.scrollIntoView({ behavior: "smooth", block: "center" });
  }

  async function submit(e) {
    e.preventDefault();
    setError("");
    const phone = normalizeBdPhone(form.phone);
    if (form.name.trim().length < 2) return setError("আপনার নাম লিখুন।");
    if (!isValidBdPhone(phone)) return setError("সঠিক ১১ ডিজিটের মোবাইল নম্বর দিন (যেমন 01712345678)।");
    if (form.address.trim().length < 8) return setError("সম্পূর্ণ ঠিকানা লিখুন (গ্রাম/এলাকা, থানা, জেলা)।");

    setBusy(true);
    try {
      const res = await fetch("/api/public/orders", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          productId: product.id, customerName: form.name, customerPhone: phone, customerAddress: form.address,
          website: form.website, utm: getUtm(), ...getFbIds(), pageUrl: window.location.href,
        }),
      });
      const body = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(body.error || "অর্ডার করা যায়নি। আবার চেষ্টা করুন।");

      if (!body.duplicate) {
        setUserData({ phone, name: form.name });
        track("Purchase", { ...content, value: body.total, transaction_id: body.orderId, num_items: 1 }, body.eventId);
      }
      try { sessionStorage.setItem("lastOrder", JSON.stringify({ orderId: body.orderId, total: body.total, productName: product.name })); } catch {}
      router.push(`/order-success?o=${encodeURIComponent(body.orderId)}`);
    } catch (err) {
      setError(err.message);
      setBusy(false);
    }
  }

  const video = product.videoUrls[0];
  const embed = video && ytEmbed(video);

  return (
    <StoreLayout settings={settings} title={product.name} description={product.shortDescription || `${product.name} — ${taka(product.sellingPrice)}`} image={product.mainImageUrl}>
      <div className="st-wrap st-pdp">
        <div className="st-gallery">
          <div className="st-gallery-main">
            {images.length ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={images[active]} alt={product.name} />
            ) : <span>ছবি নেই</span>}
          </div>
          {images.length > 1 && (
            <div className="st-thumbs">
              {images.map((u, i) => (
                <button key={u + i} className={i === active ? "on" : ""} onClick={() => setActive(i)} aria-label={`ছবি ${i + 1}`}>
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={u} alt="" />
                </button>
              ))}
            </div>
          )}
        </div>

        <div className="st-info">
          {product.category && <span className="st-cat">{product.category}</span>}
          <h1>{product.name}</h1>
          <div className="st-price st-price-lg">
            <b>{taka(product.sellingPrice)}</b>
            {product.comparePrice > product.sellingPrice && <s>{taka(product.comparePrice)}</s>}
            {off > 0 && <em className="st-badge st-badge-inline">{off.toLocaleString("bn-BD")}% ছাড়</em>}
          </div>
          {product.shortDescription && <p className="st-short">{product.shortDescription}</p>}

          <form id="order-form" className="st-form" onSubmit={submit} onFocus={startCheckout} noValidate>
            <h2>অর্ডার করতে তথ্য দিন</h2>
            <label>আপনার নাম
              <input value={form.name} onChange={set("name")} autoComplete="name" placeholder="যেমন: রহিম উদ্দিন" disabled={!canOrder} />
            </label>
            <label>মোবাইল নম্বর
              <input value={form.phone} onChange={set("phone")} type="tel" inputMode="numeric" autoComplete="tel" placeholder="01XXXXXXXXX" disabled={!canOrder} />
            </label>
            <label>সম্পূর্ণ ঠিকানা
              <textarea value={form.address} onChange={set("address")} rows={3} autoComplete="street-address" placeholder="গ্রাম/এলাকা, থানা, জেলা" disabled={!canOrder} />
            </label>
            <input className="st-hp" tabIndex={-1} autoComplete="off" aria-hidden="true" value={form.website} onChange={set("website")} />

            <div className="st-sum">
              <div><span>পণ্যের দাম</span><span>{taka(product.sellingPrice)}</span></div>
              <div><span>ডেলিভারি চার্জ</span><span>{delivery ? taka(delivery) : "ফ্রি"}</span></div>
              <div className="st-sum-total"><span>মোট (ক্যাশ অন ডেলিভারি)</span><span>{taka(total)}</span></div>
            </div>

            {error && <p className="st-error" role="alert">{error}</p>}
            <button className="st-btn st-btn-lg st-btn-block" type="submit" disabled={busy || !canOrder}>
              {product.outOfStock ? "স্টক শেষ" : !canOrder ? "অর্ডার বন্ধ আছে" : busy ? "অর্ডার হচ্ছে…" : "অর্ডার কনফার্ম করুন"}
            </button>
            <p className="st-note">অর্ডারের পর আমাদের প্রতিনিধি ফোন করে কনফার্ম করবেন। পণ্য হাতে পেয়ে টাকা দিন।</p>
          </form>

          {(product.fullDescription || embed || video) && (
            <div className="st-desc">
              <h2>প্রোডাক্টের বিবরণ</h2>
              {product.fullDescription && <p>{product.fullDescription}</p>}
              {embed ? (
                <iframe src={embed} title="প্রোডাক্ট ভিডিও" allow="encrypted-media" allowFullScreen loading="lazy" />
              ) : video ? <video src={video} controls preload="metadata" /> : null}
            </div>
          )}
        </div>
      </div>

      {related.length > 0 && (
        <section className="st-wrap">
          <h2 className="st-h2">আরও দেখুন</h2>
          <div className="st-grid">{related.map((p) => <ProductCard key={p.id} p={p} />)}</div>
        </section>
      )}

      {canOrder && (
        <div className="st-sticky">
          <div><b>{taka(product.sellingPrice)}</b>{product.comparePrice > product.sellingPrice && <s>{taka(product.comparePrice)}</s>}</div>
          <button className="st-btn" onClick={jumpToForm}>অর্ডার করুন</button>
        </div>
      )}
    </StoreLayout>
  );
}
