import { requireActiveMember, adminDb } from "../../../../lib/firebaseAdmin";
import { withErrorHandling } from "../../../../lib/apiWrapper";
import { REFERRAL_BONUS_AMOUNT } from "../../../../lib/business";

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

  // The bonus is always the same fixed amount (REFERRAL_BONUS_AMOUNT), so
  // there's no need to query the transactions collection per referred
  // member just to look up a number that never varies — that was an
  // avoidable N+1 read for every member who opens their referrals page.
  const referred = referredRaw
    .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
    .map((m) => ({
      uid: m.uid,
      fullName: m.fullName,
      memberId: m.memberId,
      createdAt: m.createdAt,
      firstSaleCompleted: !!m.firstSaleCompleted,
      firstSaleAt: m.firstSaleAt || null,
      bonusAmount: m.firstSaleCompleted ? REFERRAL_BONUS_AMOUNT : 0,
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
