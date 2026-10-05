// Server-only. Meta Conversions API (ঐচ্ছিক) — META_CAPI_TOKEN সেট থাকলে Purchase সার্ভার থেকেও যায়।
// ব্রাউজারের একই event_id থাকায় Meta নিজে ডুপ্লিকেট বাদ দেয়; অ্যাডব্লকার/iOS-এও সেল মিস হয় না।
import crypto from "crypto";

const sha = (v) => crypto.createHash("sha256").update(String(v).trim().toLowerCase()).digest("hex");

export async function sendCapiPurchase({ eventId, value, productId, productName, quantity, unitPrice, phone, name, ip, ua, fbp, fbc, url }) {
  const token = process.env.META_CAPI_TOKEN;
  if (!token) return;
  const pixelId = process.env.NEXT_PUBLIC_PIXEL_ID || "1315836315668314";
  const user_data = { ph: [sha("88" + phone)], country: [sha("bd")], client_ip_address: ip, client_user_agent: ua };
  if (name) user_data.fn = [sha(String(name).trim().split(/\s+/)[0])];
  if (fbp) user_data.fbp = fbp;
  if (fbc) user_data.fbc = fbc;
  const payload = {
    data: [{
      event_name: "Purchase",
      event_time: Math.floor(Date.now() / 1000),
      event_id: eventId,
      event_source_url: url,
      action_source: "website",
      user_data,
      custom_data: {
        currency: "BDT", value, content_type: "product", content_ids: [productId], content_name: productName,
        contents: [{ id: productId, quantity, item_price: unitPrice }], num_items: quantity,
      },
    }],
  };
  if (process.env.META_TEST_EVENT_CODE) payload.test_event_code = process.env.META_TEST_EVENT_CODE;
  const ctrl = new AbortController();
  const t = setTimeout(() => ctrl.abort(), 4000);
  try {
    await fetch(`https://graph.facebook.com/v19.0/${pixelId}/events?access_token=${encodeURIComponent(token)}`, {
      method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload), signal: ctrl.signal,
    });
  } catch (e) {
    console.error("CAPI failed", e.message);
  } finally {
    clearTimeout(t);
  }
}
