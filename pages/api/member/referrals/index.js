import { requireActiveMember, adminDb } from "../../../../lib/firebaseAdmin";
import { withErrorHandling } from "../../../../lib/apiWrapper";

async function handler(req, res) {
  if (req.method !== "GET") return res.status(405).json({ error: "Method not allowed" });

  let auth;
  try {
    auth = await requireActiveMember(req);
  } catch (err) {
    return res.status(err.statusCode || 401).json({ error: err.message });
  }
  const { decoded, profile } = auth;

  const referredSnap = await adminDb
    .collection("members")
    .where("referredByMemberId", "==", decoded.uid)
    .get();

  const referredRaw = referredSnap.docs.map((d) => ({ uid: d.id, ...d.data() }));

  // The bonus amount can change over time (it's now an admin-configurable
  // setting), so each referred member's actual paid amount is snapshotted
  // onto their own member doc (referralCommissionAmountPaid) at the moment
  // their bonus fires — no need to query transactions per referred member.
  const referred = referredRaw
    .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
    .map((m) => ({
      uid: m.uid,
      fullName: m.fullName,
      memberId: m.memberId,
      createdAt: m.createdAt,
      qualifyingSalesCount: m.qualifyingSalesCount || 0,
      firstSaleCompleted: !!m.referralCommissionPaid,
      firstSaleAt: m.firstSaleAt || null,
      bonusAmount: m.referralCommissionPaid ? (m.referralCommissionAmountPaid || 0) : 0,
    }));

  return res.status(200).json({
    memberCode: profile.memberId,
    referralCount: profile.referralCount || 0,
    referralFirstSalesCount: profile.referralFirstSalesCount || 0,
    referralEarnings: profile.referralEarnings || 0,
    referred,
  });
}

export default withErrorHandling(handler);
