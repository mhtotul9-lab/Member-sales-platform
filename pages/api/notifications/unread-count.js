import { requireAuth, adminDb } from "../../../lib/firebaseAdmin";
import { withErrorHandling } from "../../../lib/apiWrapper";

// The notification bell polls this on EVERY page, for every logged-in
// session — so it must be as cheap as possible. A count() aggregate query
// is billed far cheaper than fetching real documents (roughly 1 read per
// ~1000 matched docs, vs. 1 read PER document). The full /api/notifications
// endpoint (up to 50 real documents) is only for the actual notifications
// page, not for polling.
async function handler(req, res) {
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
    .where("read", "==", false)
    .count()
    .get();

  return res.status(200).json({ unreadCount: snap.data().count });
}

export default withErrorHandling(handler);
