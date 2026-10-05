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
    const ref = await adminDb.collection("store_products").add({ ...doc, createdAt: new Date().toISOString() });
    return res.status(201).json({ id: ref.id });
  }
  return res.status(405).json({ error: "Method not allowed" });
}

export default withErrorHandling(handler);
