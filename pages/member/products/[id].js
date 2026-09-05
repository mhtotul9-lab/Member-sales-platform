import { useEffect, useState } from "react";
import { useRouter } from "next/router";
import { useAuth } from "../../../contexts/AuthContext";
import Nav from "../../../components/Nav";
import Loading from "../../../components/Loading";
import ErrorText from "../../../components/ErrorText";

const SOURCE_OPTIONS = [
  { value: "facebook", label: "Facebook" },
  { value: "tiktok", label: "TikTok" },
  { value: "instagram", label: "Instagram" },
  { value: "whatsapp", label: "WhatsApp" },
  { value: "messenger", label: "Messenger" },
  { value: "direct", label: "সরাসরি কাস্টমার" },
  { value: "other", label: "অন্যান্য" },
];

function CopyButton({ text, label }) {
  const [copied, setCopied] = useState(false);
  if (!text) return null;
  return (
    <button
      type="button"
      className="btn btn-outline btn-sm"
      onClick={async () => {
        try {
          await navigator.clipboard.writeText(text);
          setCopied(true);
          setTimeout(() => setCopied(false), 1500);
        } catch {
          // clipboard permission denied — nothing more we can do here
        }
      }}
    >
      {copied ? "কপি হয়েছে ✓" : label}
    </button>
  );
}

function DownloadButton({ url, filename, label, getToken }) {
  const [state, setState] = useState("idle"); // idle | working | done | error

  async function handleDownload() {
    setState("working");
    try {
      const token = await getToken();
      const proxyUrl = `/api/member/download?url=${encodeURIComponent(url)}&filename=${encodeURIComponent(filename)}`;
      const res = await fetch(proxyUrl, { headers: { Authorization: `Bearer ${token}` } });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.error || "ডাউনলোড করা যায়নি।");
      }
      const blob = await res.blob();
      const blobUrl = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = blobUrl;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(blobUrl);
      setState("done");
      setTimeout(() => setState("idle"), 1500);
    } catch {
      setState("error");
      setTimeout(() => setState("idle"), 2000);
    }
  }

  return (
    <button type="button" className="btn btn-outline btn-sm" disabled={state === "working"} onClick={handleDownload}>
      {state === "working" ? "ডাউনলোড হচ্ছে..." : state === "done" ? "ডাউনলোড হয়েছে ✓" : state === "error" ? "সমস্যা হয়েছে, আবার চেষ্টা করুন" : label}
    </button>
  );
}

