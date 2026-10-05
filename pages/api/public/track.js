import { adminDb } from "../../../lib/firebaseAdmin";
import { withErrorHandling } from "../../../lib/apiWrapper";
import { normalizeBdPhone } from "../../../lib/phone";

async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });
  const orderId = String((req.body || {}).orderId || "").trim().toUpperCase();
  const phone = normalizeBdPhone((req.body || {}).phone);
  if (!orderId || !phone) return res.status(400).json({ error: "অর্ডার নম্বর ও মোবাইল নম্বর দিন।" });

  const snap = await adminDb.collection("orders").where("orderId", "==", orderId).limit(1).get();
  const o = snap.empty ? null : snap.docs[0].data();
  if (!o || o.source !== "website" || o.customerPhoneNormalized !== phone) {
    return res.status(404).json({ error: "এই তথ্যে কোনো অর্ডার পাওয়া যায়নি। অর্ডার নম্বর ও ফোন নম্বর আবার মিলিয়ে দেখুন।" });
  }
  return res.status(200).json({
    order: {
      orderId: o.orderId, status: o.status, productName: o.productName, total: o.totalPayable ?? o.orderAmount,
      createdAt: o.createdAt, courierName: o.courierName || "", trackingId: o.trackingId || "",
      timeline: (o.timeline || []).map((t) => ({ status: t.status, at: t.at })),
    },
  });
}

export default withErrorHandling(handler);
