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

  // Each piece of the dashboard is labeled and run with Promise.allSettled
  // instead of Promise.all, so that if ANY single query fails (e.g. a
  // missing Firestore index), the response names exactly which part broke
  // instead of the whole dashboard just dying with a generic message.
  const jobs = [
    { label: "মেম্বার স্ট্যাটাস গণনা", run: () => Promise.all(MEMBER_STATUSES.map((s) => countWhere("members", "status", s))) },
    { label: "অর্ডার স্ট্যাটাস গণনা", run: () => Promise.all(ORDER_STATUSES.map((s) => countWhere("orders", "status", s))) },
    { label: "মোট সেল/প্রফিট/কমিশনের যোগফল", run: () => adminDb.collection("orders").where("status", "in", VALID_SALE_STATUSES).aggregate({
      totalSales: AggregateField.sum("orderAmount"),
      totalProfit: AggregateField.sum("profitAtOrder"),
      totalCommission: AggregateField.sum("commissionAtOrder"),
    }).get() },
    { label: "বিতরণ করা প্রফিট পুলের যোগফল", run: () => sumWhere("profitPools", "distributed", "==", true, "poolAmount") },
    { label: "মোট উইথড্রর যোগফল", run: () => sumWhere("withdrawals", "status", "==", "paid", "amount") },
    { label: "পেন্ডিং উইথড্রর যোগফল", run: () => adminDb.collection("withdrawals").where("status", "in", ["pending", "approved"]).aggregate({
      total: AggregateField.sum("amount"),
    }).get() },
    { label: "এলিজিবল অ্যাক্টিভ মেম্বার হিসাব", run: () => getEligibleActiveMemberIds(settings) },
    { label: "টপ সেলার লিস্ট", run: () => adminDb.collection("members").orderBy("totalSales", "desc").limit(10).get() },
  ];

  const results = await Promise.allSettled(jobs.map((j) => j.run()));
  const failed = results
    .map((r, i) => ({ r, label: jobs[i].label }))
    .filter((x) => x.r.status === "rejected");

  if (failed.length > 0) {
    const details = failed.map((f) => `- ${f.label}: ${f.r.reason?.message || f.r.reason}`).join("\n");
    const err = new Error(`ড্যাশবোর্ডের নিচের অংশগুলো লোড করা যায়নি:\n${details}`);
    err.statusCode = 500;
    throw err;
  }

  const [memberCounts, orderCounts, totalsSnap, distributedSnap, withdrawnSnap, pendingWithdrawSnap, eligibleActiveIds, topSellersSnap] =
    results.map((r) => r.value);

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
    totalCommissionPaid: totals.totalCommission || 0,
    totalDistributedProfit: distributedSnap,
    totalWithdrawn: withdrawnSnap,
    pendingWithdrawalAmount: pendingWithdrawSnap.data().total || 0,
    topSellers,
  });
}

export default withErrorHandling(handler);
