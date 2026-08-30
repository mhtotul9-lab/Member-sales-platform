import { requireActiveMember, adminDb } from "../../../../lib/firebaseAdmin";
import { getSettings, isMemberActive } from "../../../../lib/business";

export default async function handler(req, res) {
  if (req.method !== "GET") return res.status(405).json({ error: "Method not allowed" });

  let auth;
  try {
    auth = await requireActiveMember(req);
  } catch (err) {
    return res.status(err.statusCode || 401).json({ error: err.message });
  }
  const { decoded, profile } = auth;

  const settings = await getSettings();
  const active = await isMemberActive(decoded.uid, settings);

  // Cache the result on the member doc so admin lists and the dashboard can
  // show it without recomputing on every render — refreshed here each time
  // the member opens their wallet.
  await adminDb.collection("members").doc(decoded.uid).update({
    activityStatus: active ? "active" : "inactive",
    activityCheckedAt: new Date().toISOString(),
  });

  const txnSnap = await adminDb
    .collection("transactions")
    .where("memberId", "==", decoded.uid)
    .orderBy("createdAt", "desc")
    .limit(100)
    .get();
  const transactions = txnSnap.docs.map((d) => ({ id: d.id, ...d.data() }));

  return res.status(200).json({
    activityStatus: active ? "active" : "inactive",
    activeDays: settings.activeDays,
    availableBalance: profile.availableBalance || 0,
    totalProfitEarned: profile.totalProfitEarned || 0,
    totalSales: profile.totalSales || 0,
    totalOrders: profile.totalOrders || 0,
    transactions,
  });
}
