import { requireActiveMember, adminDb } from "../../../../../lib/firebaseAdmin";
import { withErrorHandling } from "../../../../../lib/apiWrapper";

async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });

  let auth;
  try {
    auth = await requireActiveMember(req);
  } catch (err) {
    return res.status(err.statusCode || 401).json({ error: err.message });
  }

  const { id } = req.query;
  const trainingSnap = await adminDb.collection("trainings").doc(id).get();
  if (!trainingSnap.exists) return res.status(404).json({ error: "ট্রেনিং পাওয়া যায়নি।" });

  const progressId = `${auth.decoded.uid}_${id}`;
  await adminDb.collection("trainingProgress").doc(progressId).set({
    memberId: auth.decoded.uid,
    trainingId: id,
    status: "completed",
    completedAt: new Date().toISOString(),
  }, { merge: true });

  return res.status(200).json({ ok: true });
}

export default withErrorHandling(handler);
