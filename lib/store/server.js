// সার্ভার-অনলি ডেটা হেল্পার (getServerSideProps ও API রুট থেকে ব্যবহার হয়)।
import { adminDb } from "../firebaseAdmin";
import { DEFAULT_SETTINGS } from "./shared";

// ── ইন-মেমোরি ক্যাশ (Firestore রিড কমানোর জন্য) ──────────────────────────
// একই সার্ভার ইনস্ট্যান্সে ২ মিনিট পর্যন্ত সেটিংস ও পণ্যতালিকা মনে রাখে।
// Meta/TikTok অ্যাডের ?fbclid=… ক্লিকে CDN ক্যাশ মিস হলেও আর Firestore পড়তে হয় না।
// Firestore ফেল করলে (যেমন কোটা শেষ) আগের ডেটা দিয়ে সাইট চালু রাখে।
const CACHE_TTL_MS = 120 * 1000;
const RETRY_AFTER_ERROR_MS = 15 * 1000;
const _cache = globalThis.__jolrasiStoreCache || (globalThis.__jolrasiStoreCache = {});

async function cached(key, loader) {
  const e = _cache[key] || (_cache[key] = { val: undefined, exp: 0, pending: null });
  if (e.val !== undefined && e.exp > Date.now()) return e.val;
  if (e.pending) return e.pending;
  e.pending = loader()
    .then((v) => { e.val = v; e.exp = Date.now() + CACHE_TTL_MS; return v; })
    .catch((err) => {
      if (e.val !== undefined) { e.exp = Date.now() + RETRY_AFTER_ERROR_MS; return e.val; }
      throw err;
    })
    .finally(() => { e.pending = null; });
  return e.pending;
}

export function clearStoreCache() {
  for (const k of Object.keys(_cache)) delete _cache[k];
}

// { fresh: true } দিলে ক্যাশ বাদ দিয়ে সরাসরি Firestore থেকে পড়ে (অর্ডার/অ্যাডমিন সেটিংসের জন্য)
export async function getSettings({ fresh = false } = {}) {
  const load = async () => {
    const snap = await adminDb.collection("store_settings").doc("main").get();
    return { ...DEFAULT_SETTINGS, ...(snap.exists ? snap.data() : {}) };
  };
  return fresh ? load() : cached("settings", load);
}

// কাস্টমারকে দেখানোর জন্য — costPrice/স্টক সংখ্যা কখনো যায় না।
export function toPublicProduct(id, d) {
  const images = Array.isArray(d.images) ? d.images.filter(Boolean) : [];
  return {
    id,
    slug: d.slug || id,
    name: d.name || "",
    category: d.category || "",
    price: Number(d.price) || 0,
    comparePrice: Number(d.comparePrice) || 0,
    images,
    shortDescription: d.shortDescription || "",
    description: d.description || "",
    soldOut: d.status === "out_of_stock" || (d.stock !== null && d.stock !== undefined && d.stock !== "" && Number(d.stock) <= 0),
    sizes: Array.isArray(d.sizes) ? d.sizes : [],
    colors: Array.isArray(d.colors) ? d.colors : [],
    stockLeft: d.stock !== null && d.stock !== undefined && d.stock !== "" && Number(d.stock) > 0 && Number(d.stock) <= 5 ? Number(d.stock) : 0,
    featured: !!d.featured,
    sortOrder: Number(d.sortOrder) || 0,
    createdAt: d.createdAt || "",
  };
}

// সতর্কতা: এই তালিকা ক্যাশ থেকে শেয়ার হয় — ফেরত আসা অ্যারে/অবজেক্ট বদলাবেন না (filter/map ঠিক আছে)।
export async function listPublicProducts() {
  return cached("products", async () => {
    const snap = await adminDb.collection("store_products").where("status", "in", ["active", "out_of_stock"]).get();
    const list = snap.docs.map((doc) => toPublicProduct(doc.id, doc.data()));
    list.sort((a, b) => b.sortOrder - a.sortOrder || String(b.createdAt).localeCompare(String(a.createdAt)));
    return list;
  });
}

// আলাদা Firestore কোয়েরি নয় — ক্যাশ করা তালিকা থেকে খোঁজে (draft/archived আগেই বাদ)।
export async function getPublicProductBySlug(slug) {
  const list = await listPublicProducts();
  return list.find((p) => p.slug === slug) || null;
}

// বাংলাদেশ সময় অনুযায়ী YYYYMMDD
export function dhakaDateKey(date = new Date()) {
  return new Date(date.getTime() + 6 * 3600 * 1000).toISOString().slice(0, 10).replace(/-/g, "");
}

export function dhakaDateISO(date = new Date()) {
  return new Date(date.getTime() + 6 * 3600 * 1000).toISOString().slice(0, 10);
}
