import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/router";
import { createUserWithEmailAndPassword } from "firebase/auth";
import { auth } from "../lib/firebase";
import Logo from "../components/Logo";

function FieldIcon({ path }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" dangerouslySetInnerHTML={{ __html: path }} />
  );
}

const ICONS = {
  user: '<circle cx="12" cy="8" r="4"/><path d="M4 21c0-4.4 3.6-7 8-7s8 2.6 8 7"/>',
  mail: '<rect x="2" y="4" width="20" height="16" rx="3"/><path d="m3 7 9 6 9-6"/>',
  phone: '<path d="M22 16.9v3a2 2 0 0 1-2.2 2 19.8 19.8 0 0 1-8.6-3.1 19.5 19.5 0 0 1-6-6A19.8 19.8 0 0 1 2.1 4.2 2 2 0 0 1 4.1 2h3a2 2 0 0 1 2 1.7c.1 1 .3 2 .7 2.9a2 2 0 0 1-.4 2.1L8.1 9.9a16 16 0 0 0 6 6l1.2-1.2a2 2 0 0 1 2.1-.4c.9.4 1.9.6 2.9.7a2 2 0 0 1 1.7 2Z"/>',
  whatsapp: '<path d="M21 11.5a8.5 8.5 0 0 1-12.4 7.5L3 21l2.1-5.4A8.5 8.5 0 1 1 21 11.5Z"/><path d="M8.5 9.5c0 3.5 2.5 6 6 6"/>',
  lock: '<rect x="4" y="10" width="16" height="11" rx="2.5"/><path d="M7.5 10V7a4.5 4.5 0 0 1 9 0v3"/>',
  tag: '<path d="M20.6 12.1 12 20.7a2 2 0 0 1-2.8 0l-6-6a2 2 0 0 1 0-2.8L11.9 3.3a2 2 0 0 1 1.4-.6H19a2 2 0 0 1 2 2v5.9c0 .5-.2 1-.6 1.4Z"/><circle cx="16.5" cy="7.5" r="1.5"/>',
};

