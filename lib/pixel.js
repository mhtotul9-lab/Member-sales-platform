// ক্লায়েন্ট-সাইড ট্র্যাকিং: Meta Pixel (সরাসরি) + dataLayer (GTM-এর জন্য)।
// পিক্সেল স্ক্রিপ্ট pages/_document.js-এ লোড হয়, শুধু পাবলিক স্টোর পেজে (admin/member পেজে নয়)।
export const PIXEL_ID = process.env.NEXT_PUBLIC_PIXEL_ID || "1315836315668314";

const GA_NAMES = {
  PageView: "page_view",
  ViewContent: "view_item",
  AddToCart: "add_to_cart",
  InitiateCheckout: "begin_checkout",
  Purchase: "purchase",
  Search: "search",
  Contact: "contact",
};

export function uid(prefix = "ev") {
  const r = typeof crypto !== "undefined" && crypto.randomUUID ? crypto.randomUUID() : String(Math.random()).slice(2) + Date.now();
  return `${prefix}_${r}`;
}

function cookie(name) {
  if (typeof document === "undefined") return "";
  const m = document.cookie.match(new RegExp("(?:^|; )" + name + "=([^;]*)"));
  return m ? decodeURIComponent(m[1]) : "";
}

// Conversions API-তে পাঠানোর জন্য ব্রাউজার আইডি
export function getFbIds() {
  let fbc = cookie("_fbc");
  if (!fbc && typeof location !== "undefined") {
    const fbclid = new URLSearchParams(location.search).get("fbclid");
    if (fbclid) fbc = `fb.1.${Date.now()}.${fbclid}`;
  }
  return { fbp: cookie("_fbp"), fbc };
}

export function getUtm() {
  if (typeof location === "undefined") return {};
  const p = new URLSearchParams(location.search);
  const out = {};
  ["utm_source", "utm_medium", "utm_campaign", "utm_content", "fbclid"].forEach((k) => { if (p.get(k)) out[k] = p.get(k).slice(0, 120); });
  return out;
}

function gaEcommerce(params) {
  if (!params || !params.content_ids) return undefined;
  const items = (params.contents || params.content_ids.map((id) => ({ id, quantity: 1 }))).map((c) => ({
    item_id: c.id, item_name: params.content_name, price: c.item_price ?? params.value, quantity: c.quantity || 1,
  }));
  return { currency: params.currency || "BDT", value: params.value, items, transaction_id: params.transaction_id };
}

export function track(name, params = {}, eventId) {
  if (typeof window === "undefined" || !window.__store) return;
  try {
    window.dataLayer = window.dataLayer || [];
    window.dataLayer.push({ ecommerce: null });
    window.dataLayer.push({ event: GA_NAMES[name] || name, event_id: eventId, ecommerce: gaEcommerce(params), search_term: params.search_string });
    if (window.fbq) {
      if (eventId) window.fbq("track", name, params, { eventID: eventId });
      else window.fbq("track", name, params);
    }
  } catch {
    // ট্র্যাকিং কখনো অর্ডার ফ্লো আটকাবে না
  }
}

// Advanced Matching: Purchase-এর আগে কাস্টমারের ফোন/নাম দিলে Meta নিজেই হ্যাশ করে নেয়।
export function setUserData({ phone, name }) {
  if (typeof window === "undefined" || !window.fbq || !window.__store) return;
  const data = { country: "bd" };
  if (phone) data.ph = "88" + phone;
  if (name) data.fn = String(name).trim().split(/\s+/)[0].toLowerCase();
  try { window.fbq("init", PIXEL_ID, data); } catch {}
}
