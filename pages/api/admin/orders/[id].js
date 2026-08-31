import { requireAdmin, adminDb } from "../../../../lib/firebaseAdmin";
import { withErrorHandling } from "../../../../lib/apiWrapper";

async function handler(req, res) {
  if (req.method !== "GET") return res.status(405).json({ error: "Method not allowed" });

  try {
    await requireAdmin(req);
  } catch (err) {
    return res.status(err.statusCode || 401).json({ error: err.message });
  }

  const { id } = req.query;
  const snap = await adminDb.collection("orders").doc(id).get();
  if (!snap.exists) return res.status(404).json({ error: "অর্ডার পাওয়া যায়নি।" });

  return res.status(200).json({ order: { id: snap.id, ...snap.data() } });
}

export default withErrorHandling(handler);
