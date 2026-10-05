import { requireAdmin, adminDb } from "../../../../lib/firebaseAdmin";
import { toCsv } from "../../../../lib/csv";
import { withErrorHandling } from "../../../../lib/apiWrapper";

const COLUMNS = [
  { key: "orderId", label: "Order ID" },
  { key: "createdAt", label: "Date" },
  { key: "memberName", label: "Member" },
  { key: "productName", label: "Product" },
  { key: "quantity", label: "Qty" },
  { key: "orderAmount", label: "Amount" },
  { key: "profitAtOrder", label: "Company Profit" },
  { key: "commissionAtOrder", label: "Member Commission" },
  { key: "customerName", label: "Customer" },
  { key: "customerPhone", label: "Phone" },
  { key: "marketingSource", label: "Source" },
  { key: "status", label: "Status" },
];

async function handler(req, res) {
  if (req.method !== "GET") return res.status(405).json({ error: "Method not allowed" });

  try {
    await requireAdmin(req);
  } catch (err) {
    return res.status(err.statusCode || 401).json({ error: err.message });
  }

  const { status, from, to } = req.query;
  let query = adminDb.collection("orders").orderBy("createdAt", "desc");
  if (status) query = query.where("status", "==", status);
  if (from) query = query.where("createdAt", ">=", new Date(from).toISOString());
  if (to) query = query.where("createdAt", "<=", new Date(to).toISOString());

  const snap = await query.limit(2000).get();
  const rows = snap.docs.map((d) => d.data());
  const csv = toCsv(rows, COLUMNS);

  res.setHeader("Content-Type", "text/csv; charset=utf-8");
  res.setHeader("Content-Disposition", `attachment; filename="orders-report.csv"`);
  return res.status(200).send(csv);
}

export default withErrorHandling(handler);
