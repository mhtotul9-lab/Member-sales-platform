import { AggregateField } from "firebase-admin/firestore";
import { requireAdmin, adminDb, VALID_SALE_STATUSES } from "../../../lib/firebaseAdmin";
import { getEligibleActiveMemberIds, getSettings } from "../../../lib/business";
import { withErrorHandling } from "../../../lib/apiWrapper";

const ORDER_STATUSES = [
  "submitted", "under_review", "approved", "rejected",
  "processing", "delivered", "completed", "cancelled", "returned", "refunded",
];
const MEMBER_STATUSES = ["pending", "active", "suspended", "banned", "removed", "rejected"];

async function countWhere(collectionName, field, value) {
  const snap = await adminDb.collection(collectionName).where(field, "==", value).count().get();
  return snap.data().count;
}

async function sumWhere(collectionName, field, op, value, sumField) {
  const snap = await adminDb.collection(collectionName).where(field, op, value).aggregate({
    total: AggregateField.sum(sumField),
  }).get();
  return snap.data().total || 0;
}

async function handler(req, res) {
  try {
    await requireAdmin(req);
  } catch (err) {
    return res.status(err.statusCode || 401).json({ error: err.message });
  }

  const settings = await getSettings();

  const [memberCounts, orderCounts, totalsSnap, distributedSnap, withdrawnSnap, pendingWithdrawSnap, eligibleActiveIds, topSellersSnap] =
    await Promise.all([
      Promise.all(MEMBER_STATUSES.map((s) => countWhere("members", "status", s))),
      Promise.all(ORDER_STATUSES.map((s) => countWhere("orders", "status", s))),
      adminDb.collection("orders").where("status", "in", VALID_SALE_STATUSES).aggregate({
        totalSales: AggregateField.sum("orderAmount"),
        totalProfit: AggregateField.sum("profitAtOrder"),
      }).get(),
      sumWhere("profitPools", "distributed", "==", true, "poolAmount"),
      sumWhere("withdrawals", "status", "==", "paid", "amount"),
      adminDb.collection("withdrawals").where("status", "in", ["pending", "approved"]).aggregate({
        total: AggregateField.sum("amount"),
      }).get(),
      getEligibleActiveMemberIds(settings),
      adminDb.collection("members").orderBy("totalSales", "desc").limit(10).get(),
    ]);

  const memberStatusCounts = Object.fromEntries(MEMBER_STATUSES.map((s, i) => [s, memberCounts[i]]));
  const orderStatusCounts = Object.fromEntries(ORDER_STATUSES.map((s, i) => [s, orderCounts[i]]));
  const totals = totalsSnap.data();

  const topSellers = topSellersSnap.docs
    .map((d) => ({ uid: d.id, ...d.data() }))
    .filter((m) => m.role !== "admin" && (m.totalSales || 0) > 0)
    .slice(0, 5)
    .map((m) => ({ uid: m.uid, fullName: m.fullName, memberId: m.memberId, totalSales: m.totalSales || 0, totalOrders: m.totalOrders || 0 }));

  return res.status(200).json({
    memberStatusCounts,
    activeSalesMemberCount: eligibleActiveIds.length,
    orderStatusCounts,
    totalSales: totals.totalSales || 0,
    totalCompanyProfit: totals.totalProfit || 0,
    totalDistributedProfit: distributedSnap,
    totalWithdrawn: withdrawnSnap,
    pendingWithdrawalAmount: pendingWithdrawSnap.data().total || 0,
    topSellers,
  });
}

export default withErrorHandling(handler);
