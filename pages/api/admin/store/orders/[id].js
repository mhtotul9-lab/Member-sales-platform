import { adminDb } from "../../../../../lib/firebaseAdmin";
import { withErrorHandling } from "../../../../../lib/apiWrapper";
import { guardAdmin } from "../../../../../lib/store/adminApi";
import { normalizePhone, ORDER_STATUSES } from "../../../../../lib/store/shared";

const RESTOCK_STATUSES = ["cancelled", "returned"];

async function handler(req, res) {
  const admin = await guardAdmin(req, res);
  if (!admin) return;
  const ref = adminDb.collection("store_orders").doc(String(req.query.id));
  const snap = await ref.get();
  if (!snap.exists) return res.status(404).json({ error: "অর্ডার পাওয়া যায়নি।" });
  const order = snap.data();

  if (req.method === "GET") {
    const blocked = (await adminDb.collection("store_blocked").doc(order.customer.phone).get()).exists;
    return res.status(200).json({ order: { id: snap.id, ...order }, blocked });
  }

  if (req.method === "DELETE") {
    await ref.delete();
    return res.status(200).json({ ok: true });
  }

  if (req.method === "PATCH") {
    const b = req.body || {};
    const update = { updatedAt: new Date().toISOString() };
    const logs = [];

    if (b.customer) {
      const name = String(b.customer.name ?? order.customer.name).trim();
      const address = String(b.customer.address ?? order.customer.address).trim();
      const phone = normalizePhone(b.customer.phone ?? order.customer.phone);
      if (!name || !address) return res.status(400).json({ error: "নাম ও ঠিকানা খালি রাখা যাবে না।" });
      if (!phone) return res.status(400).json({ error: "সঠিক মোবাইল নাম্বার দিন।" });
      update.customer = { name, phone, address, area: b.customer.area ? (b.customer.area === "inside" ? "inside" : "outside") : order.customer.area || "outside" };
      logs.push("কাস্টমারের তথ্য এডিট করা হয়েছে");
    }

    if (b.qty !== undefined || b.deliveryCharge !== undefined) {
      const items = order.items.map((it) => ({ ...it }));
      if (b.qty !== undefined) items[0].qty = Math.max(1, Math.floor(Number(b.qty) || 1));
      const subtotal = items.reduce((s, it) => s + it.price * it.qty, 0);
      const deliveryCharge = b.deliveryCharge !== undefined ? Math.max(0, Number(b.deliveryCharge) || 0) : order.deliveryCharge;
      update.items = items;
      update.subtotal = subtotal;
      update.deliveryCharge = deliveryCharge;
      update.total = subtotal + deliveryCharge;
      logs.push(`পরিমাণ ${items[0].qty}, ডেলিভারি ৳${deliveryCharge}, মোট ৳${update.total}`);
    }

    if (b.adminNote !== undefined) update.adminNote = String(b.adminNote).slice(0, 1000);

    if (b.status && b.status !== order.status) {
      if (!ORDER_STATUSES[b.status]) return res.status(400).json({ error: "অবৈধ স্ট্যাটাস।" });
      update.status = b.status;
      logs.push(`স্ট্যাটাস: ${ORDER_STATUSES[order.status]?.text || order.status} → ${ORDER_STATUSES[b.status].text}`);
      // বাতিল/রিটার্ন হলে স্টক ফেরত (একবারই)
      if (RESTOCK_STATUSES.includes(b.status) && !order.stockRestored) {
        const it = order.items[0];
        const pRef = adminDb.collection("store_products").doc(it.productId);
        const pSnap = await pRef.get();
        if (pSnap.exists && pSnap.data().stock !== null && pSnap.data().stock !== undefined) {
          await pRef.update({ stock: Number(pSnap.data().stock) + it.qty });
        }
        update.stockRestored = true;
      }
    }

    if (logs.length) {
      update.history = [...(order.history || []), ...logs.map((text) => ({ at: new Date().toISOString(), text, by: admin.email || admin.uid }))];
    }
    await ref.update(update);
    return res.status(200).json({ ok: true });
  }

  return res.status(405).json({ error: "Method not allowed" });
}

export default withErrorHandling(handler);
