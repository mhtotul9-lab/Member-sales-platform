// Server-only. Steadfast Courier API — কী/সিক্রেট কোডে নয়, শুধু Vercel Environment Variables-এ থাকে।
const BASE = process.env.STEADFAST_BASE_URL || "https://portal.packzy.com/api/v1";

function headers() {
  const key = process.env.STEADFAST_API_KEY;
  const secret = process.env.STEADFAST_SECRET_KEY;
  if (!key || !secret) {
    const e = new Error("Steadfast কী সেট করা নেই। Vercel → Settings → Environment Variables-এ STEADFAST_API_KEY ও STEADFAST_SECRET_KEY দিন, তারপর Redeploy করুন।");
    e.statusCode = 503;
    throw e;
  }
  return { "Api-Key": key, "Secret-Key": secret, "Content-Type": "application/json", Accept: "application/json" };
}

async function call(path, init) {
  const res = await fetch(BASE + path, { ...init, headers: headers() });
  const body = await res.json().catch(() => ({}));
  if (!res.ok || (body.status && Number(body.status) !== 200)) {
    const e = new Error(`Steadfast: ${body.message || body.errors ? (body.message || JSON.stringify(body.errors)) : res.status}`);
    e.statusCode = 502;
    throw e;
  }
  return body;
}

export async function createSteadfastOrder(o) {
  const body = await call("/create_order", {
    method: "POST",
    body: JSON.stringify({
      invoice: o.orderId,
      recipient_name: String(o.customerName).slice(0, 100),
      recipient_phone: o.customerPhone,
      recipient_address: String(o.customerAddress).slice(0, 250),
      cod_amount: Number(o.totalPayable ?? o.orderAmount) || 0,
      note: String(o.adminNote || "").slice(0, 200),
      item_description: `${o.productName} x${o.quantity}`.slice(0, 200),
    }),
  });
  return body.consignment;
}

export async function getSteadfastStatus(consignmentId) {
  const body = await call(`/status_by_cid/${encodeURIComponent(consignmentId)}`, { method: "GET" });
  return body.delivery_status;
}

export async function getSteadfastBalance() {
  const body = await call("/get_balance", { method: "GET" });
  return body.current_balance;
}
