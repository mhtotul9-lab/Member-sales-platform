import { signOut } from "firebase/auth";
import { useRouter } from "next/router";
import { auth } from "../lib/firebase";

export default function Nav({ role, active }) {
  const router = useRouter();
  const links =
    role === "admin"
      ? [
          { href: "/admin/dashboard", label: "মেম্বার", key: "members" },
          { href: "/admin/products", label: "প্রোডাক্ট", key: "products" },
          { href: "/admin/orders", label: "অর্ডার", key: "orders" },
          { href: "/admin/profit", label: "প্রফিট", key: "profit" },
        ]
      : [
          { href: "/member/dashboard", label: "ড্যাশবোর্ড", key: "dashboard" },
          { href: "/member/products", label: "প্রোডাক্ট", key: "products" },
          { href: "/member/orders", label: "আমার অর্ডার", key: "orders" },
          { href: "/member/wallet", label: "ওয়ালেট", key: "wallet" },
        ];

  return (
    <header className="topbar">
      <div style={{ display: "flex", alignItems: "center", gap: 28 }}>
        <a className="brand" href={role === "admin" ? "/admin/dashboard" : "/member/dashboard"}>
          সেলস<span>পার্টনার</span>
          {role === "admin" && <span style={{ color: "var(--ink-soft)", fontWeight: 500 }}> · অ্যাডমিন</span>}
        </a>
        <nav style={{ display: "flex", gap: 18 }}>
          {links.map((l) => (
            <a
              key={l.key}
              href={l.href}
              style={{
                fontWeight: 600,
                fontSize: "0.92rem",
                color: active === l.key ? "var(--teal)" : "var(--ink-soft)",
              }}
            >
              {l.label}
            </a>
          ))}
        </nav>
      </div>
      <button className="btn btn-outline btn-sm" onClick={() => signOut(auth).then(() => router.replace("/login"))}>
        লগ আউট
      </button>
    </header>
  );
}
