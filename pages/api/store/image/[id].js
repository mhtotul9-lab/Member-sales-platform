import { adminDb } from "../../../../lib/firebaseAdmin";

// আপলোড করা ছবি Firestore থেকে পরিবেশন করে, CDN এ ১ বছর ক্যাশ থাকে।
export default async function handler(req, res) {
  try {
    const snap = await adminDb.collection("store_images").doc(String(req.query.id)).get();
    if (!snap.exists) return res.status(404).end();
    const { data, contentType } = snap.data();
    const buf = Buffer.from(data, "base64");
    res.setHeader("Content-Type", contentType || "image/jpeg");
    res.setHeader("Cache-Control", "public, max-age=31536000, s-maxage=31536000, immutable");
    return res.status(200).send(buf);
  } catch (e) {
    return res.status(500).end();
  }
}
