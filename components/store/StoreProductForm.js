import { useState, useRef } from "react";
import { resizeImage } from "../../lib/store/imageResize";

const EMPTY = { name: "", category: "", price: "", comparePrice: "", costPrice: "", stock: "", status: "active", featured: false, sortOrder: "", slug: "", sizes: "", colors: "", images: [], shortDescription: "", description: "" };

export default function StoreProductForm({ initial, onSubmit, submitting, error, submitLabel, api }) {
  const [f, setF] = useState({ ...EMPTY, ...(initial || {}), price: initial?.price ?? "", comparePrice: initial?.comparePrice || "", costPrice: initial?.costPrice ?? "", stock: initial?.stock ?? "", sortOrder: initial?.sortOrder || "", sizes: (initial?.sizes || []).join(", "), colors: (initial?.colors || []).join(", ") });
  const [uploading, setUploading] = useState(false);
  const [upErr, setUpErr] = useState("");
  const [urlInput, setUrlInput] = useState("");
  const fileRef = useRef(null);
  const set = (k, v) => setF((x) => ({ ...x, [k]: v }));

  async function handleFiles(files) {
    setUpErr("");
    setUploading(true);
    try {
      const urls = [];
      for (const file of Array.from(files)) {
        const dataUrl = await resizeImage(file);
        const { url } = await api("/api/admin/store/upload", { method: "POST", body: { dataUrl } });
        urls.push(url);
      }
      setF((x) => ({ ...x, images: [...x.images, ...urls].slice(0, 8) }));
    } catch (e) {
      setUpErr(e.message);
    }
    setUploading(false);
    if (fileRef.current) fileRef.current.value = "";
  }

  function move(i, dir) {
    setF((x) => {
      const imgs = [...x.images];
      const j = i + dir;
      if (j < 0 || j >= imgs.length) return x;
      [imgs[i], imgs[j]] = [imgs[j], imgs[i]];
      return { ...x, images: imgs };
    });
  }

  return (
    <form onSubmit={(e) => { e.preventDefault(); onSubmit(f); }}>
      <div className="field"><label>প্রোডাক্টের নাম *</label><input required value={f.name} onChange={(e) => set("name", e.target.value)} /></div>
      <div className="form-grid-2">
        <div className="field"><label>বিক্রয় মূল্য (৳) *</label><input type="number" min="1" required value={f.price} onChange={(e) => set("price", e.target.value)} /></div>
        <div className="field"><label>আগের দাম (৳) — কাটা দাম দেখাবে</label><input type="number" min="0" value={f.comparePrice} onChange={(e) => set("comparePrice", e.target.value)} placeholder="ঐচ্ছিক" /></div>
        <div className="field"><label>কেনা দাম / Cost (৳) — শুধু আপনি দেখবেন</label><input type="number" min="0" value={f.costPrice} onChange={(e) => set("costPrice", e.target.value)} /></div>
        <div className="field"><label>স্টক (খালি রাখলে সীমাহীন)</label><input type="number" min="0" value={f.stock} onChange={(e) => set("stock", e.target.value)} placeholder="যেমন ৫০" /></div>
        <div className="field"><label>ক্যাটাগরি</label><input value={f.category} onChange={(e) => set("category", e.target.value)} placeholder="যেমন: শাড়ি, থ্রি-পিস" /></div>
        <div className="field">
          <label>স্ট্যাটাস</label>
          <select value={f.status} onChange={(e) => set("status", e.target.value)}>
            <option value="active">চালু (সাইটে দেখাবে)</option>
            <option value="out_of_stock">স্টক আউট (দেখাবে, অর্ডার বন্ধ)</option>
            <option value="draft">ড্রাফট (লুকানো)</option>
            <option value="archived">আর্কাইভড (লুকানো)</option>
          </select>
        </div>
      </div>

      <div className="field">
        <label>ছবি (সর্বোচ্চ ৮টি — প্রথমটাই মেইন ছবি)</label>
        <p className="muted" style={{ fontSize: "0.8rem", margin: "0 0 8px" }}>যে সাইজেরই ছবি দিন, সাইটে সব ছবি একই সাইজের বর্গাকার বক্সে দেখাবে। ছবি আপলোডের সময় নিজে থেকেই ছোট (compress) হয়ে যায়।</p>
        <div style={{ display: "flex", gap: 10, flexWrap: "wrap", marginBottom: 10 }}>
          {f.images.map((src, i) => (
            <div key={src + i} style={{ width: 96 }}>
              <div style={{ width: 96, height: 96, borderRadius: 10, overflow: "hidden", border: i === 0 ? "2px solid var(--teal)" : "1px solid var(--line)", background: "#eef1ef" }}>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={src} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
              </div>
              <div style={{ display: "flex", justifyContent: "space-between", marginTop: 4 }}>
                <button type="button" className="btn btn-outline btn-sm" style={{ padding: "2px 8px" }} onClick={() => move(i, -1)}>←</button>
                <button type="button" className="btn btn-outline btn-sm" style={{ padding: "2px 8px" }} onClick={() => move(i, 1)}>→</button>
                <button type="button" className="btn btn-outline btn-sm" style={{ padding: "2px 8px", color: "var(--red)" }} onClick={() => setF((x) => ({ ...x, images: x.images.filter((_, k) => k !== i) }))}>✕</button>
              </div>
            </div>
          ))}
        </div>
        <input ref={fileRef} type="file" accept="image/*" multiple style={{ display: "none" }} onChange={(e) => e.target.files?.length && handleFiles(e.target.files)} />
        <button type="button" className="btn btn-outline btn-sm" disabled={uploading || f.images.length >= 8} onClick={() => fileRef.current?.click()}>{uploading ? "আপলোড হচ্ছে..." : "📷 ছবি আপলোড করুন"}</button>
        {upErr && <p className="error-text">{upErr}</p>}
        <div style={{ display: "flex", gap: 8, marginTop: 10 }}>
          <input value={urlInput} onChange={(e) => setUrlInput(e.target.value)} placeholder="অথবা ছবির লিংক (https://...) পেস্ট করুন" style={{ flex: 1 }} />
          <button type="button" className="btn btn-outline btn-sm" onClick={() => { if (urlInput.trim()) { set("images", [...f.images, urlInput.trim()].slice(0, 8)); setUrlInput(""); } }}>যোগ</button>
        </div>
      </div>

      {Number(f.price) > 0 && f.costPrice !== "" && (
        <p style={{ margin: "0 0 14px", padding: "10px 14px", borderRadius: 10, background: "var(--paper)", fontWeight: 600 }}>
          প্রতি পিসে লাভ: <span style={{ color: Number(f.price) - Number(f.costPrice) >= 0 ? "var(--teal)" : "var(--red)" }}>৳{Number(f.price) - Number(f.costPrice)}</span>
        </p>
      )}
      <div className="form-grid-2">
        <div className="field"><label>সাইজ (কমা দিয়ে লিখুন, যেমন: M, L, XL) — ঐচ্ছিক</label><input value={f.sizes} onChange={(e) => set("sizes", e.target.value)} placeholder="খালি রাখলে সাইজ জিজ্ঞেস করবে না" /></div>
        <div className="field"><label>রং (কমা দিয়ে লিখুন) — ঐচ্ছিক</label><input value={f.colors} onChange={(e) => set("colors", e.target.value)} placeholder="যেমন: লাল, নীল, কালো" /></div>
      </div>
      <div className="field"><label>সংক্ষিপ্ত বর্ণনা (দামের নিচে দেখাবে)</label><textarea rows={2} value={f.shortDescription} onChange={(e) => set("shortDescription", e.target.value)} /></div>
      <div className="field"><label>বিস্তারিত বিবরণ</label><textarea rows={6} value={f.description} onChange={(e) => set("description", e.target.value)} /></div>

      <div className="form-grid-2">
        <div className="field"><label>সাজানোর নাম্বার (বড় নাম্বার আগে দেখায়)</label><input type="number" value={f.sortOrder} onChange={(e) => set("sortOrder", e.target.value)} placeholder="০" /></div>
        <div className="field"><label>লিংকের নাম (slug) — খালি রাখলে নিজে তৈরি হবে</label><input value={f.slug} onChange={(e) => set("slug", e.target.value)} placeholder="english-letters-only" /></div>
      </div>

      {error && <p className="error-text">{error}</p>}
      <button className="btn btn-teal" disabled={submitting || uploading} style={{ marginTop: 8 }}>{submitting ? "সেভ হচ্ছে..." : submitLabel}</button>
    </form>
  );
}
