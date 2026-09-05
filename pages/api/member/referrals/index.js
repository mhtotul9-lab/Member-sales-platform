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

  const referred = await Promise.all(
    referredRaw
      .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
      .map(async (m) => {
        let bonusAmount = 0;
        if (m.firstSaleCompleted) {
          const txnSnap = await adminDb
            .collection("transactions")
            .where("refMemberId", "==", m.uid)
            .where("type", "==", "referral_bonus")
            .limit(1)
            .get();
          if (!txnSnap.empty) bonusAmount = txnSnap.docs[0].data().amount;
        }
        return {
          uid: m.uid,
          fullName: m.fullName,
          memberId: m.memberId,
          createdAt: m.createdAt,
          firstSaleCompleted: !!m.firstSaleCompleted,
          firstSaleAt: m.firstSaleAt || null,
          bonusAmount,
        };
      })
  );

  return res.status(200).json({
    memberCode: profile.memberId,
    referralCount: profile.referralCount || 0,
    referralFirstSalesCount: profile.referralFirstSalesCount || 0,
    referralEarnings: profile.referralEarnings || 0,
    referred,
  });
}

export default withErrorHandling(handler);
