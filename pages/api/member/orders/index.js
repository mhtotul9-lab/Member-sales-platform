import { requireActiveMember, adminDb, nextOrderId } from "../../../../lib/firebaseAdmin";
import { notifyAdmins } from "../../../../lib/notify";
import { withErrorHandling } from "../../../../lib/apiWrapper";

function normalizePhone(phone) {
  return String(phone || "").replace(/[^0-9]/g, "");
}

async function handler(req, res) {
  let auth;
  try {
    auth = await requireActiveMember(req);
  } catch (err) {
    return res.status(err.statusCode || 401).json({ error: err.message });
  }
  const { decoded, profile } = auth;

  if (req.method === "GET") {
    const snap = await adminDb
      .collection("orders")
      .where("memberId", "==", decoded.uid)
      .orderBy("createdAt", "desc")
      .get();
    const orders = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
    return res.status(200).json({ orders });
  }

  if (req.method === "POST") {
    const body = req.body || {};
    const { productId, customerName, customerPhone, customerWhatsapp, customerAddress, quantity, marketingSource, notes, proofUrl } = body;

    if (!productId || !customerName || !customerPhone || !quantity) {
      return res.status(400).json({ error: "প্রোডাক্ট, কাস্টমারের নাম, ফোন নম্বর ও পরিমাণ দিতে হবে।" });
    }
    const qty = Number(quantity);
    if (isNaN(qty) || qty <= 0) return res.status(400).json({ error: "সঠিক পরিমাণ দিন।" });

    const productSnap = await adminDb.collection("products").doc(productId).get();
    if (!productSnap.exists || productSnap.data().status !== "active") {
      return res.status(400).json({ error: "এই প্রোডাক্টটি এখন অর্ডারযোগ্য নয়।" });
    }
    const product = productSnap.data();

    // Server computes the order amount from the product's current price —
    // never trust a price sent from the browser. Cost price and profit are
    // captured now too, so later profit-sharing math is based on the price
    // that was actually in effect when the sale happened, even if the
    // product's price changes afterward.
    const orderAmount = Number((product.sellingPrice * qty).toFixed(2));
    const costPriceAtOrder = Number(product.costPrice) || 0;
    const profitAtOrder = Number((orderAmount - costPriceAtOrder * qty).toFixed(2));
    const normalizedPhone = normalizePhone(customerPhone);

    // --- Duplicate / fraud checks -------------------------------------
    const riskFlags = [];
    const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
    const threeDaysAgo = new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString();

    // Hard block: this same member already submitted an order for this
    // exact customer + product in the last 24h and it wasn't rejected/cancelled.
    const ownRecentSnap = await adminDb
      .collection("orders")
      .where("memberId", "==", decoded.uid)
      .where("customerPhoneNormalized", "==", normalizedPhone)
      .where("productId", "==", productId)
      .where("createdAt", ">=", oneDayAgo)
      .get();
    const ownDuplicate = ownRecentSnap.docs.find((d) => !["rejected", "cancelled"].includes(d.data().status));
    if (ownDuplicate) {
      return res.status(409).json({ error: "এই কাস্টমার ও প্রোডাক্টের জন্য আপনি সম্প্রতি একটি অর্ডার সাবমিট করেছেন।" });
    }

    // Soft flag: a DIFFERENT member submitted an order for the same phone
    // number recently — worth an admin's attention, but not blocked outright.
    const crossMemberSnap = await adminDb
      .collection("orders")
      .where("customerPhoneNormalized", "==", normalizedPhone)
      .where("createdAt", ">=", threeDaysAgo)
      .get();
    if (crossMemberSnap.docs.some((d) => d.data().memberId !== decoded.uid)) {
      riskFlags.push("shared_customer_across_members");
    }

    // Soft flag: this member is submitting a lot of orders very quickly.
    const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000).toISOString();
    const recentByMemberSnap = await adminDb
      .collection("orders")
      .where("memberId", "==", decoded.uid)
      .where("createdAt", ">=", oneHourAgo)
      .get();
    if (recentByMemberSnap.size >= 5) {
      riskFlags.push("high_frequency_submission");
    }
    // --------------------------------------------------------------------

    const orderId = await nextOrderId();
    const now = new Date().toISOString();

    const order = {
      orderId,
      memberId: decoded.uid,
      memberName: profile.fullName,
      memberPhone: profile.phone || "",
      productId,
      productName: product.name,
      productImageUrl: product.mainImageUrl || "",
      unitPrice: product.sellingPrice,
      quantity: qty,
      orderAmount,
      costPriceAtOrder,
      profitAtOrder,
      customerName,
      customerPhone,
      customerPhoneNormalized: normalizedPhone,
      customerWhatsapp: customerWhatsapp || "",
      customerAddress: customerAddress || "",
      marketingSource: marketingSource || "other",
      notes: notes || "",
      proofUrl: proofUrl || "",
      status: "submitted",
      rejectionReason: null,
      riskFlags,
      timeline: [{ status: "submitted", at: now, actor: decoded.uid }],
      createdAt: now,
      updatedAt: now,
    };

    const ref = await adminDb.collection("orders").add(order);

    await notifyAdmins({
      type: "new_order",
      message: `${profile.fullName} নতুন অর্ডার সাবমিট করেছে (${orderId})।`,
      link: `/admin/orders/${ref.id}`,
    });

    return res.status(201).json({ id: ref.id, orderId });
  }

  return res.status(405).json({ error: "Method not allowed" });
}

export default withErrorHandling(handler);
