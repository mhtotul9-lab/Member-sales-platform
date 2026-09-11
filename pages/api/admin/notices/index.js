import { requireAdmin, adminDb } from "../../../../lib/firebaseAdmin";
import { withErrorHandling } from "../../../../lib/apiWrapper";

async function handler(req, res) {
  let auth;
  try {
    auth = await requireAdmin(req);
  } catch (err) {
    return res.status(err.statusCode || 401).json({ error: err.message });
  }

  if (req.method === "GET") {
    const snap = await adminDb.collection("notices").orderBy("createdAt", "desc").limit(100).get();
    const notices = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
    return res.status(200).json({ notices });
  }

  if (req.method === "POST") {
    const body = req.body || {};
    const title = String(body.title || "").trim();
    const message = String(body.message || "").trim();
    if (!title) return res.status(400).json({ error: "শিরোনাম দিতে হবে।" });
    if (!message) return res.status(400).json({ error: "বার্তা দিতে হবে।" });

    const now = new Date().toISOString();
    const noticeRef = await adminDb.collection("notices").add({
      title,
      message,
      createdAt: now,
      createdBy: auth.email || auth.uid || "admin",
    });

    // সব অ্যাক্টিভ মেম্বারকে বেল-নোটিফিকেশন দিয়ে সাথে সাথে জানিয়ে দেওয়া হচ্ছে
    const membersSnap = await adminDb.collection("members").where("status", "==", "active").get();
    if (!membersSnap.empty) {
      const batch = adminDb.batch();
      membersSnap.docs.forEach((d) => {
        if (d.data().role === "admin") return;
        const ref = adminDb.collection("notifications").doc();
        batch.set(ref, {
          userId: d.id,
          type: "notice",
          message: `নতুন নোটিস: ${title}`,
          link: "/notices",
          read: false,
          createdAt: now,
        });
      });
      await batch.commit();
    }

    return res.status(201).json({ id: noticeRef.id });
  }

  return res.status(405).json({ error: "Method not allowed" });
}

export default withErrorHandling(handler);
