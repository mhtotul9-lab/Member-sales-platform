import { slugify } from "./shared";

function splitList(v) {
  const arr = Array.isArray(v) ? v : String(v || "").split(/[,\n،]/);
  return arr.map((x) => String(x).trim()).filter(Boolean).slice(0, 20);
}

export const PRODUCT_STATUSES = ["active", "out_of_stock", "draft", "archived"];

// ফর্মের ডেটা যাচাই করে Firestore ডক বানায়।
export function buildProductDoc(body, existing) {
  const name = String(body.name || "").trim();
  if (!name) return { error: "প্রোডাক্টের নাম দিতে হবে।" };
  const price = Number(body.price);
  if (!(price > 0)) return { error: "সঠিক বিক্রয় মূল্য দিন।" };
  const status = PRODUCT_STATUSES.includes(body.status) ? body.status : "active";
  const stockRaw = body.stock;
  const stock = stockRaw === "" || stockRaw === null || stockRaw === undefined ? null : Math.max(0, Math.floor(Number(stockRaw) || 0));
  const doc = {
    name,
    slug: String(body.slug || "").trim().toLowerCase().replace(/[^a-z0-9-]/g, "") || (existing && existing.slug) || slugify(name),
    category: String(body.category || "").trim(),
    price,
    comparePrice: Number(body.comparePrice) || 0,
    costPrice: Number(body.costPrice) || 0,
    stock,
    status,
    featured: !!body.featured,
    sortOrder: Number(body.sortOrder) || 0,
    images: Array.isArray(body.images) ? body.images.map((s) => String(s).trim()).filter(Boolean).slice(0, 8) : [],
    sizes: splitList(body.sizes),
    colors: splitList(body.colors),
    shortDescription: String(body.shortDescription || "").slice(0, 300),
    description: String(body.description || "").slice(0, 5000),
    updatedAt: new Date().toISOString(),
  };
  return { doc };
}
