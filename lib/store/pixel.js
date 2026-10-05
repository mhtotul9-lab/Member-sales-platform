// Meta (Facebook) Pixel + GTM dataLayer ট্র্যাকিং।
// Pixel ID: Jolrasi pixel — চাইলে Vercel এ NEXT_PUBLIC_FB_PIXEL_ID দিয়ে বদলানো যায়।
export const PIXEL_ID = process.env.NEXT_PUBLIC_FB_PIXEL_ID || "1315836315668314";
export const GTM_ID = process.env.NEXT_PUBLIC_GTM_ID || "";

export const pixelBaseCode = `
!function(f,b,e,v,n,t,s){if(f.fbq)return;n=f.fbq=function(){n.callMethod?n.callMethod.apply(n,arguments):n.queue.push(arguments)};if(!f._fbq)f._fbq=n;n.push=n;n.loaded=!0;n.version='2.0';n.queue=[];t=b.createElement(e);t.async=!0;t.src=v;s=b.getElementsByTagName(e)[0];s.parentNode.insertBefore(t,s)}(window,document,'script','https://connect.facebook.net/en_US/fbevents.js');
fbq('init','${PIXEL_ID}');fbq('track','PageView');
`;

export const gtmCode = GTM_ID
  ? `(function(w,d,s,l,i){w[l]=w[l]||[];w[l].push({'gtm.start':new Date().getTime(),event:'gtm.js'});var f=d.getElementsByTagName(s)[0],j=d.createElement(s),dl=l!='dataLayer'?'&l='+l:'';j.async=true;j.src='https://www.googletagmanager.com/gtm.js?id='+i+dl;f.parentNode.insertBefore(j,f);})(window,document,'script','dataLayer','${GTM_ID}');`
  : "";

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

const GA_MAP = {
  ViewContent: "view_item",
  AddToCart: "add_to_cart",
  InitiateCheckout: "begin_checkout",
  Purchase: "purchase",
  Search: "search",
};

// একই ইভেন্ট Pixel (fbq) আর GTM dataLayer — দুই জায়গাতেই পাঠায়।
export function track(event, params = {}, eventId) {
  if (typeof window === "undefined") return;
  try {
    if (window.fbq) {
      if (eventId) window.fbq("track", event, params, { eventID: eventId });
      else window.fbq("track", event, params);
    }
  } catch (e) {}
  try {
    window.dataLayer = window.dataLayer || [];
    window.dataLayer.push({
      event: GA_MAP[event] || event,
      event_id: eventId || undefined,
      currency: params.currency,
      value: params.value,
      transaction_id: params.transaction_id,
      items: params.contents
        ? params.contents.map((c) => ({ item_id: c.id, item_name: params.content_name, price: c.item_price, quantity: c.quantity }))
        : undefined,
      search_term: params.search_string,
    });
  } catch (e) {}
}
