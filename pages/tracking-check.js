import { useEffect, useState, useCallback } from "react";
import Head from "next/head";
import StoreLayout from "../components/store/StoreLayout";
import s from "../styles/store.module.css";
import { getSettings } from "../lib/store/server";
import { GTM_ID, PIXEL_ID, TRACKING_MODE, track, newEventId } from "../lib/store/pixel";

export async function getServerSideProps({ res }) {
  res.setHeader("Cache-Control", "no-store");
  return { props: { settings: await getSettings() } };
}

// ট্র্যাকিং পরীক্ষা: GTM লোড হলো কিনা, কোন Pixel ID তে কী কী ইভেন্ট গেল — ব্রাউজারেই দেখায়।
function scan() {
  const res = performance.getEntriesByType("resource").map((e) => e.name);
  const fbHits = res.filter((u) => /facebook\.com\/tr/.test(u)).map((u) => { try { const q = new URL(u).searchParams; return { id: q.get("id"), ev: q.get("ev") }; } catch (e) { return null; } }).filter(Boolean);
  const ga = [...new Set(res.filter((u) => /\/g\/collect|google-analytics\.com\/(g|j)\//.test(u)).map((u) => { try { return new URL(u).host; } catch (e) { return ""; } }))];
  let pixels = [];
  try { pixels = window.fbq && window.fbq.getState ? (window.fbq.getState().pixels || []).map((p) => String(p.id)) : []; } catch (e) {}
  return {
    gtmScript: res.some((u) => u.includes("googletagmanager.com/gtm.js")),
    gtmReady: !!(window.google_tag_manager && window.google_tag_manager[GTM_ID]),
    fbqLoaded: typeof window.fbq === "function",
    pixels,
    fbHits,
    tiktok: res.filter((u) => /analytics\.tiktok\.com/.test(u)).length,
    ga,
    events: (window.dataLayer || []).filter((d) => d && d.event && !String(d.event).startsWith("gtm.")).map((d) => d.event),
  };
}

const Row = ({ ok, title, children }) => (
  <div style={{ display: "flex", gap: 10, padding: "10px 0", borderBottom: "1px solid #e6ded2" }}>
    <span style={{ fontSize: "1.2rem" }}>{ok === true ? "✅" : ok === false ? "❌" : "ℹ️"}</span>
    <div style={{ flex: 1, minWidth: 0 }}><b>{title}</b><div style={{ fontSize: ".88rem", color: "#4a4650", wordBreak: "break-word" }}>{children}</div></div>
  </div>
);

export default function TrackingCheck({ settings }) {
  const [r, setR] = useState(null);
  const [blocked, setBlocked] = useState({});
  const [testMsg, setTestMsg] = useState("");

  const run = useCallback(() => setR(scan()), []);

  useEffect(() => {
    const t = setTimeout(run, 3500);
    // ব্লকার/অ্যাড-ব্লকার ধরা
    const probe = (url) => fetch(url, { mode: "no-cors" }).then(() => false).catch(() => true);
    Promise.all([probe("https://www.googletagmanager.com/gtm.js?id=" + GTM_ID), probe("https://connect.facebook.net/en_US/fbevents.js")]).then(([g, f]) => setBlocked({ gtm: g, fb: f }));
    return () => clearTimeout(t);
  }, [run]);

  function sendTest() {
    const before = scan().fbHits.filter((h) => h.ev === "ViewContent").length;
    setTestMsg("টেস্ট ইভেন্ট পাঠানো হচ্ছে...");
    track("ViewContent", { content_ids: ["TEST"], content_name: "TEST (ট্র্যাকিং পরীক্ষা)", content_type: "product", value: 1, currency: "BDT", contents: [{ id: "TEST", quantity: 1, item_price: 1 }] }, newEventId());
    setTimeout(() => {
      const now = scan();
      setR(now);
      const after = now.fbHits.filter((h) => h.ev === "ViewContent").length;
      setTestMsg(after > before ? "✅ view_item ইভেন্টে GTM থেকে Facebook Pixel এ রিকোয়েস্ট গেছে।" : "❌ ইভেন্ট dataLayer এ গেছে কিন্তু Facebook Pixel এ রিকোয়েস্ট যায়নি — GTM এর ViewContent ট্যাগ ফায়ার হচ্ছে না (Preview মোডে দেখুন)।");
    }, 3000);
  }

  const wantPixelOk = r && r.pixels.includes(PIXEL_ID);
  return (
    <StoreLayout settings={settings} title="ট্র্যাকিং পরীক্ষা" hideFooter>
      <Head><meta name="robots" content="noindex,nofollow" /></Head>
      <div className={s.wrap}>
        <div className={s.success} style={{ textAlign: "left", maxWidth: 680 }}>
          <h1 style={{ margin: "0 0 4px", fontSize: "1.3rem" }}>🔎 ট্র্যাকিং পরীক্ষা</h1>
          <p style={{ margin: "0 0 12px", fontSize: ".88rem", color: "#6B6671" }}>মোড: <b>{TRACKING_MODE}</b> · GTM: <b>{GTM_ID}</b> · আপনার Pixel: <b>{PIXEL_ID}</b>। পেজ খোলার ৪ সেকেন্ড পর ফলাফল আসে।</p>
          {!r ? <p>পরীক্ষা চলছে...</p> : (
            <>
              <Row ok={r.gtmScript && r.gtmReady} title="GTM কন্টেইনার লোড হয়েছে?">{r.gtmScript && r.gtmReady ? "হ্যাঁ, GTM চলছে।" : "না। GTM লোড হয়নি — নিচের ব্লকার লাইন দেখুন, না থাকলে Vercel এ NEXT_PUBLIC_TRACKING_MODE=direct আছে কিনা দেখুন।"}</Row>
              <Row ok={r.fbqLoaded} title="Facebook Pixel স্ক্রিপ্ট (fbq) লোড হয়েছে?">{r.fbqLoaded ? "হ্যাঁ।" : "না — GTM এ Facebook Pixel ট্যাগ ফায়ার হয়নি, অথবা ব্লক হয়েছে।"}</Row>
              <Row ok={r.fbqLoaded ? wantPixelOk : null} title="কোন Pixel ID চালু আছে?">{r.pixels.length ? r.pixels.join(", ") : "কোনোটাই নয়"}{r.fbqLoaded && !wantPixelOk && <><br /><b style={{ color: "#B3261E" }}>এখানে {PIXEL_ID} নেই! GTM আপনার চাওয়া Pixel এ নয়, অন্য Pixel এ পাঠাচ্ছে। GTM এ “FB PIxel ID” ভ্যারিয়েবলের মান দেখুন।</b></>}</Row>
              <Row ok={r.fbHits.length > 0} title="Facebook এ পাঠানো রিকোয়েস্ট">{r.fbHits.length ? r.fbHits.map((h, i) => <div key={i}>Pixel {h.id} ← {h.ev}</div>) : "এখনো কিছু যায়নি।"}</Row>
              <Row ok={r.ga.length > 0 ? true : null} title="GA4 / সার্ভার কন্টেইনারে রিকোয়েস্ট (হোস্ট)">{r.ga.length ? r.ga.join(", ") : "কোনো রিকোয়েস্ট দেখা যায়নি।"}{r.ga.length > 0 && <><br />এই হোস্টটাই আপনার সার্ভার-সাইড GTM এর ডোমেইন হওয়ার কথা। Namecheap DNS এ এই সাবডোমেইনের রেকর্ড আছে কিনা মিলিয়ে দেখুন।</>}</Row>
              <Row ok={null} title="TikTok রিকোয়েস্ট">{r.tiktok}টি</Row>
              <Row ok={null} title="dataLayer এ ইভেন্ট">{r.events.join(", ") || "নেই"}</Row>
              <Row ok={blocked.gtm === undefined ? null : !blocked.gtm && !blocked.fb} title="ব্রাউজার ব্লকার">{blocked.gtm === undefined ? "চেক হচ্ছে..." : blocked.gtm || blocked.fb ? `${blocked.gtm ? "GTM " : ""}${blocked.fb ? "Facebook " : ""}স্ক্রিপ্ট ব্লক হচ্ছে — Brave Shields/অ্যাড-ব্লকার বন্ধ করে (বা ইনকগনিটো/অন্য ব্রাউজারে) আবার দেখুন।` : "কোনো ব্লকার নেই।"}</Row>
            </>
          )}
          <div style={{ display: "flex", gap: 10, flexWrap: "wrap", marginTop: 16 }}>
            <button className={s.submit} style={{ width: "auto", padding: "12px 20px", fontSize: ".95rem" }} onClick={run}>🔄 আবার চেক</button>
            <button className={s.submit} style={{ width: "auto", padding: "12px 20px", fontSize: ".95rem", background: "#12213B" }} onClick={sendTest}>🧪 টেস্ট ইভেন্ট পাঠান</button>
          </div>
          {testMsg && <p style={{ marginTop: 12, fontWeight: 600 }}>{testMsg}</p>}
          <p style={{ fontSize: ".78rem", color: "#6B6671", marginTop: 12 }}>টেস্ট ইভেন্ট Meta তে ১ টাকার একটা ViewContent হিসেবে (নাম: TEST) দেখা যাবে — ক্ষতি নেই।</p>
        </div>
      </div>
    </StoreLayout>
  );
}
