import { useEffect } from "react";
import { useRouter } from "next/router";
import { useAuth } from "../contexts/AuthContext";
import Logo from "../components/Logo";

const FEATURES = [
  {
    icon: '<path d="M12 2 2 7l10 5 10-5-10-5Z"/><path d="M2 17l10 5 10-5"/><path d="M2 12l10 5 10-5"/>',
    title: "কোনো পুঁজি লাগবে না",
    desc: "নিজের স্টক কিনতে হবে না, প্যাকেজিং-ডেলিভারি নিয়ে ভাবতে হবে না — শুধু বিক্রি করুন, বাকিটা আমরা দেখব।",
  },
  {
    icon: '<rect x="3" y="3" width="18" height="18" rx="3"/><path d="M9 9h6v6H9z"/>',
    title: "রেডি মার্কেটিং কিট",
    desc: "প্রতিটা প্রোডাক্টের ছবি, ভিডিও, ক্যাপশন আগে থেকেই তৈরি — এক ক্লিকে ডাউনলোড করে সরাসরি শেয়ার করুন।",
  },
  {
    icon: '<path d="M3 3v18h18"/><path d="m19 9-5 5-4-4-4 4"/>',
    title: "রিয়েল-টাইম আয়ের হিসাব",
    desc: "কোন প্রোডাক্ট বিক্রি হলো, কত প্রফিট পেলেন — সব লাইভ দেখুন, লুকানো কোনো হিসাব নেই।",
  },
  {
    icon: '<circle cx="9" cy="7" r="4"/><path d="M2 21c0-3.9 3.1-7 7-7s7 3.1 7 7"/><circle cx="18" cy="7" r="3"/><path d="M22 21c0-2.8-1.8-5.1-4.3-5.9"/>',
    title: "রেফারেল বোনাস",
    desc: "বন্ধুকে যুক্ত করুন, সে প্রথম সফল সেল করলেই আপনি পাবেন এক্সট্রা বোনাস — আয়ের নতুন একটা পথ।",
  },
  {
    icon: '<rect x="2" y="6" width="20" height="12" rx="2"/><path d="M2 10h20"/>',
    title: "সহজে টাকা তোলা",
    desc: "বিকাশ, নগদ বা রকেটে সরাসরি উইথড্র রিকোয়েস্ট করুন — অ্যাডমিন অ্যাপ্রুভ করলেই টাকা হাতে।",
  },
  {
    icon: '<path d="M12 2 2 7l10 5 10-5-10-5Z"/><path d="M12 12v10"/><path d="m4.5 9.5 0 6L12 19l7.5-3.5v-6"/>',
    title: "ফ্রি ট্রেনিং সাপোর্ট",
    desc: "কীভাবে মার্কেটিং করবেন, কীভাবে অর্ডার সংগ্রহ করবেন — স্টেপ বাই স্টেপ ট্রেনিং মডিউল থাকছে সাথে।",
  },
];

export default function Home() {
  const { user, profile, loading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (loading) return;
    if (!user) return; // stay on landing, show login/register links
    if (!profile) return; // profile doc still loading or missing
    if (profile.status === "pending") router.replace("/pending");
    else if (profile.status !== "active") router.replace("/pending");
    else if (profile.role === "admin") router.replace("/admin/dashboard");
    else router.replace("/member/dashboard");
  }, [user, profile, loading, router]);

  return (
    <div className="landing">
      <nav className="landing-nav">
        <Logo height={34} />
        <div className="landing-nav-links">
          <a href="#how">কীভাবে কাজ করে</a>
          <a href="#why">কেন জলরাশি</a>
        </div>
        <a href="/login" className="landing-btn-outline" style={{ padding: "10px 22px", fontSize: "0.9rem" }}>লগইন</a>
      </nav>

      <section className="landing-hero">
        <div className="landing-hero-copy">
          <h1>
            বিনা পুঁজিতে প্রোডাক্ট বিক্রি করে{" "}
            <span className="landing-accent-teal">আয়</span> করুন
          </h1>
          <p>
            জলরাশির মেম্বার হয়ে প্রোডাক্ট মার্কেটিং করুন, অর্ডার সংগ্রহ করুন, আর প্রতিটা ভ্যালিড সেল থেকে সরাসরি নিজের ওয়ালেটে প্রফিট নিন। রেজিস্ট্রেশন সম্পূর্ণ ফ্রি, কোনো স্টক রাখতে হবে না।
          </p>
          <div className="landing-cta-row">
            <a href="/register" className="landing-btn-primary">মেম্বার হিসেবে যুক্ত হন →</a>
            <a href="/login" className="landing-btn-outline">লগইন করুন</a>
          </div>
          <div className="landing-reputation">
            <div>
              <b>০৳</b>
              <span>রেজিস্ট্রেশন ফি</span>
            </div>
            <div>
              <b>১০০%</b>
              <span>ফ্রি মার্কেটিং কিট</span>
            </div>
            <div>
              <b>দ্রুত</b>
              <span>প্রফিট পেআউট</span>
            </div>
          </div>
        </div>

        <div className="landing-visual">
          <div className="landing-visual-card">
            <h3>কীভাবে শুরু করবেন</h3>
            <div className="landing-visual-step">
              <div className="landing-visual-step-num">১</div>
              <div>প্রোডাক্ট বেছে মার্কেটিং কিট ডাউনলোড করুন</div>
            </div>
            <div className="landing-visual-step">
              <div className="landing-visual-step-num">২</div>
              <div>Facebook/WhatsApp-এ শেয়ার করে অর্ডার নিন</div>
            </div>
            <div className="landing-visual-step">
              <div className="landing-visual-step-num">৩</div>
              <div>অর্ডার সাবমিট করুন, অ্যাপ্রুভ হলেই প্রফিট আপনার</div>
            </div>
          </div>
        </div>
      </section>

      <section className="landing-section" id="why">
        <h2 className="landing-section-title">কেন জলরাশি পার্টনার</h2>
        <p className="landing-section-sub">
          একটা সহজ, স্বচ্ছ সিস্টেম — যেখানে আপনার প্রতিটা সেল আর প্রতিটা টাকার হিসাব আপনি নিজেই দেখতে পাবেন।
        </p>
        <div className="landing-grid">
          {FEATURES.map((f) => (
            <div className="landing-feature-card" key={f.title}>
              <div className="landing-feature-icon">
                <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" dangerouslySetInnerHTML={{ __html: f.icon }} />
              </div>
              <h3>{f.title}</h3>
              <p>{f.desc}</p>
            </div>
          ))}
        </div>
      </section>

      <div className="landing-final-cta" id="how">
        <h2>আজই জলরাশি পার্টনার হয়ে যান</h2>
        <p>রেজিস্ট্রেশন করতে ২ মিনিটও লাগবে না — অ্যাডমিন অ্যাপ্রুভ করলেই আপনি বিক্রি শুরু করতে পারবেন।</p>
        <a href="/register" className="landing-btn-primary">এখনই রেজিস্ট্রেশন করুন →</a>
      </div>

      <footer className="landing-footer">
        © {new Date().getFullYear()} Jolrasi Partner — সব অধিকার সংরক্ষিত
      </footer>
    </div>
  );
}
