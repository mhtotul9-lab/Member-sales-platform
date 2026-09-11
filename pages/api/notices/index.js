import { requireAuth, adminDb } from "../../../lib/firebaseAdmin";
import { withErrorHandling } from "../../../lib/apiWrapper";

async function handler(req, res) {
  if (req.method !== "GET") return res.status(405).json({ error: "Method not allowed" });

  try {
    await requireAuth(req);
  } catch (err) {
    return res.status(err.statusCode || 401).json({ error: err.message });
  }

  const snap = await adminDb.collection("notices").orderBy("createdAt", "desc").limit(50).get();
  const notices = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
  return res.status(200).json({ notices });
}

export default withErrorHandling(handler);
