import { requireActiveMember, adminDb } from "../../../../lib/firebaseAdmin";

export default async function handler(req, res) {
  if (req.method !== "GET") return res.status(405).json({ error: "Method not allowed" });

  try {
    await requireActiveMember(req);
  } catch (err) {
    return res.status(err.statusCode || 401).json({ error: err.message });
  }

  const snap = await adminDb
    .collection("products")
    .where("status", "==", "active")
    .orderBy("createdAt", "desc")
    .get();

  // Members never need cost price / raw profit margin — only what helps them sell.
  const products = snap.docs.map((d) => {
    const { costPrice, profit, ...rest } = d.data();
    return { id: d.id, ...rest };
  });

  return res.status(200).json({ products });
}
