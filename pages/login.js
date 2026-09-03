import { useState } from "react";
import { useRouter } from "next/router";
import { signInWithEmailAndPassword } from "firebase/auth";
import { auth } from "../lib/firebase";
import Logo from "../components/Logo";

export default function Login() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
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
    <div className="auth-shell">
      <div className="auth-visual">
        <div className="auth-blob auth-blob-1" />
        <div className="auth-blob auth-blob-2" />
        <div className="auth-blob auth-blob-3" />
        <div className="auth-visual-inner">
          <div className="auth-visual-badge">
            <Logo height={40} />
          </div>
          <h2>আপনার সেলস আর কমিশনের পুরো হিসাব, এক জায়গায়</h2>
          <p>প্রোডাক্ট বিক্রি করুন, কমিশন আর প্রফিট শেয়ার ট্র্যাক করুন, আর রেফারেল দিয়ে আয় বাড়ান — সব একটাই ড্যাশবোর্ডে।</p>
          <div className="auth-visual-stats">
            <div className="auth-visual-stat">
              <b>০%</b>
              <span>রেজিস্ট্রেশন ফি</span>
            </div>
            <div className="auth-visual-stat">
              <b>দ্রুত</b>
              <span>অ্যাপ্রুভাল ও পেআউট</span>
            </div>
          </div>
        </div>
      </div>

      <div className="auth-form-panel">
        <div className="auth-form-card">
          <div className="auth-form-mobile-brand">
            <Logo height={36} />
          </div>

          <h1>স্বাগতম ফিরে আসার জন্য</h1>
          <p className="auth-form-sub">আপনার অ্যাকাউন্টে লগইন করুন</p>

          <form onSubmit={handleSubmit}>
            <div className="input-icon-field">
              <label htmlFor="email">ইমেইল</label>
              <div className="input-icon-wrap">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <rect x="2" y="4" width="20" height="16" rx="3" />
                  <path d="m3 7 9 6 9-6" />
                </svg>
                <input id="email" type="email" required autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@example.com" />
              </div>
            </div>

            <div className="input-icon-field">
              <label htmlFor="password">পাসওয়ার্ড</label>
              <div className="input-icon-wrap">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <rect x="4" y="10" width="16" height="11" rx="2.5" />
                  <path d="M7.5 10V7a4.5 4.5 0 0 1 9 0v3" />
                </svg>
                <input
                  id="password"
                  type={showPassword ? "text" : "password"}
                  required
                  autoComplete="current-password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  style={{ paddingRight: 44 }}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((v) => !v)}
                  aria-label={showPassword ? "পাসওয়ার্ড লুকান" : "পাসওয়ার্ড দেখান"}
                  style={{ position: "absolute", right: 13, background: "none", border: "none", padding: 4, cursor: "pointer", color: "var(--ink-soft)", display: "flex" }}
                >
                  {showPassword ? (
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M17.94 17.94A10.94 10.94 0 0 1 12 20c-7 0-10-8-10-8a18.6 18.6 0 0 1 4.22-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 10 8 10 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24" />
                      <path d="m1 1 22 22" />
                    </svg>
                  ) : (
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M1 12s3-8 11-8 11 8 11 8-3 8-11 8-11-8-11-8Z" />
                      <circle cx="12" cy="12" r="3" />
                    </svg>
                  )}
                </button>
              </div>
            </div>

            {error && <p className="error-text">{error}</p>}

            <button className="auth-submit-btn btn" type="submit" disabled={submitting}>
              {submitting ? "প্রসেস হচ্ছে..." : "লগইন করুন"}
            </button>
          </form>

          <p className="muted" style={{ marginTop: 22, textAlign: "center" }}>
            অ্যাকাউন্ট নেই? <a href="/register" style={{ color: "var(--teal)", fontWeight: 700 }}>রেজিস্ট্রেশন করুন</a>
          </p>
        </div>
      </div>
    </div>
  );
}
