import { useState } from "react";

const STATUS_OPTIONS = [
  { value: "active", label: "অ্যাক্টিভ" },
  { value: "inactive", label: "ইনঅ্যাক্টিভ" },
  { value: "out_of_stock", label: "স্টক আউট" },
  { value: "archived", label: "আর্কাইভড" },
];

const emptyForm = {
  name: "",
  sku: "",
  category: "",
  sellingPrice: "",
  costPrice: "",
  status: "active",
  shortDescription: "",
  fullDescription: "",
  mainImageUrl: "",
  imageUrlsText: "",
  videoUrl: "",
  shortCaption: "",
  longCaption: "",
  whatsappMessage: "",
};

export default function ProductForm({ initial, submitting, error, onSubmit, submitLabel }) {
  const [form, setForm] = useState({
    ...emptyForm,
    ...(initial
      ? {
          ...initial,
          sellingPrice: String(initial.sellingPrice ?? ""),
          costPrice: String(initial.costPrice ?? ""),
          imageUrlsText: (initial.imageUrls || []).join("\n"),
        }
      : {}),
  });

  function update(field, value) {
    setForm((f) => ({ ...f, [field]: value }));
  }

  function handleSubmit(e) {
    e.preventDefault();
    onSubmit({
      name: form.name,
      sku: form.sku,
      category: form.category,
      sellingPrice: form.sellingPrice,
      costPrice: form.costPrice,
      status: form.status,
      shortDescription: form.shortDescription,
      fullDescription: form.fullDescription,
      mainImageUrl: form.mainImageUrl,
      imageUrls: form.imageUrlsText.split("\n").map((s) => s.trim()).filter(Boolean),
      videoUrl: form.videoUrl,
      shortCaption: form.shortCaption,
      longCaption: form.longCaption,
      whatsappMessage: form.whatsappMessage,
    });
  }

  return (
    <form onSubmit={handleSubmit}>
      <div className="form-grid-2">
        <div className="field">
          <label htmlFor="name">প্রোডাক্টের নাম</label>
          <input id="name" required value={form.name} onChange={(e) => update("name", e.target.value)} />
        </div>
        <div className="field">
          <label htmlFor="sku">SKU (ঐচ্ছিক)</label>
          <input id="sku" value={form.sku} onChange={(e) => update("sku", e.target.value)} />
        </div>
        <div className="field">
          <label htmlFor="category">ক্যাটাগরি</label>
          <input id="category" value={form.category} onChange={(e) => update("category", e.target.value)} />
        </div>
        <div className="field">
          <label htmlFor="status">স্ট্যাটাস</label>
          <select id="status" value={form.status} onChange={(e) => update("status", e.target.value)}>
            {STATUS_OPTIONS.map((s) => <option key={s.value} value={s.value}>{s.label}</option>)}
          </select>
        </div>
        <div className="field">
          <label htmlFor="sellingPrice">Selling Price (৳)</label>
          <input id="sellingPrice" type="number" step="0.01" required value={form.sellingPrice} onChange={(e) => update("sellingPrice", e.target.value)} />
        </div>
        <div className="field">
          <label htmlFor="costPrice">Cost Price (৳)</label>
          <input id="costPrice" type="number" step="0.01" required value={form.costPrice} onChange={(e) => update("costPrice", e.target.value)} />
        </div>
      </div>

      <div className="field">
        <label htmlFor="shortDescription">সংক্ষিপ্ত বর্ণনা</label>
        <textarea id="shortDescription" rows={2} value={form.shortDescription} onChange={(e) => update("shortDescription", e.target.value)} />
      </div>
      <div className="field">
        <label htmlFor="fullDescription">বিস্তারিত বর্ণনা</label>
        <textarea id="fullDescription" rows={4} value={form.fullDescription} onChange={(e) => update("fullDescription", e.target.value)} />
      </div>

      <hr style={{ border: "none", borderTop: "1px solid var(--line)", margin: "22px 0" }} />
      <p className="muted" style={{ marginBottom: 14 }}>মিডিয়া (external URL — ImgBB, Cloudinary, YouTube ইত্যাদি)</p>

      <div className="field">
        <label htmlFor="mainImageUrl">মেইন ছবির URL</label>
        <input id="mainImageUrl" value={form.mainImageUrl} onChange={(e) => update("mainImageUrl", e.target.value)} placeholder="https://..." />
        {form.mainImageUrl && (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={form.mainImageUrl}
            alt="প্রিভিউ"
            style={{ width: 100, height: 100, objectFit: "cover", borderRadius: 8, marginTop: 10, border: "1px solid var(--line)" }}
            onError={(e) => { e.currentTarget.style.display = "none"; }}
            onLoad={(e) => { e.currentTarget.style.display = "block"; }}
          />
        )}
      </div>
      <div className="field">
        <label htmlFor="imageUrlsText">আরও ছবির URL (প্রতি লাইনে একটা করে)</label>
        <textarea id="imageUrlsText" rows={3} value={form.imageUrlsText} onChange={(e) => update("imageUrlsText", e.target.value)} placeholder={"https://...\nhttps://..."} />
      </div>
      <div className="field">
        <label htmlFor="videoUrl">ভিডিও URL (YouTube লিংক)</label>
        <input id="videoUrl" value={form.videoUrl} onChange={(e) => update("videoUrl", e.target.value)} placeholder="https://youtu.be/..." />
      </div>

      <hr style={{ border: "none", borderTop: "1px solid var(--line)", margin: "22px 0" }} />
      <p className="muted" style={{ marginBottom: 14 }}>মার্কেটিং টেক্সট (মেম্বাররা কপি করে ব্যবহার করবে)</p>

      <div className="field">
        <label htmlFor="shortCaption">শর্ট ক্যাপশন</label>
        <textarea id="shortCaption" rows={2} value={form.shortCaption} onChange={(e) => update("shortCaption", e.target.value)} />
      </div>
      <div className="field">
        <label htmlFor="longCaption">লং ক্যাপশন</label>
        <textarea id="longCaption" rows={3} value={form.longCaption} onChange={(e) => update("longCaption", e.target.value)} />
      </div>
      <div className="field">
        <label htmlFor="whatsappMessage">হোয়াটসঅ্যাপ মেসেজ টেমপ্লেট</label>
        <textarea id="whatsappMessage" rows={2} value={form.whatsappMessage} onChange={(e) => update("whatsappMessage", e.target.value)} />
      </div>

      {error && <p className="error-text">{error}</p>}

      <button className="btn btn-primary" type="submit" disabled={submitting} style={{ marginTop: 8 }}>
        {submitting ? "সেভ হচ্ছে..." : submitLabel}
      </button>
    </form>
  );
}
