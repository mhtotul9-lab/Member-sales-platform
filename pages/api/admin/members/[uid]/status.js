import { requireAdmin, adminDb } from "../../../../../lib/firebaseAdmin";
import { notifyUser } from "../../../../../lib/notify";
import { withErrorHandling } from "../../../../../lib/apiWrapper";

const ALLOWED = ["active", "rejected", "suspended", "banned", "removed", "pending"];
const STATUS_MESSAGE = {
  active: "আপনার অ্যাকাউন্ট অ্যাপ্রুভ হয়েছে — এখন লগইন করুন।",
  rejected: "আপনার রেজিস্ট্রেশন গ্রহণ করা হয়নি।",
  suspended: "আপনার অ্যাকাউন্ট সাময়িকভাবে হোল্ড করা হয়েছে।",
  banned: "আপনার অ্যাকাউন্ট ব্যান করা হয়েছে।",
  removed: "আপনাকে মেম্বার লিস্ট থেকে রিমুভ করা হয়েছে।",
  pending: "আপনার অ্যাকাউন্ট আবার রিভিউতে রাখা হয়েছে।",
};

async function handler(req, res) {
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

  await notifyUser(uid, {
    type: "account_status",
    message: STATUS_MESSAGE[status] || `আপনার অ্যাকাউন্ট স্ট্যাটাস পরিবর্তন হয়েছে: ${status}`,
    link: status === "active" ? "/" : "/pending",
  });

  return res.status(200).json({ ok: true });
}

export default withErrorHandling(handler);
