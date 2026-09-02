import { requireActiveMember, adminDb, VALID_SALE_STATUSES } from "../../../lib/firebaseAdmin";
import { withErrorHandling } from "../../../lib/apiWrapper";

const PENDING_STATUSES = ["submitted", "under_review"];
const DEAD_STATUSES = ["rejected", "cancelled", "returned", "refunded"];

function dayKey(iso) {
  return iso.slice(0, 10); // YYYY-MM-DD
}

async function handler(req, res) {
  if (req.method !== "GET") return res.status(405).json({ error: "Method not allowed" });

  let auth;
  try {
    auth = await requireActiveMember(req);
  } catch (err) {
    return res.status(err.statusCode || 401).json({ error: err.message });
  }
  const { decoded } = auth;

  const snap = await adminDb
    .collection("orders")
    .where("memberId", "==", decoded.uid)
    .orderBy("createdAt", "desc")
    .get();

  const orders = snap.docs.map((d) => ({ id: d.id, ...d.data() }));

  let validCount = 0, validSalesAmount = 0, validProfitAmount = 0, validCommissionAmount = 0;
  let pendingCount = 0, pendingSalesAmount = 0;
  let deadCount = 0;
  const statusCounts = {};

  // Last 14 days daily series, oldest first, for a small trend chart.
  const days = [];
  for (let i = 13; i >= 0; i--) {
    days.push(dayKey(new Date(Date.now() - i * 24 * 60 * 60 * 1000).toISOString()));
  }
  const dailyValidSales = Object.fromEntries(days.map((d) => [d, 0]));

  for (const o of orders) {
    statusCounts[o.status] = (statusCounts[o.status] || 0) + 1;
    if (VALID_SALE_STATUSES.includes(o.status)) {
      validCount += 1;
      validSalesAmount += o.orderAmount || 0;
      validProfitAmount += o.profitAtOrder || 0;
      validCommissionAmount += o.commissionAtOrder || 0;
      const k = dayKey(o.createdAt);
      if (k in dailyValidSales) dailyValidSales[k] += o.orderAmount || 0;
    } else if (PENDING_STATUSES.includes(o.status)) {
      pendingCount += 1;
      pendingSalesAmount += o.orderAmount || 0;
    } else if (DEAD_STATUSES.includes(o.status)) {
      deadCount += 1;
    }
  }

  const totalOrders = orders.length;
  const conversionRate = totalOrders > 0 ? Number(((validCount / totalOrders) * 100).toFixed(1)) : 0;

  // This calendar month (for a quick "this month" vs "all time" contrast).
  const monthStart = new Date();
  monthStart.setDate(1);
  monthStart.setHours(0, 0, 0, 0);
  const monthStartIso = monthStart.toISOString();
  const thisMonthOrders = orders.filter((o) => o.createdAt >= monthStartIso);
  const thisMonthValidSales = thisMonthOrders
    .filter((o) => VALID_SALE_STATUSES.includes(o.status))
    .reduce((sum, o) => sum + (o.orderAmount || 0), 0);

  const recentOrders = orders.slice(0, 5).map((o) => ({
    id: o.id, orderId: o.orderId, productName: o.productName,
    orderAmount: o.orderAmount, status: o.status, createdAt: o.createdAt,
  }));

  return res.status(200).json({
    totalOrders,
    validCount,
    pendingCount,
    deadCount,
    conversionRate,
    validSalesAmount: Number(validSalesAmount.toFixed(2)),
    pendingSalesAmount: Number(pendingSalesAmount.toFixed(2)),
    validProfitAmount: Number(validProfitAmount.toFixed(2)),
    validCommissionAmount: Number(validCommissionAmount.toFixed(2)),
    statusCounts,
    thisMonthOrderCount: thisMonthOrders.length,
    thisMonthValidSales: Number(thisMonthValidSales.toFixed(2)),
    dailySeries: days.map((d) => ({ date: d, amount: Number((dailyValidSales[d] || 0).toFixed(2)) })),
    recentOrders,
  });
}

export default withErrorHandling(handler);
