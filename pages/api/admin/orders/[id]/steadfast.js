import { requireAdmin, adminDb } from "../../../../../lib/firebaseAdmin";
import { withErrorHandling } from "../../../../../lib/apiWrapper";
import { createSteadfastOrder, getSteadfastStatus } from "../../../../../lib/steadfast";

// POST ?action=send    → Steadfast-এ পার্সেল তৈরি
// POST ?action=refresh → Steadfast থেকে লেটেস্ট ডেলিভারি স্ট্যাটাস আনা
async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });
  let decoded;
  try { decoded = await requireAdmin(req); } catch (err) { return res.status(err.statusCode || 401).json({ error: err.message }); }

  const ref = adminDb.collection("orders").doc(req.query.id);
  const snap = await ref.get();
  if (!snap.exists) return res.status(404).json({ error: "অর্ডার পাওয়া যায়নি।" });
  const o = snap.data();
  if (o.source !== "website") return res.status(400).json({ error: "শুধু ওয়েবসাইট অর্ডার Steadfast-এ পাঠানো যায়।" });
  const now = new Date().toISOString();

  if (req.query.action === "refresh") {
    if (!o.steadfastConsignmentId) return res.status(400).json({ error: "এই অর্ডার এখনো Steadfast-এ পাঠানো হয়নি।" });
    const st = await getSteadfastStatus(o.steadfastConsignmentId);
    const up = { steadfastStatus: st, updatedAt: now };
    if (st === "delivered" && o.status !== "delivered" && o.status !== "completed") {
      up.status = "delivered";
      up.timeline = [...(o.timeline || []), { status: "delivered", at: now, actor: "steadfast", note: "Steadfast: delivered" }];
    }
    await ref.update(up);
    return res.status(200).json({ ok: true, steadfastStatus: st, statusChanged: !!up.status });
  }

  if (o.steadfastConsignmentId) return res.status(409).json({ error: "এই অর্ডার আগেই Steadfast-এ পাঠানো হয়েছে।" });
  if (["rejected", "cancelled", "returned", "refunded"].includes(o.status)) return res.status(400).json({ error: "বাতিল/রিটার্ন অর্ডার কুরিয়ারে পাঠানো যাবে না।" });

  const c = await createSteadfastOrder(o);
  const up = {
    courierName: "Steadfast", trackingId: c.tracking_code || "", steadfastConsignmentId: String(c.consignment_id),
    steadfastStatus: c.status || "in_review", updatedAt: now,
  };
  // কুরিয়ারে দিলে অর্ডার "প্রসেসিং" — (ওয়েবসাইট অর্ডারে মেম্বার-হিসাবের কোনো পার্শ্বপ্রতিক্রিয়া নেই)
  if (["submitted", "under_review", "approved"].includes(o.status)) {
    up.status = "processing";
    if (!o.approvedAt) up.approvedAt = now;
    up.timeline = [...(o.timeline || []), { status: "processing", at: now, actor: decoded.uid, note: "Steadfast-এ পাঠানো হয়েছে" }];
  }
  await ref.update(up);
  await adminDb.collection("auditLogs").add({
    actor: decoded.uid, actorEmail: decoded.email || null, action: "order.steadfast.send", entity: "orders", entityId: req.query.id,
    after: { consignmentId: up.steadfastConsignmentId, trackingId: up.trackingId }, timestamp: now,
  });
  return res.status(200).json({ ok: true, trackingId: up.trackingId, consignmentId: up.steadfastConsignmentId });
}

export default withErrorHandling(handler);
