import { requireActiveMember } from "../../../../lib/firebaseAdmin";
import { getSettings } from "../../../../lib/business";
import { withErrorHandling } from "../../../../lib/apiWrapper";

async function handler(req, res) {
  if (req.method !== "GET") return res.status(405).json({ error: "Method not allowed" });

  try {
    await requireActiveMember(req);
  } catch (err) {
    return res.status(err.statusCode || 401).json({ error: err.message });
  }

  const settings = await getSettings();
  return res.status(200).json({
    activeDays: settings.activeDays,
    minApprovedSalesForActive: settings.minApprovedSalesForActive,
    minWithdrawalAmount: settings.minWithdrawalAmount,
    paymentMethods: settings.paymentMethods,
  });
}

export default withErrorHandling(handler);
