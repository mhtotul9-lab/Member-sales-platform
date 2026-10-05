import { adminDb } from "../../../../lib/firebaseAdmin";
import { withErrorHandling } from "../../../../lib/apiWrapper";
import { guardAdmin } from "../../../../lib/store/adminApi";
import { createConsignment, getStatusByCid, getBalance } from "../../../../lib/store/steadfast";

async function handler(req, res) {
  const admin = await guardAdmin(req, res);
  if (!admin) return;
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });
  const { action, orderId } = req.body || {};

  if (action === "balance") {
    const data = await getBalance();
    return res.status(200).json({ balance: data.current_balance });
  }

  const ref = adminDb.collection("store_orders").doc(String(orderId));
  const snap = await ref.get();
  if (!snap.exists) return res.status(404).json({ error: "অর্ডার পাওয়া যায়নি।" });
  const order = snap.data();
  const now = new Date().toISOString();

  if (action === "send") {
    if (order.courier?.consignmentId) return res.status(400).json({ error: "এই অর্ডার আগেই Steadfast এ পাঠানো হয়েছে।" });
    if (["cancelled", "returned", "delivered"].includes(order.status)) return res.status(400).json({ error: "এই স্ট্যাটাসের অর্ডার কুরিয়ারে পাঠানো যাবে না।" });
    const data = await createConsignment(order);
    const c = data.consignment || {};
    if (!c.consignment_id) return res.status(502).json({ error: data.message || "Steadfast থেকে consignment ID আসেনি।" });
    const courier = {
      provider: "steadfast",
      consignmentId: String(c.consignment_id),
      trackingCode: c.tracking_code || "",
      status: c.status || "in_review",
      sentAt: now,
      lastCheckedAt: now,
    };
    await ref.update({
      courier,
      status: "shipped",
      updatedAt: now,
      history: [...(order.history || []), { at: now, by: admin.email || admin.uid, text: `Steadfast এ পাঠানো হয়েছে (Tracking: ${courier.trackingCode})` }],
    });
    return res.status(200).json({ ok: true, courier });
  }

  if (action === "status") {
    if (!order.courier?.consignmentId) return res.status(400).json({ error: "অর্ডারটি এখনো Steadfast এ পাঠানো হয়নি।" });
    const data = await getStatusByCid(order.courier.consignmentId);
    const ds = data.delivery_status || "unknown";
    const update = { "courier.status": ds, "courier.lastCheckedAt": now, updatedAt: now };
    const logs = [];
    if (order.status === "shipped") {
      if (ds === "delivered") { update.status = "delivered"; logs.push("কুরিয়ার: ডেলিভার্ড"); }
      if (ds === "cancelled") { update.status = "returned"; logs.push("কুরিয়ার: বাতিল/রিটার্ন"); }
    }
    if (logs.length) update.history = [...(order.history || []), ...logs.map((text) => ({ at: now, by: "steadfast", text }))];
    await ref.update(update);
    return res.status(200).json({ ok: true, status: ds, orderStatus: update.status || order.status });
  }

  return res.status(400).json({ error: "অবৈধ action।" });
}

export default withErrorHandling(handler);
