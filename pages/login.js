import { useState } from "react";
import { useRouter } from "next/router";
import { signInWithEmailAndPassword } from "firebase/auth";
import { auth } from "../lib/firebase";
import Logo from "../components/Logo";

export default function Login() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();
    setError("");
    setSubmitting(true);
    try {
      await signInWithEmailAndPassword(auth, email, password);
      router.replace("/"); // index.js redirects based on status/role
    } catch (err) {
      const code = err?.code || "";
      if (code.includes("invalid-credential") || code.includes("wrong-password") || code.includes("user-not-found")) {
        setError("ইমেইল বা পাসওয়ার্ড সঠিক নয়।");
      } else {
        setError("লগইন করা যায়নি, আবার চেষ্টা করুন।");
      }
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="shell">
      <header className="topbar">
        <a className="brand" href="/" style={{ display: "flex", alignItems: "center", gap: 10 }}><Logo size={32} /></a>
      </header>
      <div className="container" style={{ maxWidth: 420 }}>
        <div className="card">
          <h1 style={{ fontSize: "1.3rem", marginBottom: 22 }}>লগইন করুন</h1>
          <form onSubmit={handleSubmit}>
            <div className="field">
              <label htmlFor="email">ইমেইল</label>
              <input id="email" type="email" required value={email} onChange={(e) => setEmail(e.target.value)} />
            </div>
            <div className="field">
              <label htmlFor="password">পাসওয়ার্ড</label>
              <input id="password" type="password" required value={password} onChange={(e) => setPassword(e.target.value)} />
            </div>
            {error && <p className="error-text">{error}</p>}
            <button className="btn btn-primary" type="submit" disabled={submitting} style={{ width: "100%", marginTop: 6 }}>
              {submitting ? "প্রসেস হচ্ছে..." : "লগইন"}
            </button>
          </form>
          <p className="muted" style={{ marginTop: 18, textAlign: "center" }}>
            অ্যাকাউন্ট নেই? <a href="/register" style={{ color: "var(--teal)", fontWeight: 600 }}>রেজিস্ট্রেশন করুন</a>
          </p>
        </div>
      </div>
    </div>
  );
}
