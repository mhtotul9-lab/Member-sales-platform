import { requireAdmin, adminDb } from "../../../../../lib/firebaseAdmin";
import { withErrorHandling } from "../../../../../lib/apiWrapper";
import { normalizeBdPhone, isValidBdPhone } from "../../../../../lib/phone";

const clip = (v, n) => String(v ?? "").trim().slice(0, n);

async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });
  let decoded;
  try { decoded = await requireAdmin(req); } catch (err) { return res.status(err.statusCode || 401).json({ error: err.message }); }

  const ref = adminDb.collection("orders").doc(req.query.id);
  const snap = await ref.get();
  if (!snap.exists) return res.status(404).json({ error: "অর্ডার পাওয়া যায়নি।" });
  const o = snap.data();
  const b = req.body || {};
  const now = new Date().toISOString();
  const up = { updatedAt: now };

  if (b.customerName !== undefined) { up.customerName = clip(b.customerName, 80); if (!up.customerName) return res.status(400).json({ error: "নাম খালি রাখা যাবে না।" }); }
  if (b.customerAddress !== undefined) up.customerAddress = clip(b.customerAddress, 300);
  if (b.customerPhone !== undefined) {
    const p = normalizeBdPhone(b.customerPhone);
    if (!isValidBdPhone(p)) return res.status(400).json({ error: "সঠিক মোবাইল নম্বর দিন।" });
    up.customerPhone = p; up.customerPhoneNormalized = p;
  }
  for (const k of ["adminNote", "courierName", "trackingId"]) if (b[k] !== undefined) up[k] = clip(b[k], 300);

  // পরিমাণ/ডেলিভারি চার্জ শুধু ওয়েবসাইট অর্ডারে (মেম্বার অর্ডারের হিসাব অক্ষত থাকে)
  if (o.source === "website") {
    const qty = b.quantity !== undefined ? Math.floor(Number(b.quantity)) : o.quantity;
    const delivery = b.deliveryCharge !== undefined ? Number(b.deliveryCharge) : (o.deliveryCharge || 0);
    if (!(qty >= 1 && qty <= 99) || isNaN(delivery) || delivery < 0) return res.status(400).json({ error: "পরিমাণ (১–৯৯) ও ডেলিভারি চার্জ সঠিক দিন।" });
    const orderAmount = Number((o.unitPrice * qty).toFixed(2));
    Object.assign(up, {
      quantity: qty, orderAmount, customerSalePrice: orderAmount, deliveryCharge: delivery, totalPayable: orderAmount + delivery,
      profitAtOrder: Number((orderAmount - (o.costPriceAtOrder || 0) * qty).toFixed(2)),
    });
  }

  await ref.update(up);
  await adminDb.collection("auditLogs").add({
    actor: decoded.uid, actorEmail: decoded.email || null, action: "order.update", entity: "orders", entityId: req.query.id,
    before: Object.fromEntries(Object.keys(up).map((k) => [k, o[k] ?? null])), after: up, timestamp: now,
  });
  return res.status(200).json({ ok: true });
}

export default withErrorHandling(handler);