export default function Register() {
  const router = useRouter();
  const [form, setForm] = useState({
    fullName: "",
    email: "",
    phone: "",
    whatsapp: "",
    password: "",
    confirmPassword: "",
    address: "",
    referralCode: "",
  });
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [referralCheck, setReferralCheck] = useState(null); // null | "checking" | {valid, firstName}
  const debounceRef = useRef(null);

  function update(field, value) {
    setForm((f) => ({ ...f, [field]: value }));
  }

  useEffect(() => {
    const code = form.referralCode.trim();
    if (debounceRef.current) clearTimeout(debounceRef.current);
    if (!code) { setReferralCheck(null); return; }

    setReferralCheck("checking");
    debounceRef.current = setTimeout(async () => {
      try {
        const res = await fetch(`/api/auth/check-referral-code?code=${encodeURIComponent(code)}`);
        const body = await res.json();
        setReferralCheck(body);
      } catch {
        setReferralCheck({ valid: false });
      }
    }, 500);

    return () => clearTimeout(debounceRef.current);
  }, [form.referralCode]);

  async function handleSubmit(e) {
    e.preventDefault();
    setError("");

    if (form.password !== form.confirmPassword) {
      setError("পাসওয়ার্ড এবং কনফার্ম পাসওয়ার্ড মিলছে না।");
      return;
    }
    if (form.password.length < 6) {
      setError("পাসওয়ার্ড কমপক্ষে ৬ ক্যারেক্টার হতে হবে।");
      return;
    }
    if (form.referralCode.trim() && referralCheck && referralCheck.valid === false) {
      setError("Member Code সঠিক নয় — ঠিক করুন অথবা খালি রেখে দিন।");
      return;
    }

    setSubmitting(true);
    try {
      const cred = await createUserWithEmailAndPassword(auth, form.email, form.password);
      const idToken = await cred.user.getIdToken();

      const res = await fetch("/api/auth/register-profile", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${idToken}` },
        body: JSON.stringify({
          fullName: form.fullName,
          phone: form.phone,
          whatsapp: form.whatsapp,
          address: form.address,
          email: form.email,
          referralCode: form.referralCode.trim(),
        }),
      });

      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.error || "প্রোফাইল তৈরি করা যায়নি।");
      }

      router.replace("/pending");
    } catch (err) {
      setError(mapAuthError(err));
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
          <h2>প্রোডাক্ট বিক্রি করুন, কমিশন আর প্রফিট শেয়ার ঘরে বসেই আয় করুন</h2>
          <p>মার্কেটিং কিট ডাউনলোড করুন, অর্ডার সাবমিট করুন, আর প্রতিটা ভ্যালিড সেল থেকে সরাসরি ওয়ালেটে টাকা পান — রেজিস্ট্রেশন সম্পূর্ণ ফ্রি।</p>
          <div className="auth-visual-stats">
            <div className="auth-visual-stat">
              <b>০৳</b>
              <span>রেজিস্ট্রেশন ফি</span>
            </div>
            <div className="auth-visual-stat">
              <b>রেফারেল</b>
              <span>বোনাসও আছে</span>
            </div>
          </div>
        </div>
      </div>

      <div className="auth-form-panel">
        <div className="auth-form-card" style={{ maxWidth: 440 }}>
          <div className="auth-form-mobile-brand">
            <Logo height={36} />
          </div>

          <h1>মেম্বার রেজিস্ট্রেশন</h1>
          <p className="auth-form-sub">
            ফর্ম পূরণ করার পর আপনার অ্যাকাউন্ট &quot;পেন্ডিং&quot; থাকবে — অ্যাডমিন অ্যাপ্রুভ করলে লগইন করতে পারবেন।
          </p>

          <form onSubmit={handleSubmit}>
            <div className="input-icon-field">
              <label htmlFor="fullName">পূর্ণ নাম</label>
              <div className="input-icon-wrap">
                <FieldIcon path={ICONS.user} />
                <input id="fullName" required value={form.fullName} onChange={(e) => update("fullName", e.target.value)} placeholder="আপনার পূর্ণ নাম" />
              </div>
            </div>

            <div className="input-icon-field">
              <label htmlFor="email">ইমেইল</label>
              <div className="input-icon-wrap">
                <FieldIcon path={ICONS.mail} />
                <input id="email" type="email" required value={form.email} onChange={(e) => update("email", e.target.value)} placeholder="you@example.com" />
              </div>
            </div>

            <div className="input-icon-field">
              <label htmlFor="phone">ফোন নম্বর</label>
              <div className="input-icon-wrap">
                <FieldIcon path={ICONS.phone} />
                <input id="phone" required value={form.phone} onChange={(e) => update("phone", e.target.value)} placeholder="01XXXXXXXXX" />
              </div>
            </div>

            <div className="input-icon-field">
              <label htmlFor="whatsapp">হোয়াটসঅ্যাপ নম্বর</label>
              <div className="input-icon-wrap">
                <FieldIcon path={ICONS.whatsapp} />
                <input id="whatsapp" value={form.whatsapp} onChange={(e) => update("whatsapp", e.target.value)} placeholder="ঐচ্ছিক" />
              </div>
            </div>

            <div className="input-icon-field">
              <label htmlFor="address">ঠিকানা</label>
              <textarea
                id="address"
                rows={2}
                value={form.address}
                onChange={(e) => update("address", e.target.value)}
                style={{
                  width: "100%", padding: "13px 16px", border: "1.5px solid var(--line)", borderRadius: 14,
                  fontFamily: "var(--font-body)", fontSize: "0.98rem", background: "var(--surface)", color: "var(--ink)",
                }}
              />
            </div>

            <div className="input-icon-field">
              <label htmlFor="referralCode">যার মাধ্যমে যুক্ত হয়েছেন তার Member Code (ঐচ্ছিক)</label>
              <div className="input-icon-wrap">
                <FieldIcon path={ICONS.tag} />
                <input
                  id="referralCode"
                  value={form.referralCode}
                  onChange={(e) => update("referralCode", e.target.value.toUpperCase())}
                  placeholder="যেমন: MBR-00012"
                />
              </div>
              <p className="help-text" style={{ marginTop: 6 }}>
                সঠিক Member Code ব্যবহার করুন। রেজিস্ট্রেশন সম্পন্ন হলে এই মেম্বারের সাথে আপনার রেফারেল সম্পর্ক স্থায়ীভাবে যুক্ত হবে। কারো মাধ্যমে না এসে থাকলে খালি রাখুন।
              </p>
              {referralCheck === "checking" && <p className="help-text" style={{ marginTop: 6 }}>চেক করা হচ্ছে...</p>}
              {referralCheck && referralCheck !== "checking" && referralCheck.valid && (
                <p style={{ marginTop: 6, color: "var(--teal)", fontWeight: 600, fontSize: "0.88rem" }}>
                  ✅ Referred By: {referralCheck.firstName}
                </p>
              )}
              {referralCheck && referralCheck !== "checking" && referralCheck.valid === false && (
                <p className="error-text" style={{ marginTop: 6 }}>❌ Invalid Member Code</p>
              )}
            </div>

            <div className="input-icon-field">
              <label htmlFor="password">পাসওয়ার্ড</label>
              <div className="input-icon-wrap">
                <FieldIcon path={ICONS.lock} />
                <input
                  id="password"
                  type={showPassword ? "text" : "password"}
                  required
                  value={form.password}
                  onChange={(e) => update("password", e.target.value)}
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

            <div className="input-icon-field">
              <label htmlFor="confirmPassword">কনফার্ম পাসওয়ার্ড</label>
              <div className="input-icon-wrap">
                <FieldIcon path={ICONS.lock} />
                <input id="confirmPassword" type={showPassword ? "text" : "password"} required value={form.confirmPassword} onChange={(e) => update("confirmPassword", e.target.value)} placeholder="••••••••" />
              </div>
            </div>

            {error && <p className="error-text">{error}</p>}

            <button className="auth-submit-btn btn" type="submit" disabled={submitting}>
              {submitting ? "প্রসেস হচ্ছে..." : "রেজিস্ট্রেশন সম্পন্ন করুন"}
            </button>
          </form>

          <p className="muted" style={{ marginTop: 22, textAlign: "center" }}>
            আগে থেকে অ্যাকাউন্ট আছে? <a href="/login" style={{ color: "var(--teal)", fontWeight: 700 }}>লগইন করুন</a>
          </p>
        </div>
      </div>
    </div>
  );
}

function mapAuthError(err) {
  const code = err?.code || "";
  if (code.includes("email-already-in-use")) return "এই ইমেইল দিয়ে আগেই অ্যাকাউন্ট আছে।";
  if (code.includes("invalid-email")) return "সঠিক ইমেইল ঠিকানা দিন।";
  if (code.includes("weak-password")) return "পাসওয়ার্ড খুবই দুর্বল, আরও শক্তিশালী পাসওয়ার্ড দিন।";
  return err.message || "কিছু একটা সমস্যা হয়েছে, আবার চেষ্টা করুন।";
}
