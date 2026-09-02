import { adminDb } from "../../../lib/firebaseAdmin";
import { withErrorHandling } from "../../../lib/apiWrapper";

async function handler(req, res) {
  if (req.method !== "GET") return res.status(405).json({ error: "Method not allowed" });

  const code = String(req.query.code || "").trim();
  if (!code) return res.status(200).json({ valid: false });

  const snap = await adminDb.collection("members").where("memberId", "==", code).limit(1).get();
  if (snap.empty) return res.status(200).json({ valid: false });

  const member = snap.docs[0].data();
  if (member.status !== "active") return res.status(200).json({ valid: false });

  // Only the first given name — never the full name, phone, email, or
  // anything else. Enough to confirm "yes, this is a real member" without
  // exposing their identity to an anonymous visitor typing in a form.
  const firstName = String(member.fullName || "").trim().split(/\s+/)[0] || "";

  return res.status(200).json({ valid: true, firstName });
}

export default withErrorHandling(handler);
