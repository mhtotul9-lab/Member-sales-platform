import { requireAuth, adminDb } from "../../../lib/firebaseAdmin";
import { withErrorHandling } from "../../../lib/apiWrapper";

async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });

  let decoded;
  try {
    decoded = await requireAuth(req);
  } catch (err) {
    return res.status(err.statusCode || 401).json({ error: err.message });
  }

  const { id, all } = req.body || {};

  if (all) {
    const snap = await adminDb
      .collection("notifications")
      .where("userId", "==", decoded.uid)
      .where("read", "==", false)
      .get();
    const batch = adminDb.batch();
    snap.docs.forEach((d) => batch.update(d.ref, { read: true }));
    await batch.commit();
    return res.status(200).json({ ok: true, updated: snap.size });
  }

  if (!id) return res.status(400).json({ error: "id বা all প্রয়োজন।" });

  const ref = adminDb.collection("notifications").doc(id);
  const snap = await ref.get();
  if (!snap.exists || snap.data().userId !== decoded.uid) {
    return res.status(404).json({ error: "নোটিফিকেশন পাওয়া যায়নি।" });
  }
  await ref.update({ read: true });
  return res.status(200).json({ ok: true });
}

export default withErrorHandling(handler);
