import { requireAdmin, adminDb } from "../../../../lib/firebaseAdmin";
import { withErrorHandling } from "../../../../lib/apiWrapper";

async function handler(req, res) {
  if (req.method !== "GET") return res.status(405).json({ error: "Method not allowed" });

  try {
    await requireAdmin(req);
  } catch (err) {
    return res.status(err.statusCode || 401).json({ error: err.message });
  }

  const [firstSalesCountSnap, paidTxnSnap, reversedTxnSnap, referredMembersSnap] = await Promise.all([
    adminDb.collection("members").where("firstSaleCompleted", "==", true).count().get(),
    adminDb.collection("transactions").where("type", "==", "referral_bonus").orderBy("createdAt", "desc").limit(100).get(),
    adminDb.collection("transactions").where("type", "==", "referral_bonus_reversal").orderBy("createdAt", "desc").limit(100).get(),
    adminDb.collection("members").where("referralCount", ">", 0).get(),
  ]);

  const bonusTxns = paidTxnSnap.docs.map((d) => ({ id: d.id, ...d.data() }));
  const reversalTxns = reversedTxnSnap.docs.map((d) => ({ id: d.id, ...d.data() }));

  const totalPaid = bonusTxns.reduce((sum, t) => sum + t.amount, 0);
  const totalReversed = reversalTxns.reduce((sum, t) => sum + Math.abs(t.amount), 0);

  const allTxns = [...bonusTxns, ...reversalTxns].sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

  const totalReferredMembers = referredMembersSnap.docs.reduce((sum, d) => sum + (d.data().referralCount || 0), 0);

  return res.status(200).json({
    totalReferredMembers,
    totalFirstSalesCompleted: firstSalesCountSnap.data().count,
    totalBonusesPaid: totalPaid,
    totalBonusesReversed: totalReversed,
    netBonusesPaid: totalPaid - totalReversed,
    transactions: allTxns.slice(0, 100),
  });
}

export default withErrorHandling(handler);
