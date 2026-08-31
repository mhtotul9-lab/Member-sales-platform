import { useEffect, useState } from "react";
import { useRouter } from "next/router";
import { useAuth } from "../../contexts/AuthContext";
import Nav from "../../components/Nav";

const REPORTS = [
  { key: "orders", label: "সেলস/অর্ডার রিপোর্ট", url: "/api/admin/reports/orders", filename: "orders-report.csv" },
  { key: "members", label: "মেম্বার রিপোর্ট", url: "/api/admin/reports/members", filename: "members-report.csv" },
  { key: "withdrawals", label: "উইথড্র রিপোর্ট", url: "/api/admin/reports/withdrawals", filename: "withdrawals-report.csv" },
];

export default function AdminReports() {
  const { user, profile, loading } = useAuth();
  const router = useRouter();
  const [downloading, setDownloading] = useState(null);
  const [error, setError] = useState("");

  useEffect(() => {
    if (loading) return;
    if (!user) { router.replace("/login"); return; }
    if (!profile || profile.status !== "active") { router.replace("/pending"); return; }
    if (profile.role !== "admin") { router.replace("/member/dashboard"); return; }
  }, [user, profile, loading, router]);

  async function download(report) {
    setError("");
    setDownloading(report.key);
    try {
      const token = await user.getIdToken();
      const res = await fetch(report.url, { headers: { Authorization: `Bearer ${token}` } });
      if (!res.ok) throw new Error("রিপোর্ট তৈরি করা যায়নি।");
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = report.filename;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
    } catch (err) {
      setError(err.message);
    } finally {
      setDownloading(null);
    }
  }

  if (loading || !profile) return null;

  return (
    <div className="shell">
      <Nav role="admin" active="reports" />
      <div className="container" style={{ maxWidth: 520 }}>
        <div className="card">
          <h1 style={{ fontSize: "1.25rem", marginBottom: 6 }}>রিপোর্ট</h1>
          <p className="muted" style={{ marginBottom: 20 }}>CSV ফাইল হিসেবে ডাউনলোড হবে — Excel/Google Sheets-এ খোলা যাবে।</p>

          {error && <p className="error-text">{error}</p>}

          {REPORTS.map((r) => (
            <div className="list-row" key={r.key}>
              <div style={{ fontWeight: 600 }}>{r.label}</div>
              <button className="btn btn-outline btn-sm" disabled={downloading === r.key} onClick={() => download(r)}>
                {downloading === r.key ? "তৈরি হচ্ছে..." : "ডাউনলোড"}
              </button>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
