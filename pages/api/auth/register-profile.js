import { FieldValue } from "firebase-admin/firestore";
import { requireAuth, adminDb } from "../../../lib/firebaseAdmin";
import { notifyAdmins } from "../../../lib/notify";
import { withErrorHandling } from "../../../lib/apiWrapper";

// Generates the next sequential MBR-##### id inside a transaction so two
// simultaneous signups can never collide on the same number.
async function nextMemberId() {
  const counterRef = adminDb.collection("settings").doc("counters");
  return adminDb.runTransaction(async (tx) => {
    const snap = await tx.get(counterRef);
    const current = snap.exists ? snap.data().memberSeq || 0 : 0;
    const next = current + 1;
    tx.set(counterRef, { memberSeq: next }, { merge: true });
    return `MBR-${String(next).padStart(5, "0")}`;
  });
}

async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });

  let decoded;
  try {
    decoded = await requireAuth(req);
  } catch (err) {
    return res.status(err.statusCode || 401).json({ error: err.message });
  }

  const { fullName, phone, whatsapp, address, email, referralCode } = req.body || {};
  if (!fullName || !phone || !email) {
    return res.status(400).json({ error: "প্রয়োজনীয় তথ্য অনুপস্থিত।" });
  }

  const memberRef = adminDb.collection("members").doc(decoded.uid);
  const existing = await memberRef.get();
  if (existing.exists) {
    return res.status(409).json({ error: "প্রোফাইল আগে থেকেই তৈরি করা আছে।" });
  }

  // Referral code is entirely optional — an empty field just means no
  // referrer, registration proceeds normally. A NON-empty code, though,
  // must resolve to a real, approved member, or registration is blocked
  // so a typo doesn't silently register someone with no referrer at all.
  let referrer = null;
  const trimmedCode = String(referralCode || "").trim();
  if (trimmedCode) {
    const refSnap = await adminDb.collection("members").where("memberId", "==", trimmedCode).limit(1).get();
    if (refSnap.empty || refSnap.docs[0].data().status !== "active" || refSnap.docs[0].id === decoded.uid) {
      return res.status(400).json({ error: "Member Code সঠিক নয়। সঠিক Code দিন, অথবা খালি রেখে দিন।" });
    }
    referrer = { id: refSnap.docs[0].id, code: trimmedCode };
  }

  const memberId = await nextMemberId();
  const now = new Date().toISOString();

  // status/role are always set here, server-side — the client can never
  // choose to register itself as active or as an admin. Same for the
  // referral link: the browser only ever sends a CODE, never a member ID —
  // we look up and store the real internal ID ourselves.
  await memberRef.set({
    memberId,
    fullName,
    email,
    phone,
    whatsapp: whatsapp || "",
    address: address || "",
    role: "member",
    status: "pending",
    createdAt: now,
    totalSales: 0,
    totalOrders: 0,
    totalProfitEarned: 0,
    availableBalance: 0,
    referredByMemberId: referrer ? referrer.id : null,
    referredByMemberCode: referrer ? referrer.code : null,
    referralAssignedAt: referrer ? now : null,
    firstSaleCompleted: false,
    referralCommissionPaid: false,
    referralCount: 0,
    referralFirstSalesCount: 0,
    referralEarnings: 0,
  });

  if (referrer) {
    await adminDb.collection("members").doc(referrer.id).update({
      referralCount: FieldValue.increment(1),
    });
  }

  await notifyAdmins({
    type: "new_registration",
    message: `${fullName} নতুন রেজিস্ট্রেশন করেছে (${memberId}), অ্যাপ্রুভালের অপেক্ষায়।`,
    link: "/admin/members",
  });

  return res.status(201).json({ memberId });
}

export default withErrorHandling(handler);
