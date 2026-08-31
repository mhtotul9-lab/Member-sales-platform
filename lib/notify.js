// Server-only. Import only from /pages/api/** files.
import { adminDb } from "./firebaseAdmin";

export async function notifyUser(userId, { type, message, link }) {
  await adminDb.collection("notifications").add({
    userId, type, message, link: link || null,
    read: false,
    createdAt: new Date().toISOString(),
  });
}

export async function notifyAdmins({ type, message, link }) {
  const snap = await adminDb.collection("members").where("role", "==", "admin").get();
  if (snap.empty) return;
  const batch = adminDb.batch();
  const now = new Date().toISOString();
  snap.docs.forEach((d) => {
    const ref = adminDb.collection("notifications").doc();
    batch.set(ref, { userId: d.id, type, message, link: link || null, read: false, createdAt: now });
  });
  await batch.commit();
}
