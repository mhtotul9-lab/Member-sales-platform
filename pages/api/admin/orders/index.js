import { requireAdmin, adminDb } from "../../../../lib/firebaseAdmin";

export default async function handler(req, res) {
  if (req.method !== "GET") return res.status(405).json({ error: "Method not allowed" });

  try {
    await requireAdmin(req);
  } catch (err) {
    return res.status(err.statusCode || 401).json({ error: err.message });
  }

  const status = req.query.status;
  let query = adminDb.collection("orders").orderBy("createdAt", "desc");
  if (status) query = query.where("status", "==", status);

  const snap = await query.limit(200).get();
  const orders = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
  return res.status(200).json({ orders });
}
