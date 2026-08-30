// Server-only Firebase Admin init. NEVER import this from a page/component that runs in the browser.
// Only import inside files under /pages/api/**.
import { initializeApp, getApps, cert } from "firebase-admin/app";
import { getAuth } from "firebase-admin/auth";
import { getFirestore } from "firebase-admin/firestore";

function buildAdminApp() {
  if (getApps().length) return getApps()[0];

  const privateKey = (process.env.FIREBASE_ADMIN_PRIVATE_KEY || "").replace(/\\n/g, "\n");

  return initializeApp({
    credential: cert({
      projectId: process.env.FIREBASE_ADMIN_PROJECT_ID,
      clientEmail: process.env.FIREBASE_ADMIN_CLIENT_EMAIL,
      privateKey,
    }),
  });
}

const adminApp = buildAdminApp();

export const adminAuth = getAuth(adminApp);
export const adminDb = getFirestore(adminApp);

// Verifies the Firebase ID token sent from the browser (Authorization: Bearer <token>)
// and confirms the caller has the admin custom claim. Throws on failure.
export async function requireAdmin(req) {
  const authHeader = req.headers.authorization || "";
  const token = authHeader.startsWith("Bearer ") ? authHeader.slice(7) : null;
  if (!token) {
    const err = new Error("No token provided");
    err.statusCode = 401;
    throw err;
  }
  const decoded = await adminAuth.verifyIdToken(token);
  if (!decoded.admin) {
    const err = new Error("Admin access required");
    err.statusCode = 403;
    throw err;
  }
  return decoded;
}

// Verifies any signed-in user and returns their decoded token (uid, claims).
export async function requireAuth(req) {
  const authHeader = req.headers.authorization || "";
  const token = authHeader.startsWith("Bearer ") ? authHeader.slice(7) : null;
  if (!token) {
    const err = new Error("No token provided");
    err.statusCode = 401;
    throw err;
  }
  return adminAuth.verifyIdToken(token);
}

// Order statuses that count as a "valid" sale for member totals, the
// active/inactive rule (Phase 4), and the leaderboard. Kept in one place
// so every phase agrees on the same definition.
export const VALID_SALE_STATUSES = ["approved", "processing", "delivered", "completed"];

// ORD-YYYYMMDD-#### with a per-day counter, generated inside a
// transaction so two concurrent submissions never collide.
export async function nextOrderId() {
  const today = new Date();
  const dateKey = `${today.getFullYear()}${String(today.getMonth() + 1).padStart(2, "0")}${String(today.getDate()).padStart(2, "0")}`;
  const counterRef = adminDb.collection("settings").doc("counters");
  const seq = await adminDb.runTransaction(async (tx) => {
    const snap = await tx.get(counterRef);
    const field = `orderSeq_${dateKey}`;
    const current = snap.exists ? snap.data()[field] || 0 : 0;
    const next = current + 1;
    tx.set(counterRef, { [field]: next }, { merge: true });
    return next;
  });
  return `ORD-${dateKey}-${String(seq).padStart(4, "0")}`;
}
// Verifies a signed-in user AND that their members/{uid} doc has
// status "active". Used by member-facing (non-admin) API routes that
// read data through the Admin SDK instead of direct Firestore rules.
export async function requireActiveMember(req) {
  const decoded = await requireAuth(req);
  const snap = await adminDb.collection("members").doc(decoded.uid).get();
  if (!snap.exists || snap.data().status !== "active") {
    const err = new Error("Active membership required");
    err.statusCode = 403;
    throw err;
  }
  return { decoded, profile: snap.data() };
}
