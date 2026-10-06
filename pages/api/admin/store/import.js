import { adminDb } from "../../../../lib/firebaseAdmin";
import { withErrorHandling } from "../../../../lib/apiWrapper";
import { guardAdmin } from "../../../../lib/store/adminApi";
import { slugify } from "../../../../lib/store/shared";

// রিসেলিং প্ল্যাটফর্মের (products collection) প্রোডাক্ট স্টোরে এক ক্লিকে ইম্পোর্ট।
// মূল প্রোডাক্ট একটুও বদলায় না — শুধু কপি তৈরি হয়।
async function handler(req, res) {
  if (!(await guardAdmin(req, res))) return;

  if (req.method === "GET") {
    const [src, store] = await Promise.all([adminDb.collection("products").get(), adminDb.collection("store_products").get()]);
    const imported = new Set(store.docs.map((d) => d.data().sourceProductId).filter(Boolean));
    const products = src.docs
      .map((d) => {
        const x = d.data();
        return { id: d.id, name: x.name, category: x.category || "", sellingPrice: x.sellingPrice, costPrice: x.costPrice, image: x.mainImageUrl || (x.imageUrls || [])[0] || "", status: x.status, imported: imported.has(d.id) };
      })
      .sort((a, b) => Number(a.imported) - Number(b.imported));
    return res.status(200).json({ products });
  }

  if (req.method === "POST") {
    const { ids = [], activate = true } = req.body || {};
    if (!Array.isArray(ids) || !ids.length) return res.status(400).json({ error: "কোনো প্রোডাক্ট বাছাই করা হয়নি।" });
    const store = await adminDb.collection("store_products").get();
    const imported = new Set(store.docs.map((d) => d.data().sourceProductId).filter(Boolean));
    const topSort = store.docs.reduce((m, d) => Math.max(m, Number(d.data().sortOrder) || 0), 0);
    let count = 0;
    for (const id of ids.slice(0, 100)) {
      if (imported.has(id)) continue;
      const snap = await adminDb.collection("products").doc(String(id)).get();
      if (!snap.exists) continue;
      const x = snap.data();
      const images = [x.mainImageUrl, ...(x.imageUrls || [])].filter(Boolean).filter((u, i, a) => a.indexOf(u) === i).slice(0, 8);
      const now = new Date().toISOString();
      await adminDb.collection("store_products").add({
        name: x.name,
        slug: slugify(x.name),
        category: x.category || "",
        price: Number(x.sellingPrice) || 0,
        comparePrice: 0,
        costPrice: Number(x.costPrice) || 0,
        stock: null,
        status: activate ? "active" : "draft",
        featured: false,
        sortOrder: topSort + ids.length - count,
        images,
        sizes: [],
        colors: [],
        shortDescription: x.shortDescription || "",
        description: x.fullDescription || "",
        sourceProductId: id,
        createdAt: now,
        updatedAt: now,
      });
      count++;
    }
    return res.status(200).json({ ok: true, count });
  }
  return res.status(405).json({ error: "Method not allowed" });
}
export default withErrorHandling(handler);
