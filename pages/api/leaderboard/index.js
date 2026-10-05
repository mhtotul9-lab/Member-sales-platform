import { requireActiveMember, adminDb, VALID_SALE_STATUSES } from "../../../lib/firebaseAdmin";
import { withErrorHandling } from "../../../lib/apiWrapper";

const RANGE_DAYS = { week: 7, month: 30, all: null };

async function handler(req, res) {
  if (req.method !== "GET") return res.status(405).json({ error: "Method not allowed" });

  try {
    await requireActiveMember(req);
  } catch (err) {
    return res.status(err.statusCode || 401).json({ error: err.message });
  }

  const range = RANGE_DAYS.hasOwnProperty(req.query.range) ? req.query.range : "all";
  const days = RANGE_DAYS[range];

  let query = adminDb.collection("orders").where("status", "in", VALID_SALE_STATUSES);
  if (days) {
    const cutoff = new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString();
    query = query.where("approvedAt", ">=", cutoff);
  }

  const snap = await query.get();

  const totals = {};
  for (const doc of snap.docs) {
    const o = doc.data();
    if (!totals[o.memberId]) totals[o.memberId] = { totalSales: 0, totalOrders: 0 };
    totals[o.memberId].totalSales += o.orderAmount;
    totals[o.memberId].totalOrders += 1;
  }

  const memberIds = Object.keys(totals);
  if (memberIds.length === 0) return res.status(200).json({ leaderboard: [] });

  const refs = memberIds.map((id) => adminDb.collection("members").doc(id));
  const memberSnaps = await adminDb.getAll(...refs);

  const rows = memberSnaps
    .filter((m) => m.exists && m.data().status === "active" && m.data().role === "member")
    .map((m) => ({
      memberId: m.id,
      fullName: m.data().fullName,
      memberCode: m.data().memberId,
      totalSales: Number(totals[m.id].totalSales.toFixed(2)),
      totalOrders: totals[m.id].totalOrders,
    }))
    .sort((a, b) => b.totalSales - a.totalSales || b.totalOrders - a.totalOrders)
    .slice(0, 50)
    .map((row, i) => ({ rank: i + 1, ...row }));

  return res.status(200).json({ leaderboard: rows });
}

export default withErrorHandling(handler);
