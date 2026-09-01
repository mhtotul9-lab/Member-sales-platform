import { requireAdmin, adminDb } from "../../../../lib/firebaseAdmin";
import { withErrorHandling } from "../../../../lib/apiWrapper";
import { getSettings, isMemberActive } from "../../../../lib/business";

async function handler(req, res) {
  if (req.method !== "GET") return res.status(405).json({ error: "Method not allowed" });

  try {
    await requireAdmin(req);
  } catch (err) {
    return res.status(err.statusCode || 401).json({ error: err.message });
  }

  const status = req.query.status; // e.g. "pending" — omit to get everyone
  let query = adminDb.collection("members").orderBy("createdAt", "desc");
  if (status) query = query.where("status", "==", status);

  const snap = await query.get();
  const rawMembers = snap.docs
    .map((d) => ({ uid: d.id, ...d.data() }))
    .filter((m) => m.role !== "admin");

  // Live, not-cached sales-activity status for every member shown — this is
  // the admin's main view of the member base, so it's worth recomputing
  // fresh each time rather than trusting whatever activityStatus each
  // member's own wallet page last happened to cache.
  const settings = await getSettings();
  const members = await Promise.all(
    rawMembers.map(async (m) => ({
      ...m,
      liveActivityStatus: (await isMemberActive(m.uid, settings)) ? "active" : "inactive",
    }))
  );

  return res.status(200).json({ members });
}

export default withErrorHandling(handler);
