import { requireAdmin, adminDb } from "../../../../lib/firebaseAdmin";
import { withErrorHandling } from "../../../../lib/apiWrapper";

async function handler(req, res) {
  try {
    await requireAdmin(req);
  } catch (err) {
    return res.status(err.statusCode || 401).json({ error: err.message });
  }

  const { id } = req.query;
  const ref = adminDb.collection("trainings").doc(id);
  const snap = await ref.get();
  if (!snap.exists) return res.status(404).json({ error: "ট্রেনিং পাওয়া যায়নি।" });

  if (req.method === "GET") {
    const completedSnap = await adminDb
      .collection("trainingProgress")
      .where("trainingId", "==", id)
      .where("status", "==", "completed")
      .count()
      .get();
    return res.status(200).json({ training: { id: snap.id, ...snap.data() }, completedCount: completedSnap.data().count });
  }

  if (req.method === "PATCH") {
    const body = req.body || {};
    const update = { updatedAt: new Date().toISOString() };
    for (const field of ["title", "content", "videoUrl", "pdfUrl"]) {
      if (body[field] !== undefined) update[field] = String(body[field]);
    }
    if (body.order !== undefined) update.order = Number(body.order);
    await ref.update(update);
    return res.status(200).json({ ok: true });
  }

  return res.status(405).json({ error: "Method not allowed" });
}

export default withErrorHandling(handler);
