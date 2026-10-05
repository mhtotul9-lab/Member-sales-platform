import { requireAdmin, adminDb } from "../../../lib/firebaseAdmin";
import { withErrorHandling } from "../../../lib/apiWrapper";
import { getStoreSettings } from "../../../lib/storefront";
import { normalizeBdPhone, isValidBdPhone } from "../../../lib/phone";

const TEXT = ["storeName", "tagline", "hotline", "whatsapp", "facebookUrl", "address", "announcement", "heroTitle", "heroSubtitle", "heroImageUrl"];

async function handler(req, res) {
  let decoded;
  try { decoded = await requireAdmin(req); } catch (err) { return res.status(err.statusCode || 401).json({ error: err.message }); }

  if (req.method === "GET") return res.status(200).json({ settings: await getStoreSettings() });

  if (req.method === "PUT") {
    const b = req.body || {};
    const next = {};
    for (const k of TEXT) if (b[k] !== undefined) next[k] = String(b[k]).trim().slice(0, 400);
    for (const k of ["deliveryCharge", "freeDeliveryAbove"]) {
      if (b[k] !== undefined) {
        const n = Number(b[k]);
        if (isNaN(n) || n < 0) return res.status(400).json({ error: "ডেলিভারি চার্জ সঠিক সংখ্যা হতে হবে।" });
        next[k] = n;
      }
    }
    if (b.orderingEnabled !== undefined) next.orderingEnabled = !!b.orderingEnabled;
    if (b.blockedPhonesText !== undefined) {
      const phones = String(b.blockedPhonesText).split(/[\n,]+/).map(normalizeBdPhone).filter(Boolean);
      const bad = phones.find((p) => !isValidBdPhone(p));
      if (bad) return res.status(400).json({ error: `ব্লক লিস্টে ভুল নম্বর: ${bad}` });
      next.blockedPhones = [...new Set(phones)];
    }
    next.updatedAt = new Date().toISOString();
    await adminDb.collection("settings").doc("store").set(next, { merge: true });
    await adminDb.collection("auditLogs").add({
      actor: decoded.uid, actorEmail: decoded.email || null, action: "store.settings.update", entity: "settings", entityId: "store",
      after: next, timestamp: next.updatedAt,
    });
    return res.status(200).json({ ok: true });
  }
  return res.status(405).json({ error: "Method not allowed" });
}

export default withErrorHandling(handler);
