import { requireAdmin, adminAuth, adminDb } from "../../../../../lib/firebaseAdmin";
import { withErrorHandling } from "../../../../../lib/apiWrapper";

// Permanently deletes a member: their Firebase Auth account plus the
// members/{uid} Firestore doc. This is irreversible — the doc is archived
// to deletedMembers/{uid} first (with who deleted it and why) so past
// orders/transactions/audit-logs referencing this memberId still have
// something to look up, and so an admin can see who/why after the fact.
async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });

  let decoded;
  try {
    decoded = await requireAdmin(req);
  } catch (err) {
    return res.status(err.statusCode || 401).json({ error: err.message });
  }

  const { uid } = req.query;
  const { reason } = req.body || {};

  if (uid === decoded.uid) {
    return res.status(400).json({ error: "নিজের অ্যাকাউন্ট ডিলিট করা যাবে না।" });
  }

  const memberRef = adminDb.collection("members").doc(uid);
  const snap = await memberRef.get();
  if (!snap.exists) return res.status(404).json({ error: "মেম্বার পাওয়া যায়নি।" });

  const data = snap.data();
  if (data.role === "admin") {
    return res.status(400).json({ error: "অ্যাডমিন অ্যাকাউন্ট এখান থেকে ডিলিট করা যাবে না।" });
  }

  await adminDb.collection("deletedMembers").doc(uid).set({
    ...data,
    deletedAt: new Date().toISOString(),
    deletedBy: decoded.uid,
    deletedByEmail: decoded.email || null,
    deleteReason: reason || null,
  });

  await adminDb.collection("auditLogs").add({
    actor: decoded.uid,
    actorEmail: decoded.email || null,
    action: "member.delete",
    entity: "members",
    entityId: uid,
    before: { status: data.status, fullName: data.fullName, memberId: data.memberId },
    after: null,
    reason: reason || null,
    timestamp: new Date().toISOString(),
  });

  try {
    await adminAuth.deleteUser(uid);
  } catch (err) {
    // If the auth user is already gone, keep going and still remove the
    // Firestore doc so the member fully disappears from the app.
    if (err.code !== "auth/user-not-found") throw err;
  }

  await memberRef.delete();

  return res.status(200).json({ ok: true });
}

export default withErrorHandling(handler);
