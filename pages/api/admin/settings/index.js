import { requireAdmin, adminDb } from "../../../../lib/firebaseAdmin";
import { getSettings } from "../../../../lib/business";
import { withErrorHandling } from "../../../../lib/apiWrapper";

const ALL_METHODS = ["bkash", "nagad", "rocket", "bank"];

async function handler(req, res) {
  let decoded;
  try {
    decoded = await requireAdmin(req);
  } catch (err) {
    return res.status(err.statusCode || 401).json({ error: err.message });
  }

  if (req.method === "GET") {
    const settings = await getSettings();
    return res.status(200).json({ settings, availablePaymentMethods: ALL_METHODS });
  }

  if (req.method === "PUT") {
    const body = req.body || {};
    const activeDays = Number(body.activeDays);
    const minApprovedSalesForActive = Number(body.minApprovedSalesForActive);
    const minWithdrawalAmount = Number(body.minWithdrawalAmount);
    const poolProfitSharePercent = Number(body.poolProfitSharePercent);
    const paymentMethods = Array.isArray(body.paymentMethods) ? body.paymentMethods.filter((m) => ALL_METHODS.includes(m)) : null;

    if (!Number.isInteger(activeDays) || activeDays < 1) return res.status(400).json({ error: "Active Days কমপক্ষে ১ হতে হবে।" });
    if (!Number.isInteger(minApprovedSalesForActive) || minApprovedSalesForActive < 1) return res.status(400).json({ error: "Minimum approved sales কমপক্ষে ১ হতে হবে।" });
    if (isNaN(minWithdrawalAmount) || minWithdrawalAmount < 0) return res.status(400).json({ error: "সঠিক Minimum Withdrawal Amount দিন।" });
    if (isNaN(poolProfitSharePercent) || poolProfitSharePercent < 0 || poolProfitSharePercent > 100) return res.status(400).json({ error: "প্রফিট পুল শেয়ার ০ থেকে ১০০ এর মধ্যে হতে হবে।" });
    if (!paymentMethods || paymentMethods.length === 0) return res.status(400).json({ error: "অন্তত একটা পেমেন্ট মেথড সিলেক্ট করতে হবে।" });

    const update = { activeDays, minApprovedSalesForActive, minWithdrawalAmount, poolProfitSharePercent, paymentMethods, updatedAt: new Date().toISOString() };
    await adminDb.collection("settings").doc("business").set(update, { merge: true });

    await adminDb.collection("auditLogs").add({
      actor: decoded.uid, actorEmail: decoded.email || null,
      action: "settings.update", entity: "settings", entityId: "business",
      after: update, timestamp: new Date().toISOString(),
    });

    return res.status(200).json({ ok: true });
  }

  return res.status(405).json({ error: "Method not allowed" });
}

export default withErrorHandling(handler);
