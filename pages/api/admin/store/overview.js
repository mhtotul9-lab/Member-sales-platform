import { adminDb } from "../../../../lib/firebaseAdmin";
import { withErrorHandling } from "../../../../lib/apiWrapper";
import { guardAdmin } from "../../../../lib/store/adminApi";
import { dhakaDateISO } from "../../../../lib/store/server";

async function handler(req, res) {
  if (!(await guardAdmin(req, res))) return;
  const snap = await adminDb.collection("store_orders").orderBy("createdAt", "desc").limit(1000).get();
  const orders = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
  const today = dhakaDateISO();
  const dayOf = (o) => dhakaDateISO(new Date(o.createdAt));
  const live = (o) => !["cancelled", "returned"].includes(o.status);

  const counts = {};
  orders.forEach((o) => { counts[o.status] = (counts[o.status] || 0) + 1; });

  const todayOrders = orders.filter((o) => dayOf(o) === today);
  const productMap = {};
  orders.filter(live).forEach((o) => {
    const it = o.items?.[0];
    if (!it) return;
    productMap[it.name] = productMap[it.name] || { name: it.name, qty: 0, revenue: 0 };
    productMap[it.name].qty += it.qty;
    productMap[it.name].revenue += it.price * it.qty;
  });

  const deliveredRevenue = orders.filter((o) => o.status === "delivered").reduce((s, o) => s + o.total, 0);
  const deliveredProfit = orders.filter((o) => o.status === "delivered").reduce((s, o) => s + o.items.reduce((p, it) => p + (it.price - (it.costPrice || 0)) * it.qty, 0), 0);

  return res.status(200).json({
    totalOrders: orders.length,
    todayCount: todayOrders.length,
    todayValue: todayOrders.filter(live).reduce((s, o) => s + o.total, 0),
    counts,
    deliveredRevenue,
    deliveredProfit,
    topProducts: Object.values(productMap).sort((a, b) => b.qty - a.qty).slice(0, 5),
    recent: orders.slice(0, 8),
  });
}

export default withErrorHandling(handler);
