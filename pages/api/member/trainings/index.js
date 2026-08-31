import { requireActiveMember, adminDb } from "../../../../lib/firebaseAdmin";

export default async function handler(req, res) {
  if (req.method !== "GET") return res.status(405).json({ error: "Method not allowed" });

  let auth;
  try {
    auth = await requireActiveMember(req);
  } catch (err) {
    return res.status(err.statusCode || 401).json({ error: err.message });
  }

  const trainingsSnap = await adminDb.collection("trainings").orderBy("order", "asc").get();
  const trainings = trainingsSnap.docs.map((d) => ({ id: d.id, ...d.data() }));
  if (trainings.length === 0) return res.status(200).json({ trainings: [] });

  const progressSnap = await adminDb
    .collection("trainingProgress")
    .where("memberId", "==", auth.decoded.uid)
    .get();
  const progressByTraining = {};
  progressSnap.docs.forEach((d) => { progressByTraining[d.data().trainingId] = d.data().status; });

  const withProgress = trainings.map((t) => ({ ...t, progressStatus: progressByTraining[t.id] || "not_started" }));
  return res.status(200).json({ trainings: withProgress });
}
