import { requireActiveMember, adminDb } from "../../../../lib/firebaseAdmin";
import { withErrorHandling } from "../../../../lib/apiWrapper";

async function handler(req, res) {
  if (req.method !== "GET") return res.status(405).json({ error: "Method not allowed" });

  try {
    await requireActiveMember(req);
  } catch (err) {
    return res.status(err.statusCode || 401).json({ error: err.message });
  }

  const { id } = req.query;
  const snap = await adminDb.collection("products").doc(id).get();
  if (!snap.exists || snap.data().status !== "active") {
    return res.status(404).json({ error: "প্রোডাক্ট পাওয়া যায়নি।" });
  }

  const { costPrice, profit, ...rest } = snap.data();
  return res.status(200).json({ product: { id: snap.id, ...rest } });
}

export default withErrorHandling(handler);
