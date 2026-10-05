import crypto from "crypto";
import { adminDb, nextOrderId } from "../../../lib/firebaseAdmin";
import { notifyAdmins } from "../../../lib/notify";
import { withErrorHandling } from "../../../lib/apiWrapper";
import { normalizeBdPhone, isValidBdPhone } from "../../../lib/phone";
import { getStoreSettings, getStoreProduct, deliveryFor } from "../../../lib/storefront";
import { sendCapiPurchase } from "../../../lib/metaCapi";

const clip = (v, n) => String(v || "").trim().slice(0, n);

async function hitRateLimit(ipHash) {
  const d = new Date();
  const key = `${ipHash}_${d.getUTCFullYear()}${d.getUTCMonth()}${d.getUTCDate()}${d.getUTCHours()}`;
  const ref = adminDb.collection("rateLimits").doc(key);
  return adminDb.runTransaction(async (tx) => {
    const snap = await tx.get(ref);
    const count = snap.exists ? snap.data().count : 0;
    if (count >= 8) return true;
    tx.set(ref, { count: count + 1, createdAt: new Date().toISOString() });
    return false;
  });
}

async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });
  const b = req.body || {};

  // হানিপট: বট এই লুকানো ফিল্ড পূরণ করে
  if (b.website) return res.status(200).json({ ok: true, orderId: "ORD-OK", eventId: "x", total: 0, duplicate: true });

  const customerName = clip(b.customerName, 80);
  const customerAddress = clip(b.customerAddress, 300);
  const phone = normalizeBdPhone(b.customerPhone);
  if (customerName.length < 2) return res.status(400).json({ error: "আপনার নাম লিখুন।" });
  if (!isValidBdPhone(phone)) return res.status(400).json({ error: "সঠিক ১১ ডিজিটের মোবাইল নম্বর দিন (যেমন 01712345678)।" });
  if (customerAddress.length < 8) return res.status(400).json({ error: "সম্পূর্ণ ঠিকানা লিখুন (গ্রাম/এলাকা, থানা, জেলা)।" });

  const settings = await getStoreSettings();
  if (settings.orderingEnabled === false) return res.status(503).json({ error: "এই মুহূর্তে অর্ডার নেওয়া বন্ধ আছে। একটু পরে চেষ্টা করুন।" });
  if ((settings.blockedPhones || []).includes(phone)) {
    return res.status(403).json({ error: "এই নম্বর থেকে অর্ডার নেওয়া সম্ভব হচ্ছে না। হটলাইনে যোগাযোগ করুন।" });
  }

  const ip = String(req.headers["x-forwarded-for"] || req.socket?.remoteAddress || "").split(",")[0].trim();
  const ua = String(req.headers["user-agent"] || "");
  const ipHash = crypto.createHash("sha256").update(ip + (process.env.FIREBASE_ADMIN_PROJECT_ID || "")).digest("hex").slice(0, 24);
  if (await hitRateLimit(ipHash)) return res.status(429).json({ error: "অনেকগুলো অর্ডার একসাথে এসেছে। কিছুক্ষণ পর আবার চেষ্টা করুন।" });

  const found = await getStoreProduct(b.productId);
  if (!found) return res.status(400).json({ error: "এই প্রোডাক্টটি এখন অর্ডারযোগ্য নয়।" });
  const { id: productId, data: product } = found;
  if (product.status === "out_of_stock") return res.status(400).json({ error: "দুঃখিত, এই প্রোডাক্টের স্টক শেষ।" });

  // একই নম্বর+প্রোডাক্টে ৩০ মিনিটের মধ্যে দ্বিতীয় অর্ডার = ডাবল-ক্লিক/রিফ্রেশ, নতুন অর্ডার তৈরি হবে না
  const since = new Date(Date.now() - 30 * 60 * 1000).toISOString();
  const recent = await adminDb.collection("orders").where("customerPhoneNormalized", "==", phone).where("createdAt", ">=", since).get();
  const dup = recent.docs.find((d) => d.data().source === "website" && d.data().productId === productId && !["rejected", "cancelled"].includes(d.data().status));
  if (dup) {
    const o = dup.data();
    return res.status(200).json({ ok: true, duplicate: true, orderId: o.orderId, eventId: `purchase_${o.orderId}`, total: o.totalPayable, productName: o.productName });
  }

  const qty = 1;
  const orderAmount = Number((Number(product.sellingPrice) * qty).toFixed(2));
  const deliveryCharge = deliveryFor(settings, orderAmount);
  const totalPayable = orderAmount + deliveryCharge;
  const costPriceAtOrder = Number(product.costPrice) || 0;
  const orderId = await nextOrderId();
  const now = new Date().toISOString();
  const utm = b.utm && typeof b.utm === "object" ? Object.fromEntries(Object.entries(b.utm).slice(0, 6).map(([k, v]) => [clip(k, 30), clip(v, 120)])) : {};

  const order = {
    orderId, source: "website",
    memberId: null, memberName: "ওয়েবসাইট অর্ডার", memberPhone: "",
    productId, productName: product.name, productImageUrl: product.mainImageUrl || "",
    unitPrice: product.sellingPrice, quantity: qty, orderAmount,
    customerUnitPrice: product.sellingPrice, customerSalePrice: orderAmount,
    deliveryCharge, totalPayable, paymentMethod: "cod",
    costPriceAtOrder, profitAtOrder: Number((orderAmount - costPriceAtOrder * qty).toFixed(2)),
    commissionAtOrder: 0, poolShareAtOrder: 0, referralCommissionAtOrder: 0,
    customerName, customerPhone: phone, customerPhoneNormalized: phone, customerWhatsapp: "", customerAddress,
    marketingSource: "website", trafficSource: utm, ipHash, userAgent: ua.slice(0, 200),
    notes: "", proofUrl: "", adminNote: "", courierName: "", trackingId: "",
    status: "submitted", rejectionReason: null, riskFlags: [],
    timeline: [{ status: "submitted", at: now, actor: "customer" }],
    createdAt: now, updatedAt: now,
  };
  const ref = await adminDb.collection("orders").add(order);
  const eventId = `purchase_${orderId}`;

  await notifyAdmins({ type: "new_order", message: `🛒 নতুন ওয়েবসাইট অর্ডার ${orderId} — ${customerName} (${phone}), ${product.name} ৳${totalPayable}`, link: `/admin/orders/${ref.id}` }).catch(() => {});

  await sendCapiPurchase({
    eventId, value: totalPayable, productId, productName: product.name, quantity: qty, unitPrice: product.sellingPrice,
    phone, name: customerName, ip, ua, fbp: clip(b.fbp, 120), fbc: clip(b.fbc, 200),
    url: clip(b.pageUrl, 300) || undefined,
  });

  return res.status(201).json({ ok: true, orderId, eventId, total: totalPayable, orderAmount, deliveryCharge, productName: product.name });
}

export default withErrorHandling(handler);
