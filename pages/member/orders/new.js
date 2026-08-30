import { useEffect, useState } from "react";
import { useRouter } from "next/router";
import { useAuth } from "../../../contexts/AuthContext";
import Nav from "../../../components/Nav";

const SOURCE_OPTIONS = [
  { value: "facebook", label: "Facebook" },
  { value: "tiktok", label: "TikTok" },
  { value: "instagram", label: "Instagram" },
  { value: "whatsapp", label: "WhatsApp" },
  { value: "messenger", label: "Messenger" },
  { value: "direct", label: "সরাসরি কাস্টমার" },
  { value: "other", label: "অন্যান্য" },
];

export default function NewOrder() {
  const { user, profile, loading } = useAuth();
  const router = useRouter();
  const [products, setProducts] = useState(null);
  const [form, setForm] = useState({
    productId: "", customerName: "", customerPhone: "", customerWhatsapp: "",
    customerAddress: "", quantity: "1", marketingSource: "facebook", notes: "", proofUrl: "",
  });
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (loading) return;
    if (!user) { router.replace("/login"); return; }
    if (!profile || profile.status !== "active") { router.replace("/pending"); return; }
  }, [user, profile, loading, router]);

  useEffect(() => {
    if (!user) return;
    (async () => {
      const token = await user.getIdToken();
      const res = await fetch("/api/member/products", { headers: { Authorization: `Bearer ${token}` } });
      const body = await res.json();
      if (res.ok) setProducts(body.products);
    })();
  }, [user]);

  function update(field, value) {
    setForm((f) => ({ ...f, [field]: value }));
  }

  const selectedProduct = products?.find((p) => p.id === form.productId);
  const estimatedTotal = selectedProduct ? (selectedProduct.sellingPrice * Number(form.quantity || 0)).toFixed(2) : null;

  async function handleSubmit(e) {
    e.preventDefault();
    setError("");
    if (!form.productId) { setError("প্রোডাক্ট সিলেক্ট করুন।"); return; }
    setSubmitting(true);
    try {
      const token = await user.getIdToken();
      const res = await fetch("/api/member/orders", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify(form),
      });
      const body = await res.json();
      if (!res.ok) throw new Error(body.error || "সাবমিট করা যায়নি।");
      router.replace("/member/orders");
    } catch (err) {
      setError(err.message);
    } finally {
      setSubmitting(false);
    }
  }

  if (loading || !profile) return null;

  return (
    <div className="shell">
      <Nav role={profile.role} active="orders" />
      <div className="container" style={{ maxWidth: 560 }}>
        <div className="card">
          <h1 style={{ fontSize: "1.25rem", marginBottom: 20 }}>নতুন অর্ডার সাবমিট করুন</h1>
          <form onSubmit={handleSubmit}>
            <div className="field">
              <label htmlFor="productId">প্রোডাক্ট</label>
              <select id="productId" required value={form.productId} onChange={(e) => update("productId", e.target.value)}>
                <option value="">-- সিলেক্ট করুন --</option>
                {(products || []).map((p) => (
                  <option key={p.id} value={p.id}>{p.name} — ৳{p.sellingPrice}</option>
                ))}
              </select>
            </div>

            <div className="field">
              <label htmlFor="quantity">পরিমাণ</label>
              <input id="quantity" type="number" min="1" required value={form.quantity} onChange={(e) => update("quantity", e.target.value)} />
            </div>

            {estimatedTotal && <p className="muted" style={{ marginBottom: 18 }}>মোট মূল্য: ৳{estimatedTotal}</p>}

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

            {error && <p className="error-text">{error}</p>}

            <button className="btn btn-primary" type="submit" disabled={submitting} style={{ width: "100%", marginTop: 6 }}>
              {submitting ? "সাবমিট হচ্ছে..." : "অর্ডার সাবমিট করুন"}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