function OrderForm({ product, user, onDone }) {
  const [form, setForm] = useState({
    customerName: "", customerPhone: "", customerWhatsapp: "",
    customerAddress: "", quantity: "1", marketingSource: "facebook",
    notes: "", proofUrl: "", customerSalePrice: "",
  });
  const [touchedPrice, setTouchedPrice] = useState(false);
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  function update(field, value) {
    setForm((f) => ({ ...f, [field]: value }));
  }

  // Keep the suggested sale price in sync with quantity × catalog price,
  // unless the member has already typed their own negotiated price.
  useEffect(() => {
    if (touchedPrice) return;
    const qty = Number(form.quantity || 0);
    if (qty > 0) update("customerSalePrice", (product.sellingPrice * qty).toFixed(2));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [form.quantity, touchedPrice]);

  async function handleSubmit(e) {
    e.preventDefault();
    setError("");
    setSubmitting(true);
    try {
      const token = await user.getIdToken();
      const res = await fetch("/api/member/orders", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ ...form, productId: product.id }),
      });
      const body = await res.json();
      if (!res.ok) throw new Error(body.error || "সাবমিট করা যায়নি।");
      onDone();
    } catch (err) {
      setError(err.message);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <form onSubmit={handleSubmit}>
      <div className="field">
        <label htmlFor="quantity">পরিমাণ</label>
        <input id="quantity" type="number" min="1" required value={form.quantity} onChange={(e) => update("quantity", e.target.value)} />
      </div>

      <div className="field">
        <label htmlFor="customerSalePrice">কাস্টমারকে কত টাকায় বিক্রি করেছেন (৳)</label>
        <input
          id="customerSalePrice"
          type="number"
          step="0.01"
          min="0.01"
          required
          value={form.customerSalePrice}
          onChange={(e) => { setTouchedPrice(true); update("customerSalePrice", e.target.value); }}
        />
        <p className="help-text" style={{ marginTop: 6 }}>
          এটা ডেলিভারি ভাউচারে বসানোর জন্য — ক্যাটালগ প্রাইস থেকে দরকষাকষি করে কম/বেশিতে বিক্রি করে থাকলে এখানে আসল বিক্রয়মূল্য লিখুন।
        </p>
      </div>

      <div className="field">
        <label htmlFor="customerName">কাস্টমারের নাম</label>
        <input id="customerName" required value={form.customerName} onChange={(e) => update("customerName", e.target.value)} />
      </div>
      <div className="field">
        <label htmlFor="customerPhone">কাস্টমারের ফোন নম্বর</label>
        <input id="customerPhone" required value={form.customerPhone} onChange={(e) => update("customerPhone", e.target.value)} />
      </div>
      <div className="field">
        <label htmlFor="customerWhatsapp">কাস্টমারের হোয়াটসঅ্যাপ (ঐচ্ছিক)</label>
        <input id="customerWhatsapp" value={form.customerWhatsapp} onChange={(e) => update("customerWhatsapp", e.target.value)} />
      </div>
      <div className="field">
        <label htmlFor="customerAddress">ঠিকানা</label>
        <textarea id="customerAddress" rows={2} value={form.customerAddress} onChange={(e) => update("customerAddress", e.target.value)} />
      </div>
      <div className="field">
        <label htmlFor="marketingSource">মার্কেটিং সোর্স</label>
        <select id="marketingSource" value={form.marketingSource} onChange={(e) => update("marketingSource", e.target.value)}>
          {SOURCE_OPTIONS.map((s) => <option key={s.value} value={s.value}>{s.label}</option>)}
        </select>
      </div>
      <div className="field">
        <label htmlFor="proofUrl">প্রুফ / স্ক্রিনশট URL (ঐচ্ছিক)</label>
        <input id="proofUrl" value={form.proofUrl} onChange={(e) => update("proofUrl", e.target.value)} placeholder="https://..." />
        <p className="help-text" style={{ marginTop: 6 }}>ImgBB বা এমন কোনো সাইটে স্ক্রিনশট আপলোড করে সেই লিংক দিন।</p>
      </div>
      <div className="field">
        <label htmlFor="notes">নোট (ঐচ্ছিক)</label>
        <textarea id="notes" rows={2} value={form.notes} onChange={(e) => update("notes", e.target.value)} />
      </div>

      {error && <ErrorText>{error}</ErrorText>}

      <button className="btn btn-primary" type="submit" disabled={submitting} style={{ width: "100%", marginTop: 6 }}>
        {submitting ? "সাবমিট হচ্ছে..." : "অর্ডার সাবমিট করুন"}
      </button>
    </form>
  );
}

