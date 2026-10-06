import { adminDb } from "../../../lib/firebaseAdmin";
import { withErrorHandling } from "../../../lib/apiWrapper";
import { normalizePhone } from "../../../lib/store/shared";

async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });
  const orderNo = String((req.body || {}).orderNo || "").trim().toUpperCase();
  const phone = normalizePhone((req.body || {}).phone);
  if (!orderNo || !phone) return res.status(400).json({ error: "অর্ডার নাম্বার ও মোবাইল নাম্বার দিন।" });
  const snap = await adminDb.collection("store_orders").where("orderNo", "==", orderNo).limit(1).get();
  const o = snap.empty ? null : snap.docs[0].data();
  if (!o || o.customer.phone !== phone) return res.status(404).json({ error: "এই তথ্যে কোনো অর্ডার পাওয়া যায়নি। নাম্বারগুলো আবার দেখুন।" });
  return res.status(200).json({
    orderNo: o.orderNo,
    status: o.status,
    createdAt: o.createdAt,
    total: o.total,
    item: { name: o.items[0].name, qty: o.items[0].qty, variant: o.items[0].variant || "", image: o.items[0].image || "" },
    courier: o.courier ? { status: o.courier.status, trackingCode: o.courier.trackingCode } : null,
  });
}
export default withErrorHandling(handler);
