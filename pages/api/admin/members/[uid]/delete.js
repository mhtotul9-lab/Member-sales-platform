import { requireAdmin, adminAuth, adminDb } from "../../../../../lib/firebaseAdmin";
import { withErrorHandling } from "../../../../../lib/apiWrapper";

async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });

  let decoded;
  try {
    decoded = await requireAdmin(req);
  } catch (err) {
    return res.status(err.statusCode || 401).json({ error: err.message });
  }

  const { uid } = req.query;
  const memberRef = adminDb.collection("members").doc(uid);
  const snap = await memberRef.get();
  if (!snap.exists) return res.status(404).json({ error: "মেম্বার পাওয়া যায়নি।" });

  const member = snap.data();
  if (member.role === "admin") return res.status(400).json({ error: "অ্যাডমিন অ্যাকাউন্ট ডিলিট করা যাবে না।" });

  // Remove the login account so they truly can't sign in again, and remove
  // their profile. Historical orders/transactions are left untouched —
  // they already carry a snapshot of the member's name, so past accounting
  // and reports stay intact even though the live profile is gone.
  await adminAuth.deleteUser(uid).catch((err) => {
    // If the Auth user is already gone for some reason, don't block
    // deleting the leftover Firestore profile.
    if (err.code !== "auth/user-not-found") throw err;
  });
  await memberRef.delete();

  await adminDb.collection("auditLogs").add({
    actor: decoded.uid,
    actorEmail: decoded.email || null,
    action: "member.delete",
    entity: "members",
    entityId: uid,
    before: { fullName: member.fullName, memberId: member.memberId, email: member.email },
    timestamp: new Date().toISOString(),
  });

  return res.status(200).json({ ok: true });
}

export default withErrorHandling(handler);
