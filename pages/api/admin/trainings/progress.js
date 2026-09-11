import { requireAdmin, adminDb } from "../../../../lib/firebaseAdmin";
import { withErrorHandling } from "../../../../lib/apiWrapper";

async function handler(req, res) {
  if (req.method !== "GET") return res.status(405).json({ error: "Method not allowed" });

  try {
    await requireAdmin(req);
  } catch (err) {
    return res.status(err.statusCode || 401).json({ error: err.message });
  }

  const [trainingsSnap, progressSnap, membersSnap] = await Promise.all([
    adminDb.collection("trainings").orderBy("order", "asc").get(),
    adminDb.collection("trainingProgress").where("status", "==", "completed").get(),
    adminDb.collection("members").orderBy("createdAt", "desc").get(),
  ]);

  const trainings = trainingsSnap.docs.map((d) => ({ id: d.id, ...d.data() }));
  const totalTrainings = trainings.length;

  // memberId -> Set of completed trainingIds
  const completedByMember = new Map();
  for (const doc of progressSnap.docs) {
    const p = doc.data();
    if (!completedByMember.has(p.memberId)) completedByMember.set(p.memberId, new Map());
    completedByMember.get(p.memberId).set(p.trainingId, p.completedAt);
  }

  const members = membersSnap.docs
    .map((d) => ({ uid: d.id, ...d.data() }))
    .filter((m) => m.role !== "admin")
    .map((m) => {
      const completedMap = completedByMember.get(m.uid) || new Map();
      const completedTrainings = trainings
        .filter((t) => completedMap.has(t.id))
        .map((t) => ({ id: t.id, title: t.title, completedAt: completedMap.get(t.id) }));
      return {
        uid: m.uid,
        fullName: m.fullName,
        memberId: m.memberId,
        phone: m.phone,
        status: m.status,
        completedCount: completedTrainings.length,
        completedTrainings,
      };
    });

  return res.status(200).json({ totalTrainings, members });
}

export default withErrorHandling(handler);
