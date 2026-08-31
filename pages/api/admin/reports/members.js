import { requireAdmin, adminDb } from "../../../../lib/firebaseAdmin";
import { toCsv } from "../../../../lib/csv";

const COLUMNS = [
  { key: "memberId", label: "Member ID" },
  { key: "fullName", label: "Name" },
  { key: "email", label: "Email" },
  { key: "phone", label: "Phone" },
  { key: "status", label: "Account Status" },
  { key: "activityStatus", label: "Activity Status" },
  { key: "totalOrders", label: "Total Orders" },
  { key: "totalSales", label: "Total Sales" },
  { key: "totalProfitEarned", label: "Total Profit Earned" },
  { key: "availableBalance", label: "Available Balance" },
  { key: "createdAt", label: "Joined" },
];

export default async function handler(req, res) {
  if (req.method !== "GET") return res.status(405).json({ error: "Method not allowed" });

  try {
    await requireAdmin(req);
  } catch (err) {
    return res.status(err.statusCode || 401).json({ error: err.message });
  }

  const snap = await adminDb.collection("members").where("role", "==", "member").get();
  const rows = snap.docs.map((d) => d.data());
  const csv = toCsv(rows, COLUMNS);

  res.setHeader("Content-Type", "text/csv; charset=utf-8");
  res.setHeader("Content-Disposition", `attachment; filename="members-report.csv"`);
  return res.status(200).send(csv);
}
