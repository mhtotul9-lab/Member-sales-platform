// Meta Conversions API (সার্ভার-সাইড Pixel) — ব্রাউজার ব্লক/অ্যাড-ব্লকার থাকলেও Purchase ডেটা Pixel এ পৌঁছায়।
// Vercel এ FB_CAPI_TOKEN দিলে চালু হয়; না দিলে কিছুই করে না। ব্রাউজারের eventID এর সাথে মিলিয়ে ডুপ্লিকেট এড়ানো হয়।
import crypto from "crypto";
import { PIXEL_ID } from "./pixel";

const sha = (v) => crypto.createHash("sha256").update(String(v).trim().toLowerCase()).digest("hex");

export async function sendCapiPurchase(order, req) {
  const token = process.env.FB_CAPI_TOKEN?.trim();
  if (!token) return;
  const it = order.items[0];
  const [first, ...rest] = order.customer.name.split(/\s+/);
  const body = {
    data: [{
      event_name: "Purchase",
      event_time: Math.floor(Date.now() / 1000),
      event_id: order.meta.eventId || undefined,
      action_source: "website",
      event_source_url: order.meta.landing || undefined,
      user_data: {
        ph: [sha("88" + order.customer.phone.replace(/^0/, ""))],
        fn: [sha(first)],
        ln: rest.length ? [sha(rest.join(" "))] : undefined,
        country: [sha("bd")],
        client_ip_address: order.meta.ip || undefined,
        client_user_agent: order.meta.userAgent || undefined,
        fbp: order.meta.fbp || undefined,
        fbc: order.meta.fbc || undefined,
      },
      custom_data: { currency: "BDT", value: order.total, content_type: "product", content_ids: [it.productId], content_name: it.name, num_items: it.qty, order_id: order.orderNo },
    }],
  };
  if (process.env.FB_CAPI_TEST_CODE) body.test_event_code = process.env.FB_CAPI_TEST_CODE;
  await fetch(`https://graph.facebook.com/v19.0/${PIXEL_ID}/events?access_token=${encodeURIComponent(token)}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}
