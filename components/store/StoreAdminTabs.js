const TABS = [
  { href: "/admin/store", label: "স্টোর ওভারভিউ", key: "overview" },
  { href: "/admin/store/orders", label: "অর্ডার", key: "orders" },
  { href: "/admin/store/products", label: "প্রোডাক্ট", key: "products" },
  { href: "/admin/store/import", label: "⚡ রিসেলিং থেকে ইম্পোর্ট", key: "import" },
  { href: "/admin/store/settings", label: "স্টোর সেটিংস", key: "settings" },
];

export default function StoreAdminTabs({ active }) {
  return (
    <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 18, alignItems: "center" }}>
      {TABS.map((t) => (
        <a key={t.key} href={t.href} className={`btn btn-sm ${active === t.key ? "btn-teal" : "btn-outline"}`}>{t.label}</a>
      ))}
      <a href="/" target="_blank" rel="noreferrer" className="btn btn-sm btn-outline" style={{ marginLeft: "auto" }}>🛍️ স্টোর দেখুন ↗</a>
    </div>
  );
}
