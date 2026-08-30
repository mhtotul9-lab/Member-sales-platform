import { requireAdmin, adminDb } from "../../../../../lib/firebaseAdmin";

const ALLOWED = ["active", "rejected", "suspended", "pending"];

export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });

  let decoded;
  try {
    decoded = await requireAdmin(req);
  } catch (err) {
    return res.status(err.statusCode || 401).json({ error: err.message });
  }

  const { uid } = req.query;
  const { status, reason } = req.body || {};

  if (!ALLOWED.includes(status)) {
    return res.status(400).json({ error: "অবৈধ স্ট্যাটাস।" });
  }

  const memberRef = adminDb.collection("members").doc(uid);
  const snap = await memberRef.get();
  if (!snap.exists) return res.status(404).json({ error: "মেম্বার পাওয়া যায়নি।" });

  const before = snap.data().status;
  await memberRef.update({ status, statusUpdatedAt: new Date().toISOString() });

  await adminDb.collection("auditLogs").add({
    actor: decoded.uid,
    actorEmail: decoded.email || null,
    action: "member.status.update",
    entity: "members",
    entityId: uid,
    before: { status: before },
    after: { status },
    reason: reason || null,
    timestamp: new Date().toISOString(),
  });

  return res.status(200).json({ ok: true });
}
