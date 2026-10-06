import { adminDb } from "../../../../lib/firebaseAdmin";
import { withErrorHandling } from "../../../../lib/apiWrapper";
import { guardAdmin } from "../../../../lib/store/adminApi";
import { normalizePhone } from "../../../../lib/store/shared";

async function handler(req, res) {
  const admin = await guardAdmin(req, res);
  if (!admin) return;
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });
  const phone = normalizePhone((req.body || {}).phone);
  if (!phone) return res.status(400).json({ error: "সঠিক মোবাইল নাম্বার নয়।" });
  const ref = adminDb.collection("store_blocked").doc(phone);
  if ((req.body || {}).block === false) { await ref.delete(); return res.status(200).json({ ok: true, blocked: false }); }
  await ref.set({ phone, by: admin.email || admin.uid, at: new Date().toISOString() });
  return res.status(200).json({ ok: true, blocked: true });
}
export default withErrorHandling(handler);
