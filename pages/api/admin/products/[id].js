import { requireAdmin, adminDb } from "../../../../lib/firebaseAdmin";

const STATUSES = ["active", "inactive", "out_of_stock", "archived"];

export default async function handler(req, res) {
  let decoded;
  try {
    decoded = await requireAdmin(req);
  } catch (err) {
    return res.status(err.statusCode || 401).json({ error: err.message });
  }

  const { id } = req.query;
  const ref = adminDb.collection("products").doc(id);
  const snap = await ref.get();
  if (!snap.exists) return res.status(404).json({ error: "প্রোডাক্ট পাওয়া যায়নি।" });

  if (req.method === "GET") {
    return res.status(200).json({ product: { id: snap.id, ...snap.data() } });
  }

  if (req.method === "PATCH") {
    const body = req.body || {};
    const update = { updatedAt: new Date().toISOString() };

    const stringFields = [
      "name", "sku", "category", "shortDescription", "fullDescription",
      "mainImageUrl", "videoUrl", "shortCaption", "longCaption", "whatsappMessage",
    ];
    for (const field of stringFields) {
      if (body[field] !== undefined) update[field] = String(body[field]);
    }
    if (Array.isArray(body.imageUrls)) update.imageUrls = body.imageUrls.filter(Boolean);

    if (body.status !== undefined) {
      if (!STATUSES.includes(body.status)) return res.status(400).json({ error: "অবৈধ status।" });
      update.status = body.status;
    }

    const current = snap.data();
    const sellingPrice = body.sellingPrice !== undefined ? Number(body.sellingPrice) : current.sellingPrice;
    const costPrice = body.costPrice !== undefined ? Number(body.costPrice) : current.costPrice;
    if (body.sellingPrice !== undefined || body.costPrice !== undefined) {
      if (isNaN(sellingPrice) || isNaN(costPrice)) return res.status(400).json({ error: "সঠিক মূল্য দিন।" });
      update.sellingPrice = sellingPrice;
      update.costPrice = costPrice;
      update.profit = Number((sellingPrice - costPrice).toFixed(2));
    }

    await ref.update(update);

    await adminDb.collection("auditLogs").add({
      actor: decoded.uid,
      actorEmail: decoded.email || null,
      action: "product.update",
      entity: "products",
      entityId: id,
      before: current,
      after: { ...current, ...update },
      timestamp: new Date().toISOString(),
    });

    return res.status(200).json({ ok: true });
  }

  return res.status(405).json({ error: "Method not allowed" });
}
