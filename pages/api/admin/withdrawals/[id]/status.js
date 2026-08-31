import { FieldValue } from "firebase-admin/firestore";
import { requireAdmin, adminDb } from "../../../../../lib/firebaseAdmin";
import { notifyUser } from "../../../../../lib/notify";

const ALLOWED_STATUSES = ["approved", "rejected", "paid"];

export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });

  let decoded;
  try {
    decoded = await requireAdmin(req);
  } catch (err) {
    return res.status(err.statusCode || 401).json({ error: err.message });
  }

  const { id } = req.query;
  const { status, adminNote, paymentReference } = req.body || {};
  if (!ALLOWED_STATUSES.includes(status)) return res.status(400).json({ error: "অবৈধ স্ট্যাটাস।" });

  const withdrawalRef = adminDb.collection("withdrawals").doc(id);
  const now = new Date().toISOString();
  let memberId, amount;

  try {
    await adminDb.runTransaction(async (tx) => {
      const snap = await tx.get(withdrawalRef);
      if (!snap.exists) {
        const err = new Error("উইথড্র রিকোয়েস্ট পাওয়া যায়নি।");
        err.statusCode = 404;
        throw err;
      }
      const w = snap.data();
      memberId = w.memberId;
      amount = w.amount;

      if (w.status === "paid" || w.status === "rejected") {
        const err = new Error("এই রিকোয়েস্ট আগেই চূড়ান্ত হয়ে গেছে।");
        err.statusCode = 409;
        throw err;
      }
      if (status === "paid" && w.status !== "approved") {
        const err = new Error("Paid করার আগে অ্যাপ্রুভ করতে হবে।");
        err.statusCode = 400;
        throw err;
      }

      const update = { status, adminNote: adminNote || w.adminNote || null, updatedAt: now };
      if (status === "paid") {
        update.paidAt = now;
        update.paymentReference = paymentReference || null;
      }
      tx.update(withdrawalRef, update);

      const txnRef = adminDb.collection("transactions").doc(w.txnId);
      if (status === "rejected") {
        // Refund the reserved amount back to the member's balance and mark
        // the original ledger entry as reversed — never delete/edit its
        // original meaning, just record what happened next.
        tx.update(txnRef, { status: "reversed" });
        tx.update(adminDb.collection("members").doc(w.memberId), {
          availableBalance: FieldValue.increment(w.amount),
        });
        const reversalRef = adminDb.collection("transactions").doc();
        tx.set(reversalRef, {
          memberId: w.memberId, type: "withdrawal_reversal", amount: w.amount,
          refWithdrawalId: id, status: "completed",
          description: "উইথড্র রিজেক্টেড — ব্যালেন্স ফেরত",
          createdAt: now,
        });
      } else if (status === "paid") {
        tx.update(txnRef, { status: "completed" });
        tx.update(adminDb.collection("members").doc(w.memberId), {
          totalWithdrawn: FieldValue.increment(w.amount),
        });
      }
      // "approved" — no balance movement yet, just a status update.
    });
  } catch (err) {
    return res.status(err.statusCode || 500).json({ error: err.message });
  }

  await adminDb.collection("auditLogs").add({
    actor: decoded.uid,
    actorEmail: decoded.email || null,
    action: "withdrawal.status.update",
    entity: "withdrawals",
    entityId: id,
    after: { status },
    timestamp: now,
  });

  const STATUS_MESSAGE = {
    approved: `আপনার ৳${amount} উইথড্র রিকোয়েস্ট অ্যাপ্রুভ হয়েছে।`,
    rejected: `আপনার ৳${amount} উইথড্র রিকোয়েস্ট রিজেক্ট হয়েছে — টাকা ব্যালেন্সে ফেরত দেওয়া হয়েছে।`,
    paid: `আপনার ৳${amount} উইথড্র পেমেন্ট সম্পন্ন হয়েছে।`,
  };
  await notifyUser(memberId, { type: "withdrawal_status", message: STATUS_MESSAGE[status], link: "/member/wallet" });

  return res.status(200).json({ ok: true });
}
