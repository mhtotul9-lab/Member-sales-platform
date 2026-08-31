import { useState } from "react";
import { useRouter } from "next/router";
import { createUserWithEmailAndPassword } from "firebase/auth";
import { auth } from "../lib/firebase";
import Logo from "../components/Logo";

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
  });
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  function update(field, value) {
    setForm((f) => ({ ...f, [field]: value }));
  }

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
    <div className="shell">
      <header className="topbar">
        <a className="brand" href="/" style={{ display: "flex", alignItems: "center", gap: 10 }}><Logo size={28} />সেলস<span>পার্টনার</span></a>
      </header>
      <div className="container" style={{ maxWidth: 520 }}>
        <div className="card">
          <h1 style={{ fontSize: "1.3rem", marginBottom: 4 }}>মেম্বার রেজিস্ট্রেশন</h1>
          <p className="muted" style={{ marginBottom: 24 }}>
            ফর্ম পূরণ করার পর আপনার অ্যাকাউন্ট &quot;পেন্ডিং&quot; থাকবে — অ্যাডমিন অ্যাপ্রুভ করলে লগইন করতে পারবেন।
          </p>
          <form onSubmit={handleSubmit}>
            <div className="field">
              <label htmlFor="fullName">পূর্ণ নাম</label>
              <input id="fullName" required value={form.fullName} onChange={(e) => update("fullName", e.target.value)} />
            </div>
            <div className="field">
              <label htmlFor="email">ইমেইল</label>
              <input id="email" type="email" required value={form.email} onChange={(e) => update("email", e.target.value)} />
            </div>
            <div className="field">
              <label htmlFor="phone">ফোন নম্বর</label>
              <input id="phone" required value={form.phone} onChange={(e) => update("phone", e.target.value)} />
            </div>
            <div className="field">
              <label htmlFor="whatsapp">হোয়াটসঅ্যাপ নম্বর</label>
              <input id="whatsapp" value={form.whatsapp} onChange={(e) => update("whatsapp", e.target.value)} />
            </div>
            <div className="field">
              <label htmlFor="address">ঠিকানা</label>
              <textarea id="address" rows={2} value={form.address} onChange={(e) => update("address", e.target.value)} />
            </div>
            <div className="field">
              <label htmlFor="password">পাসওয়ার্ড</label>
              <input id="password" type="password" required value={form.password} onChange={(e) => update("password", e.target.value)} />
            </div>
            <div className="field">
              <label htmlFor="confirmPassword">কনফার্ম পাসওয়ার্ড</label>
              <input id="confirmPassword" type="password" required value={form.confirmPassword} onChange={(e) => update("confirmPassword", e.target.value)} />
            </div>

            {error && <p className="error-text">{error}</p>}

            <button className="btn btn-primary" type="submit" disabled={submitting} style={{ width: "100%", marginTop: 6 }}>
              {submitting ? "প্রসেস হচ্ছে..." : "রেজিস্ট্রেশন সম্পন্ন করুন"}
            </button>
          </form>
          <p className="muted" style={{ marginTop: 18, textAlign: "center" }}>
            আগে থেকে অ্যাকাউন্ট আছে? <a href="/login" style={{ color: "var(--teal)", fontWeight: 600 }}>লগইন করুন</a>
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
