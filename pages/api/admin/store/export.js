import { adminDb } from "../../../../lib/firebaseAdmin";
import { withErrorHandling } from "../../../../lib/apiWrapper";
import { guardAdmin } from "../../../../lib/store/adminApi";
import { dhakaDateISO } from "../../../../lib/store/server";

function esc(v) {
  const s = String(v ?? "");
  return /[",\n\r]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

// GET /api/admin/store/export?status=delivered&from=2026-10-01&to=2026-10-31
// কলাম: date, source, partnerName, productName, sellPrice, productCost, adSpend, commissionType, commissionValue, commissionAmount, note
async function handler(req, res) {
  if (!(await guardAdmin(req, res))) return;
  const { status = "delivered", from, to } = req.query;
  const snap = await adminDb.collection("store_orders").orderBy("createdAt", "desc").limit(2000).get();
  let orders = snap.docs.map((d) => d.data());
  if (status !== "all") orders = orders.filter((o) => o.status === status);
  if (from) orders = orders.filter((o) => dhakaDateISO(new Date(o.createdAt)) >= from);
  if (to) orders = orders.filter((o) => dhakaDateISO(new Date(o.createdAt)) <= to);

  const header = ["date", "source", "partnerName", "productName", "sellPrice", "productCost", "adSpend", "commissionType", "commissionValue", "commissionAmount", "note"];
  const rows = orders.reverse().map((o) => {
    const it = o.items[0];
    return [
      dhakaDateISO(new Date(o.createdAt)),
      "direct",
      "",
      it.qty > 1 ? `${it.name} x${it.qty}` : it.name,
      o.total, // ডেলিভারি চার্জ সহ যা কাস্টমারের কাছ থেকে নেওয়া হয়
      (it.costPrice || 0) * it.qty,
      0,
      "fixed",
      0,
      0,
      `${o.orderNo} | ${o.customer.name} | ${o.customer.phone}`,
    ];
  });
  const csv = "\uFEFF" + [header, ...rows].map((r) => r.map(esc).join(",")).join("\n");
  res.setHeader("Content-Type", "text/csv; charset=utf-8");
  res.setHeader("Content-Disposition", `attachment; filename="jolrasi-store-orders-${dhakaDateISO()}.csv"`);
  return res.status(200).send(csv);
}

export default withErrorHandling(handler);
