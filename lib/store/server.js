// সার্ভার-অনলি ডেটা হেল্পার (getServerSideProps ও API রুট থেকে ব্যবহার হয়)।
import { adminDb } from "../firebaseAdmin";
import { DEFAULT_SETTINGS } from "./shared";

export async function getSettings() {
  const snap = await adminDb.collection("store_settings").doc("main").get();
  return { ...DEFAULT_SETTINGS, ...(snap.exists ? snap.data() : {}) };
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
    featured: !!d.featured,
    sortOrder: Number(d.sortOrder) || 0,
    createdAt: d.createdAt || "",
  };
}

export async function listPublicProducts() {
  const snap = await adminDb.collection("store_products").where("status", "in", ["active", "out_of_stock"]).get();
  const list = snap.docs.map((doc) => toPublicProduct(doc.id, doc.data()));
  list.sort((a, b) => b.sortOrder - a.sortOrder || String(b.createdAt).localeCompare(String(a.createdAt)));
  return list;
}

export async function getPublicProductBySlug(slug) {
  const snap = await adminDb.collection("store_products").where("slug", "==", slug).limit(1).get();
  if (snap.empty) return null;
  const doc = snap.docs[0];
  const d = doc.data();
  if (d.status === "draft" || d.status === "archived") return null;
  return toPublicProduct(doc.id, d);
}

// বাংলাদেশ সময় অনুযায়ী YYYYMMDD
export function dhakaDateKey(date = new Date()) {
  return new Date(date.getTime() + 6 * 3600 * 1000).toISOString().slice(0, 10).replace(/-/g, "");
}

export function dhakaDateISO(date = new Date()) {
  return new Date(date.getTime() + 6 * 3600 * 1000).toISOString().slice(0, 10);
}
