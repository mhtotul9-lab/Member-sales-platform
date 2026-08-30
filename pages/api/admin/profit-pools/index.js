import { requireAdmin, adminDb } from "../../../../lib/firebaseAdmin";

export default async function handler(req, res) {
  if (req.method !== "GET") return res.status(405).json({ error: "Method not allowed" });

  try {
    await requireAdmin(req);
  } catch (err) {
    return res.status(err.statusCode || 401).json({ error: err.message });
  }

  const snap = await adminDb.collection("profitPools").orderBy("createdAt", "desc").limit(100).get();
  const pools = snap.docs.map((d) => ({ id: d.id, ...d.data() }));

  const totals = pools.reduce(
    (acc, p) => {
      acc.totalPoolAmount += p.poolAmount || 0;
      if (p.distributed) acc.totalDistributed += p.poolAmount || 0;
      return acc;
    },
    { totalPoolAmount: 0, totalDistributed: 0 }
  );

  return res.status(200).json({ pools, totals });
}
