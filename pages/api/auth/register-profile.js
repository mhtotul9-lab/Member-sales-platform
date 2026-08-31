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

  const { fullName, phone, whatsapp, address, email } = req.body || {};
  if (!fullName || !phone || !email) {
    return res.status(400).json({ error: "প্রয়োজনীয় তথ্য অনুপস্থিত।" });
  }

  const memberRef = adminDb.collection("members").doc(decoded.uid);
  const existing = await memberRef.get();
  if (existing.exists) {
    return res.status(409).json({ error: "প্রোফাইল আগে থেকেই তৈরি করা আছে।" });
  }

  const memberId = await nextMemberId();

  // status/role are always set here, server-side — the client can never
  // choose to register itself as active or as an admin.
  await memberRef.set({
    memberId,
    fullName,
    email,
    phone,
    whatsapp: whatsapp || "",
    address: address || "",
    role: "member",
    status: "pending",
    createdAt: new Date().toISOString(),
    totalSales: 0,
    totalOrders: 0,
    totalProfitEarned: 0,
    availableBalance: 0,
  });

  await notifyAdmins({
    type: "new_registration",
    message: `${fullName} নতুন রেজিস্ট্রেশন করেছে (${memberId}), অ্যাপ্রুভালের অপেক্ষায়।`,
    link: "/admin/dashboard",
  });

  return res.status(201).json({ memberId });
}

export default withErrorHandling(handler);
