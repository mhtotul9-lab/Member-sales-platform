import { requireAdmin, adminDb } from "../../../../lib/firebaseAdmin";
import { withErrorHandling } from "../../../../lib/apiWrapper";

async function handler(req, res) {
  if (req.method !== "GET") return res.status(405).json({ error: "Method not allowed" });

  try {
    await requireAdmin(req);
  } catch (err) {
    return res.status(err.statusCode || 401).json({ error: err.message });
  }

  const entity = req.query.entity;
  let query = adminDb.collection("auditLogs").orderBy("timestamp", "desc");
  if (entity) query = query.where("entity", "==", entity);

  const snap = await query.limit(150).get();
  return res.status(200).json({ logs: snap.docs.map((d) => ({ id: d.id, ...d.data() })) });
}

export default withErrorHandling(handler);
