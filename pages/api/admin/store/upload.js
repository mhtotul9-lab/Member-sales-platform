import { adminDb } from "../../../../lib/firebaseAdmin";
import { withErrorHandling } from "../../../../lib/apiWrapper";
import { guardAdmin } from "../../../../lib/store/adminApi";

export const config = { api: { bodyParser: { sizeLimit: "2mb" } } };

// ব্রাউজারে ছোট করা ছবি (data URL) নিয়ে Firestore এ রাখে, URL ফেরত দেয়।
async function handler(req, res) {
  if (!(await guardAdmin(req, res))) return;
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });
  const m = /^data:(image\/(?:jpeg|png|webp));base64,(.+)$/.exec(String((req.body || {}).dataUrl || ""));
  if (!m) return res.status(400).json({ error: "ছবির ফরম্যাট ঠিক নয় (JPG/PNG/WebP দিন)।" });
  if (m[2].length > 900000) return res.status(400).json({ error: "ছবিটি অনেক বড়। ছোট ছবি দিন।" });
  const ref = await adminDb.collection("store_images").add({ contentType: m[1], data: m[2], createdAt: new Date().toISOString() });
  return res.status(201).json({ url: `/api/store/image/${ref.id}` });
}

export default withErrorHandling(handler);
