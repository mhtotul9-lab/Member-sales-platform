import { requireAdmin, adminDb, VALID_SALE_STATUSES } from "../../../../../lib/firebaseAdmin";
import { createProfitPool, reverseProfitPool } from "../../../../../lib/business";

const ALLOWED_STATUSES = [
  "under_review", "approved", "rejected", "processing",
  "delivered", "completed", "cancelled", "returned", "refunded",
];

export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });

  let decoded;
  try {
    decoded = await requireAdmin(req);
  } catch (err) {
    return res.status(err.statusCode || 401).json({ error: err.message });
  }

  const { id } = req.query;
  const { status, reason } = req.body || {};

  if (!ALLOWED_STATUSES.includes(status)) {
    return res.status(400).json({ error: "অবৈধ স্ট্যাটাস।" });
  }

  const orderRef = adminDb.collection("orders").doc(id);
  const now = new Date().toISOString();

  let result;
  try {
    result = await adminDb.runTransaction(async (tx) => {
      const orderSnap = await tx.get(orderRef);
      if (!orderSnap.exists) {
        const err = new Error("অর্ডার পাওয়া যায়নি।");
        err.statusCode = 404;
        throw err;
      }
      const order = orderSnap.data();
      const oldStatus = order.status;

      const memberRef = adminDb.collection("members").doc(order.memberId);
      const memberSnap = await tx.get(memberRef);

      const wasValid = VALID_SALE_STATUSES.includes(oldStatus);
      const isValid = VALID_SALE_STATUSES.includes(status);

      const orderUpdate = {
        status,
        rejectionReason: status === "rejected" ? (reason || null) : order.rejectionReason || null,
        updatedAt: now,
        timeline: [...(order.timeline || []), { status, at: now, actor: decoded.uid, note: reason || null }],
      };
      if (!order.approvedAt && isValid) orderUpdate.approvedAt = now;

      tx.update(orderRef, orderUpdate);

      if (memberSnap.exists && wasValid !== isValid) {
        const member = memberSnap.data();
        const sign = isValid ? 1 : -1;
        tx.update(memberRef, {
          totalOrders: Math.max(0, (member.totalOrders || 0) + sign),
          totalSales: Math.max(0, Number(((member.totalSales || 0) + sign * order.orderAmount).toFixed(2))),
        });
      }

      return { oldStatus, memberId: order.memberId };
    });
  } catch (err) {
    return res.status(err.statusCode || 500).json({ error: err.message });
  }

  await adminDb.collection("auditLogs").add({
    actor: decoded.uid,
    actorEmail: decoded.email || null,
    action: "order.status.update",
    entity: "orders",
    entityId: id,
    before: { status: result.oldStatus },
    after: { status },
    reason: reason || null,
    timestamp: now,
  });

  // Profit sharing runs after the transition is safely committed. It touches
  // a variable-size set of member documents (the eligible-active snapshot),
  // which is why it's a batch write outside the transaction rather than
  // inside it — Firestore transactions cap how many documents they can
  // touch, and that set can't be bounded in advance.
  try {
    const wasValid = VALID_SALE_STATUSES.includes(result.oldStatus);
    const isValid = VALID_SALE_STATUSES.includes(status);
    if (wasValid !== isValid) {
      const freshSnap = await orderRef.get();
      const freshOrder = { id: freshSnap.id, ...freshSnap.data() };
      if (!wasValid && isValid) {
        await createProfitPool(id, freshOrder);
      } else if (wasValid && !isValid) {
        await reverseProfitPool(id, freshOrder);
      }
    }
  } catch (profitErr) {
    // The order status change itself already succeeded and is the source of
    // truth; surface the profit-sharing failure separately so it isn't lost,
    // but don't roll back a verification decision the admin already made.
    return res.status(200).json({ ok: true, profitSharingWarning: profitErr.message });
  }

  return res.status(200).json({ ok: true });
}
