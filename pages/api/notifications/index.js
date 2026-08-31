import { requireAuth, adminDb } from "../../../lib/firebaseAdmin";

export default async function handler(req, res) {
  if (req.method !== "GET") return res.status(405).json({ error: "Method not allowed" });

  let decoded;
  try {
    decoded = await requireAuth(req);
  } catch (err) {
    return res.status(err.statusCode || 401).json({ error: err.message });
  }

  const snap = await adminDb
    .collection("notifications")
    .where("userId", "==", decoded.uid)
    .orderBy("createdAt", "desc")
    .limit(50)
    .get();

  const notifications = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
  const unreadCount = notifications.filter((n) => !n.read).length;

  return res.status(200).json({ notifications, unreadCount });
}
