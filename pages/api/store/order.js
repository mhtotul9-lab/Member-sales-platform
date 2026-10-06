import { adminDb } from "../../../lib/firebaseAdmin";
import { withErrorHandling } from "../../../lib/apiWrapper";
import { normalizePhone, calcDelivery, normalizeArea } from "../../../lib/store/shared";
import { getSettings, dhakaDateKey } from "../../../lib/store/server";
import { sendCapiPurchase } from "../../../lib/store/capi";

// কাস্টমার অর্ডার — শুধু নাম, মোবাইল, ঠিকানা লাগে।
async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });
  const b = req.body || {};

  // বট ধরার জন্য লুকানো ফিল্ড — মানুষ এটা পূরণ করে না।
  if (b.website) return res.status(200).json({ ok: true, orderNo: "JR-0" });

  const name = String(b.name || "").trim();
  const address = String(b.address || "").trim();
  const phone = normalizePhone(b.phone);
  if (name.length < 2 || name.length > 80) return res.status(400).json({ error: "সঠিক নাম লিখুন।" });
  if (!phone) return res.status(400).json({ error: "সঠিক ১১ ডিজিটের মোবাইল নাম্বার দিন (যেমন ০১৭XXXXXXXX)।" });
  if (address.length < 10 || address.length > 300) return res.status(400).json({ error: "পূর্ণ ঠিকানা লিখুন (গ্রাম/এলাকা, থানা, জেলা সহ)।" });
  if (!b.productId) return res.status(400).json({ error: "প্রোডাক্ট পাওয়া যায়নি।" });

  // ব্লক করা নাম্বার (ভুয়া/রিটার্ন-প্রবণ কাস্টমার)
  const blocked = await adminDb.collection("store_blocked").doc(phone).get();
  if (blocked.exists) return res.status(403).json({ error: "দুঃখিত, এই নাম্বার থেকে অর্ডার নেওয়া সম্ভব হচ্ছে না। অনুগ্রহ করে আমাদের সাথে সরাসরি যোগাযোগ করুন।" });

  const area = normalizeArea(b.area);
  const ip = String(req.headers["x-forwarded-for"] || req.socket?.remoteAddress || "").split(",")[0].trim();
  const now = Date.now();

  // একই ফোন থেকে ঘন ঘন অর্ডার আটকানো + ডাবল-ক্লিক ঠেকানো
  const recent = await adminDb.collection("store_orders").where("customer.phone", "==", phone).get();
  const recentDocs = recent.docs.map((d) => d.data());
  const dup = recentDocs.find((o) => o.items?.[0]?.productId === b.productId && now - Date.parse(o.createdAt) < 10 * 60 * 1000 && o.status !== "cancelled");
  if (dup) {
    return res.status(200).json({ ok: true, duplicate: true, orderNo: dup.orderNo, total: dup.total, productId: b.productId, productName: dup.items[0].name, price: dup.items[0].price, qty: dup.items[0].qty, eventId: b.eventId || "" });
  }
  if (recentDocs.filter((o) => now - Date.parse(o.createdAt) < 60 * 60 * 1000).length >= 5) {
    return res.status(429).json({ error: "এই নাম্বার থেকে অনেক অর্ডার এসেছে। অনুগ্রহ করে একটু পরে চেষ্টা করুন বা আমাদের ফোন করুন।" });
  }
  if (ip) {
    const byIp = await adminDb.collection("store_orders").where("meta.ip", "==", ip).get();
    if (byIp.docs.filter((d) => now - Date.parse(d.data().createdAt) < 10 * 60 * 1000).length >= 8) {
      return res.status(429).json({ error: "অনেক বেশি অনুরোধ এসেছে। একটু পরে চেষ্টা করুন।" });
    }
  }

  const settings = await getSettings();
  const productRef = adminDb.collection("store_products").doc(String(b.productId));
  const counterRef = adminDb.collection("settings").doc("store_counters");
  const dateKey = dhakaDateKey();
  const orderRef = adminDb.collection("store_orders").doc();

  const result = await adminDb.runTransaction(async (tx) => {
    const [pSnap, cSnap] = await Promise.all([tx.get(productRef), tx.get(counterRef)]);
    if (!pSnap.exists || pSnap.data().status !== "active") {
      const e = new Error("দুঃখিত, এই প্রোডাক্টটি এখন অর্ডারের জন্য খোলা নেই।");
      e.statusCode = 400;
      throw e;
    }
    const p = pSnap.data();
    const qty = 1;
    const tracked = p.stock !== null && p.stock !== undefined && p.stock !== "";
    if (tracked && Number(p.stock) < qty) {
      const e = new Error("দুঃখিত, প্রোডাক্টটি স্টকে নেই।");
      e.statusCode = 400;
      throw e;
    }
    const field = `seq_${dateKey}`;
    const seq = ((cSnap.exists && cSnap.data()[field]) || 0) + 1;
    const orderNo = `JR-${dateKey}-${String(seq).padStart(4, "0")}`;

    // সাইজ/রং থাকলে বাছাই বাধ্যতামূলক
    const sizes = Array.isArray(p.sizes) ? p.sizes : [];
    const colors = Array.isArray(p.colors) ? p.colors : [];
    const size = String(b.size || "");
    const color = String(b.color || "");
    if (sizes.length && !sizes.includes(size)) { const e = new Error("সাইজ বাছাই করুন।"); e.statusCode = 400; throw e; }
    if (colors.length && !colors.includes(color)) { const e = new Error("রং বাছাই করুন।"); e.statusCode = 400; throw e; }
    const variant = [size && `সাইজ: ${size}`, color && `রং: ${color}`].filter(Boolean).join(", ");

    const price = Number(p.price) || 0;
    const subtotal = price * qty;
    const deliveryCharge = calcDelivery(settings, subtotal, area);
    const doc = {
      orderNo,
      status: "new",
      customer: { name, phone, address, area },
      items: [{ productId: pSnap.id, name: p.name, price, costPrice: Number(p.costPrice) || 0, qty, variant, image: (p.images && p.images[0]) || "" }],
      subtotal,
      deliveryCharge,
      total: subtotal + deliveryCharge,
      adminNote: "",
      courier: null,
      history: [{ at: new Date().toISOString(), text: "কাস্টমার অর্ডার করেছেন" }],
      meta: {
        ip,
        userAgent: String(req.headers["user-agent"] || "").slice(0, 200),
        referrer: String(b.referrer || "").slice(0, 300),
        landing: String(b.landing || "").slice(0, 300),
        fbp: String(b.fbp || "").slice(0, 100),
        fbc: String(b.fbc || "").slice(0, 200),
        eventId: String(b.eventId || "").slice(0, 60),
      },
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    tx.set(counterRef, { [field]: seq }, { merge: true });
    if (tracked) tx.update(productRef, { stock: Number(p.stock) - qty });
    tx.set(orderRef, doc);
    return doc;
  });

  const item = result.items[0];
  // সার্ভার-সাইড Pixel (Conversions API) — টোকেন বসানো থাকলে চলে, না থাকলে চুপচাপ বাদ
  sendCapiPurchase(result, req).catch(() => {});
  return res.status(201).json({
    ok: true,
    orderNo: result.orderNo,
    total: result.total,
    productId: item.productId,
    productName: item.name,
    price: item.price,
    qty: item.qty,
    eventId: b.eventId || "",
  });
}

export default withErrorHandling(handler);
