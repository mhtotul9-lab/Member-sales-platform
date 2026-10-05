import { adminDb } from "../../../../../lib/firebaseAdmin";
import { withErrorHandling } from "../../../../../lib/apiWrapper";
import { guardAdmin } from "../../../../../lib/store/adminApi";
import { buildProductDoc } from "../../../../../lib/store/productDoc";

async function handler(req, res) {
  if (!(await guardAdmin(req, res))) return;
  const ref = adminDb.collection("store_products").doc(String(req.query.id));
  const snap = await ref.get();
  if (!snap.exists) return res.status(404).json({ error: "প্রোডাক্ট পাওয়া যায়নি।" });

  if (req.method === "GET") return res.status(200).json({ product: { id: snap.id, ...snap.data() } });
  if (req.method === "PUT") {
    const { doc, error } = buildProductDoc(req.body || {}, snap.data());
    if (error) return res.status(400).json({ error });
    if (doc.slug !== snap.data().slug) {
      const dup = await adminDb.collection("store_products").where("slug", "==", doc.slug).limit(1).get();
      if (!dup.empty) return res.status(400).json({ error: "এই slug আগে থেকেই আছে, অন্য একটা দিন।" });
    }
    await ref.update(doc);
    return res.status(200).json({ ok: true });
  }
  if (req.method === "DELETE") {
    // পুরনো অর্ডারে প্রোডাক্টের নাম/দাম কপি করা থাকে, তাই ডিলিট করলে অর্ডার নষ্ট হয় না।
    await ref.delete();
    return res.status(200).json({ ok: true });
  }
  return res.status(405).json({ error: "Method not allowed" });
}

export default withErrorHandling(handler);
