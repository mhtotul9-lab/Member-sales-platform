import { requireAdmin, adminDb } from "../../../../lib/firebaseAdmin";
import { withErrorHandling } from "../../../../lib/apiWrapper";

async function handler(req, res) {
  try {
    await requireAdmin(req);
  } catch (err) {
    return res.status(err.statusCode || 401).json({ error: err.message });
  }

  if (req.method === "GET") {
    const snap = await adminDb.collection("trainings").orderBy("order", "asc").get();
    const trainings = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
    return res.status(200).json({ trainings });
  }

  if (req.method === "POST") {
    const body = req.body || {};
    if (!body.title || !String(body.title).trim()) return res.status(400).json({ error: "টাইটেল দিতে হবে।" });

    const countSnap = await adminDb.collection("trainings").count().get();
    const doc = {
      title: String(body.title).trim(),
      content: body.content || "",
      videoUrl: body.videoUrl || "",
      pdfUrl: body.pdfUrl || "",
      order: countSnap.data().count + 1,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    const ref = await adminDb.collection("trainings").add(doc);
    return res.status(201).json({ id: ref.id });
  }

  return res.status(405).json({ error: "Method not allowed" });
}

export default withErrorHandling(handler);
