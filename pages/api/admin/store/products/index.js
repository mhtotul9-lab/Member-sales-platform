import { adminDb } from "../../../../../lib/firebaseAdmin";
import { withErrorHandling } from "../../../../../lib/apiWrapper";
import { guardAdmin } from "../../../../../lib/store/adminApi";
import { buildProductDoc } from "../../../../../lib/store/productDoc";

async function handler(req, res) {
  if (!(await guardAdmin(req, res))) return;
  if (req.method === "GET") {
    const snap = await adminDb.collection("store_products").get();
    const products = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
    products.sort((a, b) => String(b.createdAt || "").localeCompare(String(a.createdAt || "")));
    return res.status(200).json({ products });
  }
  if (req.method === "POST") {
    const { doc, error } = buildProductDoc(req.body || {});
    if (error) return res.status(400).json({ error });
    const dup = await adminDb.collection("store_products").where("slug", "==", doc.slug).limit(1).get();
    if (!dup.empty) return res.status(400).json({ error: "এই slug আগে থেকেই আছে, অন্য একটা দিন।" });
    if (!doc.sortOrder) {
      // নতুন প্রোডাক্ট ডিফল্টে সবার উপরে
      const all = await adminDb.collection("store_products").get();
      doc.sortOrder = all.docs.reduce((m, d) => Math.max(m, Number(d.data().sortOrder) || 0), 0) + 1;
    }
    const ref = await adminDb.collection("store_products").add({ ...doc, createdAt: new Date().toISOString() });
    return res.status(201).json({ id: ref.id });
  }
  if (req.method === "PATCH") {
    // একসাথে অনেক প্রোডাক্ট: চালু / ড্রাফট / স্টক আউট / মুছে ফেলা
    const { ids = [], action, orderedIds } = req.body || {};
    if (action === "reorder") {
      // orderedIds = উপর থেকে নিচের ক্রমে সব প্রোডাক্টের id; বড় sortOrder আগে দেখায়
      if (!Array.isArray(orderedIds) || !orderedIds.length) return res.status(400).json({ error: "ক্রম পাওয়া যায়নি।" });
      const list = orderedIds.slice(0, 450);
      const b = adminDb.batch();
      list.forEach((id, i) => b.update(adminDb.collection("store_products").doc(String(id)), { sortOrder: list.length - i, updatedAt: new Date().toISOString() }));
      await b.commit();
      return res.status(200).json({ ok: true });
    }
    if (!Array.isArray(ids) || !ids.length) return res.status(400).json({ error: "কোনো প্রোডাক্ট বাছাই করা হয়নি।" });
    const map = { activate: "active", draft: "draft", out_of_stock: "out_of_stock", archive: "archived" };
    if (action !== "delete" && !map[action]) return res.status(400).json({ error: "অবৈধ অ্যাকশন।" });
    const batch = adminDb.batch();
    ids.slice(0, 200).forEach((id) => {
      const r = adminDb.collection("store_products").doc(String(id));
      if (action === "delete") batch.delete(r);
      else batch.update(r, { status: map[action], updatedAt: new Date().toISOString() });
    });
    await batch.commit();
    return res.status(200).json({ ok: true, count: Math.min(ids.length, 200) });
  }
  return res.status(405).json({ error: "Method not allowed" });
}

export default withErrorHandling(handler);
