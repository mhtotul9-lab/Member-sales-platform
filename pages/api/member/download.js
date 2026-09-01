import { requireActiveMember } from "../../../lib/firebaseAdmin";
import { withErrorHandling } from "../../../lib/apiWrapper";

async function handler(req, res) {
  if (req.method !== "GET") return res.status(405).json({ error: "Method not allowed" });

  try {
    await requireActiveMember(req);
  } catch (err) {
    return res.status(err.statusCode || 401).json({ error: err.message });
  }

  const { url, filename } = req.query;
  if (!url || !/^https?:\/\//i.test(url)) {
    return res.status(400).json({ error: "সঠিক মিডিয়া URL দিতে হবে।" });
  }

  const upstream = await fetch(url);
  if (!upstream.ok) {
    return res.status(502).json({ error: "ফাইলটা আনা যায়নি — লিংকটা ঠিক আছে কিনা চেক করুন।" });
  }

  const contentType = upstream.headers.get("content-type") || "application/octet-stream";
  const buffer = Buffer.from(await upstream.arrayBuffer());

  const safeName = (filename || "download").replace(/[^a-zA-Z0-9_.\-\u0980-\u09FF]/g, "_");

  res.setHeader("Content-Type", contentType);
  res.setHeader("Content-Disposition", `attachment; filename="${safeName}"`);
  res.setHeader("Content-Length", buffer.length);
  return res.status(200).send(buffer);
}

export default withErrorHandling(handler);
