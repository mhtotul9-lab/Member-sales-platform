import { adminDb } from "../../../../../lib/firebaseAdmin";
import { withErrorHandling } from "../../../../../lib/apiWrapper";
import { guardAdmin } from "../../../../../lib/store/adminApi";

async function handler(req, res) {
  if (!(await guardAdmin(req, res))) return;
  if (req.method !== "GET") return res.status(405).json({ error: "Method not allowed" });
  const snap = await adminDb.collection("store_orders").orderBy("createdAt", "desc").limit(600).get();
  const orders = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
  // একই ফোনের কতগুলো অর্ডার (রিপিট কাস্টমার / সন্দেহজনক ধরতে)
  const phoneCount = {};
  orders.forEach((o) => { phoneCount[o.customer?.phone] = (phoneCount[o.customer?.phone] || 0) + 1; });
  orders.forEach((o) => { o.phoneOrderCount = phoneCount[o.customer?.phone] || 1; });
  return res.status(200).json({ orders });
}

export default withErrorHandling(handler);
