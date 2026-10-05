import { adminDb } from "../../../../lib/firebaseAdmin";
import { withErrorHandling } from "../../../../lib/apiWrapper";
import { guardAdmin } from "../../../../lib/store/adminApi";
import { getSettings } from "../../../../lib/store/server";
import { DEFAULT_SETTINGS } from "../../../../lib/store/shared";

const NUMERIC = ["deliveryInsideDhaka", "deliveryOutsideDhaka", "freeDeliveryAbove"];

async function handler(req, res) {
  if (!(await guardAdmin(req, res))) return;
  if (req.method === "GET") return res.status(200).json({ settings: await getSettings() });
  if (req.method === "PUT") {
    const body = req.body || {};
    const clean = {};
    for (const key of Object.keys(DEFAULT_SETTINGS)) {
      if (body[key] === undefined) continue;
      clean[key] = NUMERIC.includes(key) ? Math.max(0, Number(body[key]) || 0) : String(body[key]).trim().slice(0, 500);
    }
    if (clean.whatsapp) clean.whatsapp = clean.whatsapp.replace(/\D/g, "");
    await adminDb.collection("store_settings").doc("main").set(clean, { merge: true });
    return res.status(200).json({ ok: true });
  }
  return res.status(405).json({ error: "Method not allowed" });
}

export default withErrorHandling(handler);
