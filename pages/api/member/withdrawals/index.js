import { FieldValue } from "firebase-admin/firestore";
import { requireActiveMember, adminDb } from "../../../../lib/firebaseAdmin";
import { getSettings } from "../../../../lib/business";
import { notifyAdmins } from "../../../../lib/notify";

export default async function handler(req, res) {
  let auth;
  try {
    auth = await requireActiveMember(req);
  } catch (err) {
    return res.status(err.statusCode || 401).json({ error: err.message });
  }
  const { decoded, profile } = auth;

  if (req.method === "GET") {
    const snap = await adminDb
      .collection("withdrawals")
      .where("memberId", "==", decoded.uid)
      .orderBy("requestedAt", "desc")
      .get();
    return res.status(200).json({ withdrawals: snap.docs.map((d) => ({ id: d.id, ...d.data() })) });
  }

  if (req.method === "POST") {
    const { amount, method, accountNumber } = req.body || {};
    const amt = Number(amount);
    const settings = await getSettings();

    if (isNaN(amt) || amt <= 0) return res.status(400).json({ error: "সঠিক পরিমাণ দিন।" });
    if (amt < settings.minWithdrawalAmount) {
      return res.status(400).json({ error: `সর্বনিম্ন উইথড্র পরিমাণ ৳${settings.minWithdrawalAmount}।` });
    }
    if (!settings.paymentMethods.includes(method)) return res.status(400).json({ error: "অবৈধ পেমেন্ট মেথড।" });
    if (!accountNumber) return res.status(400).json({ error: "অ্যাকাউন্ট/ওয়ালেট নম্বর দিতে হবে।" });

    const memberRef = adminDb.collection("members").doc(decoded.uid);
    const now = new Date().toISOString();
    let withdrawalId, txnId;

    try {
      await adminDb.runTransaction(async (tx) => {
        const memberSnap = await tx.get(memberRef);
        const balance = memberSnap.data().availableBalance || 0;
        if (amt > balance) {
          const err = new Error("আপনার ব্যালেন্সে যথেষ্ট টাকা নেই।");
          err.statusCode = 400;
          throw err;
        }

        const withdrawalRef = adminDb.collection("withdrawals").doc();
        const txnRef = adminDb.collection("transactions").doc();
        withdrawalId = withdrawalRef.id;
        txnId = txnRef.id;

        tx.set(withdrawalRef, {
          memberId: decoded.uid, memberName: profile.fullName,
          amount: amt, method, accountNumber,
          status: "pending", adminNote: null, paymentReference: null,
          txnId: txnRef.id,
          requestedAt: now, updatedAt: now, paidAt: null,
        });

        tx.set(txnRef, {
          memberId: decoded.uid, type: "withdrawal", amount: -amt,
          refWithdrawalId: withdrawalRef.id, status: "pending",
          description: "উইথড্র রিকোয়েস্ট (রিজার্ভড)",
          createdAt: now,
        });

        // Reserve the amount immediately so the same balance can't be
        // requested twice while this withdrawal is still pending.
        tx.update(memberRef, { availableBalance: FieldValue.increment(-amt) });
      });
    } catch (err) {
      return res.status(err.statusCode || 500).json({ error: err.message });
    }

    await notifyAdmins({
      type: "new_withdrawal",
      message: `${profile.fullName} ৳${amt} উইথড্র রিকোয়েস্ট করেছে।`,
      link: "/admin/withdrawals",
    });

    return res.status(201).json({ id: withdrawalId, txnId });
  }

  return res.status(405).json({ error: "Method not allowed" });
}
