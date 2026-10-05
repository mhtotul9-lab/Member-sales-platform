// Steadfast Courier API — শুধু সার্ভার সাইডে চলে। Key কখনো ব্রাউজারে যায় না।
// Key দুটো Vercel → Settings → Environment Variables এ রাখতে হবে:
//   STEADFAST_API_KEY, STEADFAST_SECRET_KEY
const BASE_URL = "https://portal.packzy.com/api/v1"; // Cash-Flow প্রোজেক্টে যেটা চলছে, সেটাই

async function call(path, method = "GET", body) {
  const apiKey = process.env.STEADFAST_API_KEY?.trim();
  const secretKey = process.env.STEADFAST_SECRET_KEY?.trim();
  if (!apiKey || !secretKey) {
    const err = new Error("STEADFAST_API_KEY / STEADFAST_SECRET_KEY Vercel Environment Variables এ বসানো নেই।");
    err.statusCode = 500;
    throw err;
  }
  const res = await fetch(BASE_URL + path, {
    method,
    headers: { "Api-Key": apiKey, "Secret-Key": secretKey, "Content-Type": "application/json" },
    body: body ? JSON.stringify(body) : undefined,
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok || (data.status && Number(data.status) >= 400)) {
    const err = new Error(data.message || `Steadfast এরর (${res.status})`);
    err.statusCode = 502;
    throw err;
  }
  return data;
}

export function createConsignment(order) {
  return call("/create_order", "POST", {
    invoice: order.orderNo,
    recipient_name: order.customer.name,
    recipient_phone: order.customer.phone,
    recipient_address: String(order.customer.address).slice(0, 250),
    cod_amount: Number(order.total) || 0,
    note: order.adminNote ? String(order.adminNote).slice(0, 200) : undefined,
  });
}

export const getStatusByCid = (cid) => call(`/status_by_cid/${encodeURIComponent(cid)}`);
export const getBalance = () => call("/get_balance");
