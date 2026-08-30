import { requireAdmin, adminDb } from "../../../../lib/firebaseAdmin";

const STATUSES = ["active", "inactive", "out_of_stock", "archived"];

function validate(body) {
  if (!body.name || !String(body.name).trim()) return "প্রোডাক্টের নাম দিতে হবে।";
  if (body.sellingPrice === undefined || isNaN(Number(body.sellingPrice))) return "সঠিক Selling Price দিন।";
  if (body.costPrice === undefined || isNaN(Number(body.costPrice))) return "সঠিক Cost Price দিন।";
  if (body.status && !STATUSES.includes(body.status)) return "অবৈধ status।";
  return null;
}

export default async function handler(req, res) {
  try {
    await requireAdmin(req);
  } catch (err) {
    return res.status(err.statusCode || 401).json({ error: err.message });
  }

  if (req.method === "GET") {
    const snap = await adminDb.collection("products").orderBy("createdAt", "desc").get();
    const products = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
    return res.status(200).json({ products });
  }

  if (req.method === "POST") {
    const body = req.body || {};
    const validationError = validate(body);
    if (validationError) return res.status(400).json({ error: validationError });

    const sellingPrice = Number(body.sellingPrice);
    const costPrice = Number(body.costPrice);

    const doc = {
      name: String(body.name).trim(),
      sku: body.sku ? String(body.sku).trim() : "",
      category: body.category ? String(body.category).trim() : "",
      shortDescription: body.shortDescription || "",
      fullDescription: body.fullDescription || "",
      sellingPrice,
      costPrice,
      profit: Number((sellingPrice - costPrice).toFixed(2)),
      status: STATUSES.includes(body.status) ? body.status : "active",
      mainImageUrl: body.mainImageUrl || "",
      imageUrls: Array.isArray(body.imageUrls) ? body.imageUrls.filter(Boolean) : [],
      videoUrl: body.videoUrl || "",
      shortCaption: body.shortCaption || "",
      longCaption: body.longCaption || "",
      whatsappMessage: body.whatsappMessage || "",
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    const ref = await adminDb.collection("products").add(doc);
    return res.status(201).json({ id: ref.id });
  }

  return res.status(405).json({ error: "Method not allowed" });
}
