import { requireAdmin, adminDb } from "../../../../lib/firebaseAdmin";
import { toCsv } from "../../../../lib/csv";
import { withErrorHandling } from "../../../../lib/apiWrapper";

const COLUMNS = [
  { key: "memberName", label: "Member" },
  { key: "amount", label: "Amount" },
  { key: "method", label: "Method" },
  { key: "accountNumber", label: "Account Number" },
  { key: "status", label: "Status" },
  { key: "paymentReference", label: "Payment Reference" },
  { key: "requestedAt", label: "Requested At" },
  { key: "paidAt", label: "Paid At" },
];

async function handler(req, res) {
  if (req.method !== "GET") return res.status(405).json({ error: "Method not allowed" });

  try {
    await requireAdmin(req);
  } catch (err) {
    return res.status(err.statusCode || 401).json({ error: err.message });
  }

  const snap = await adminDb.collection("withdrawals").orderBy("requestedAt", "desc").limit(2000).get();
  const rows = snap.docs.map((d) => d.data());
  const csv = toCsv(rows, COLUMNS);

  res.setHeader("Content-Type", "text/csv; charset=utf-8");
  res.setHeader("Content-Disposition", `attachment; filename="withdrawals-report.csv"`);
  return res.status(200).send(csv);
}

export default withErrorHandling(handler);
