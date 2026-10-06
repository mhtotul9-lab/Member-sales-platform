// ট্র্যাকিং: Google Tag Manager (ডিফল্ট) অথবা সরাসরি Meta Pixel।
//
// মোড (Vercel → Environment Variables → NEXT_PUBLIC_TRACKING_MODE):
//   gtm    (ডিফল্ট) → শুধু GTM লোড হয়। সব ইভেন্ট dataLayer এ যায়, GTM এর ট্যাগ Pixel/GA/সার্ভার কন্টেইনারে পাঠায়।
//   direct           → GTM লোড হয় না; Meta Pixel সরাসরি ব্রাউজারে চলে।
// দুটো একসাথে চালালে একই ইভেন্ট ২ বার গণনা হয় — তাই একটাই চালু থাকে।
export const PIXEL_ID = process.env.NEXT_PUBLIC_FB_PIXEL_ID || "1315836315668314";
export const TRACKING_MODE = process.env.NEXT_PUBLIC_TRACKING_MODE === "direct" ? "direct" : "gtm";
// Web কন্টেইনার "Jolrasi.com" — Vercel এ NEXT_PUBLIC_GTM_ID দিয়ে বদলানো যায়
export const GTM_ID = process.env.NEXT_PUBLIC_GTM_ID || "GTM-P8FMFQD5";
// ঐচ্ছিক: সার্ভার-সাইড GTM এর নিজস্ব ডোমেইন থাকলে (যেমন https://sgtm.jolrasi.com) গুগল ট্যাগ সেখান দিয়ে পাঠাতে ব্যবহার হয়
export const SGTM_URL = process.env.NEXT_PUBLIC_SGTM_URL || "";

export const pixelBaseCode = `
!function(f,b,e,v,n,t,s){if(f.fbq)return;n=f.fbq=function(){n.callMethod?n.callMethod.apply(n,arguments):n.queue.push(arguments)};if(!f._fbq)f._fbq=n;n.push=n;n.loaded=!0;n.version='2.0';n.queue=[];t=b.createElement(e);t.async=!0;t.src=v;s=b.getElementsByTagName(e)[0];s.parentNode.insertBefore(t,s)}(window,document,'script','https://connect.facebook.net/en_US/fbevents.js');
fbq('init','${PIXEL_ID}');fbq('track','PageView');
`;

export const gtmCode = `(function(w,d,s,l,i){w[l]=w[l]||[];w[l].push({'gtm.start':new Date().getTime(),event:'gtm.js'});var f=d.getElementsByTagName(s)[0],j=d.createElement(s),dl=l!='dataLayer'?'&l='+l:'';j.async=true;j.src='https://www.googletagmanager.com/gtm.js?id='+i+dl;f.parentNode.insertBefore(j,f);})(window,document,'script','dataLayer','${GTM_ID}');`;

function getCookie(name) {
  if (typeof document === "undefined") return "";
  const m = document.cookie.match(new RegExp("(?:^|; )" + name + "=([^;]*)"));
  return m ? decodeURIComponent(m[1]) : "";
}

export function getFbCookies() {
  return { fbp: getCookie("_fbp"), fbc: getCookie("_fbc") };
}

export function newEventId() {
  return "e_" + Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
}

// Meta ইভেন্টের নাম → GA4 ইকমার্স ইভেন্টের নাম (GTM ট্রিগার এগুলো ধরে)
const GA_MAP = {
  ViewContent: "view_item",
  AddToCart: "add_to_cart",
  InitiateCheckout: "begin_checkout",
  Purchase: "purchase",
  Search: "search",
  AddPaymentInfo: "add_payment_info",
  AddShippingInfo: "add_shipping_info",
};
const META_STANDARD = ["ViewContent", "AddToCart", "InitiateCheckout", "Purchase", "Search", "AddPaymentInfo"];
const BRAND = "Jolrasi";

// একই ইভেন্ট ব্যবহারের মোড অনুযায়ী পাঠায়।
// dataLayer এ সবসময় GA4-স্ট্যান্ডার্ড ecommerce অবজেক্ট যায় (event_id সহ — Meta ডুপ্লিকেট এড়াতে)।
export function track(event, params = {}, eventId, extra) {
  if (typeof window === "undefined") return;

  // ১) সরাসরি Pixel মোড
  if (TRACKING_MODE === "direct" && META_STANDARD.includes(event)) {
    try {
      if (window.fbq) {
        if (eventId) window.fbq("track", event, params, { eventID: eventId });
        else window.fbq("track", event, params);
      }
    } catch (e) {}
  }

  // ২) dataLayer (GTM মোডে এটাই মূল পথ; direct মোডেও নিরীহভাবে জমা থাকে)
  try {
    window.dataLayer = window.dataLayer || [];
    const items = (params.contents || []).map((c) => ({
      item_id: c.id,
      item_name: params.content_name,
      item_category: params.content_category || undefined,
      item_brand: BRAND,
      price: c.item_price,
      quantity: c.quantity,
    }));
    window.dataLayer.push({ ecommerce: null }); // আগের ecommerce ডেটা মুছে
    window.dataLayer.push({
      event: GA_MAP[event] || event,
      meta_event_name: event,
      event_id: eventId || undefined,
      ecommerce: items.length || params.value != null ? { currency: params.currency || "BDT", value: params.value, transaction_id: params.transaction_id, items } : undefined,
      // GTM4WP/WooCommerce ধাঁচের ট্যাগগুলো টপ-লেভেল কী খোঁজে — তাই দুই জায়গাতেই রাখা হলো
      value: params.value,
      currency: params.value != null ? params.currency || "BDT" : undefined,
      transaction_id: params.transaction_id,
      content_ids: params.content_ids,
      content_name: params.content_name,
      content_type: params.content_type,
      content_category: params.content_category,
      num_items: params.num_items,
      search_term: params.search_string,
      ...(extra || {}),
    });
  } catch (e) {}
}