export default function MemberProductDetail() {
  const { user, profile, loading } = useAuth();
  const router = useRouter();
  const { id } = router.query;
  const [product, setProduct] = useState(null);
  const [error, setError] = useState("");
  const [orderOpen, setOrderOpen] = useState(false);
  const [justSubmitted, setJustSubmitted] = useState(false);

  useEffect(() => {
    if (loading) return;
    if (!user) { router.replace("/login"); return; }
    if (!profile || profile.status !== "active") { router.replace("/pending"); return; }
  }, [user, profile, loading, router]);

  useEffect(() => {
    if (!user || !id) return;
    (async () => {
      try {
        const token = await user.getIdToken();
        const res = await fetch(`/api/member/products/${id}`, { headers: { Authorization: `Bearer ${token}` } });
        const body = await res.json();
        if (!res.ok) throw new Error(body.error || "লোড করা যায়নি।");
        setProduct(body.product);
      } catch (err) {
        setError(err.message);
      }
    })();
  }, [user, id]);

  if (loading || !profile) return null;

  const getToken = () => user.getIdToken();
  const slug = (product?.name || "product").replace(/[^a-zA-Z0-9\u0980-\u09FF]+/g, "-").slice(0, 40);

  return (
    <div className="shell">
      <Nav role={profile.role} active="products" />
      <div className="container" style={{ maxWidth: 720 }}>
        {error && <ErrorText>{error}</ErrorText>}
        {!product && !error && <Loading />}

        {product && (
          <>
            <div className="card" style={{ marginBottom: 20 }}>
              {product.mainImageUrl && (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={product.mainImageUrl} alt={product.name} style={{ width: "100%", maxHeight: 320, objectFit: "cover", borderRadius: 8, marginBottom: 18 }} />
              )}
              <h1 style={{ fontSize: "1.35rem", marginBottom: 6 }}>{product.name}</h1>
              <div className="muted" style={{ marginBottom: 6 }}>৳{product.sellingPrice} {product.category && `· ${product.category}`}</div>
              <div style={{ marginBottom: 14 }}>
                <span className="stamp stamp-active">এই প্রোডাক্ট সেল করলে কমিশন ৳{product.memberCommission || 0}</span>
              </div>
              <div style={{ marginBottom: 14, display: "flex", gap: 10 }}>
                <CopyButton text={product.name} label="প্রোডাক্টের নাম কপি করুন" />
              </div>
              {product.shortDescription && (
                <div style={{ marginBottom: 10 }}>
                  <p style={{ marginBottom: 6 }}>{product.shortDescription}</p>
                  <CopyButton text={product.shortDescription} label="সংক্ষিপ্ত বর্ণনা কপি করুন" />
                </div>
              )}
              {product.fullDescription && (
                <div style={{ marginBottom: 18 }}>
                  <p className="muted" style={{ marginBottom: 6 }}>{product.fullDescription}</p>
                  <CopyButton text={product.fullDescription} label="বিস্তারিত বর্ণনা কপি করুন" />
                </div>
              )}

              {!orderOpen && !justSubmitted && (
                <button className="btn btn-primary" style={{ width: "100%" }} onClick={() => setOrderOpen(true)}>
                  এই প্রোডাক্টের অর্ডার সাবমিট করুন
                </button>
              )}
              {justSubmitted && (
                <div style={{ background: "var(--teal-soft)", borderRadius: 8, padding: "14px 16px", textAlign: "center" }}>
                  <p style={{ color: "var(--teal)", fontWeight: 700, marginBottom: 8 }}>অর্ডার সাবমিট হয়েছে ✓</p>
                  <a className="btn btn-outline btn-sm" href="/member/orders">আমার অর্ডার লিস্টে দেখুন</a>
                </div>
              )}
            </div>

            {orderOpen && (
              <div className="card" style={{ marginBottom: 20 }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 18 }}>
                  <h2 style={{ fontSize: "1.05rem" }}>অর্ডার সাবমিট করুন</h2>
                  <button className="btn btn-outline btn-sm" onClick={() => setOrderOpen(false)}>বাতিল</button>
                </div>
                <OrderForm product={product} user={user} onDone={() => { setOrderOpen(false); setJustSubmitted(true); }} />
              </div>
            )}

            <div className="card" style={{ marginBottom: 20 }}>
              <h2 style={{ fontSize: "1.05rem", marginBottom: 4 }}>মার্কেটিং মিডিয়া</h2>
              <p className="muted" style={{ marginBottom: 14, fontSize: "0.85rem" }}>
                বাটনে ক্লিক করলেই ছবি সরাসরি ডাউনলোড হয়ে যাবে।
              </p>
              <div style={{ display: "flex", flexWrap: "wrap", gap: 10 }}>
                {product.mainImageUrl && (
                  <DownloadButton url={product.mainImageUrl} filename={`${slug}-main.jpg`} label="মেইন ছবি ডাউনলোড" getToken={getToken} />
                )}
                {(product.imageUrls || []).map((url, i) => (
                  <DownloadButton key={i} url={url} filename={`${slug}-${i + 1}.jpg`} label={`ছবি ${i + 1} ডাউনলোড`} getToken={getToken} />
                ))}
                {product.videoUrl && (
                  <a className="btn btn-outline btn-sm" href={product.videoUrl} target="_blank" rel="noreferrer">ভিডিও দেখুন</a>
                )}
              </div>
              {!product.mainImageUrl && !(product.imageUrls || []).length && !product.videoUrl && (
                <p className="muted">এই প্রোডাক্টের জন্য এখনো মিডিয়া যোগ করা হয়নি।</p>
              )}
            </div>

            <div className="card">
              <h2 style={{ fontSize: "1.05rem", marginBottom: 14 }}>মার্কেটিং টেক্সট</h2>

              {product.shortCaption && (
                <div style={{ marginBottom: 16 }}>
                  <p className="muted" style={{ marginBottom: 6 }}>{product.shortCaption}</p>
                  <CopyButton text={product.shortCaption} label="শর্ট ক্যাপশন কপি করুন" />
                </div>
              )}
              {product.longCaption && (
                <div style={{ marginBottom: 16 }}>
                  <p className="muted" style={{ marginBottom: 6, whiteSpace: "pre-wrap" }}>{product.longCaption}</p>
                  <CopyButton text={product.longCaption} label="লং ক্যাপশন কপি করুন" />
                </div>
              )}
              {product.whatsappMessage && (
                <div>
                  <p className="muted" style={{ marginBottom: 6, whiteSpace: "pre-wrap" }}>{product.whatsappMessage}</p>
                  <CopyButton text={product.whatsappMessage} label="হোয়াটসঅ্যাপ মেসেজ কপি করুন" />
                </div>
              )}
              {!product.shortCaption && !product.longCaption && !product.whatsappMessage && (
                <p className="muted">এই প্রোডাক্টের জন্য এখনো মার্কেটিং টেক্সট যোগ করা হয়নি।</p>
              )}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
