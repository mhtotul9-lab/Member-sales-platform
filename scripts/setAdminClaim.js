/**
 * এই স্ক্রিপ্টটা শুধু একবার, লোকালি রান করবেন — প্রথম অ্যাডমিন অ্যাকাউন্ট তৈরি করতে।
 *
 * ধাপ:
 * 1) স্বাভাবিক /register পেজ দিয়ে নিজের ইমেইল দিয়ে একটা অ্যাকাউন্ট খুলুন (পেন্ডিং থাকবে)।
 * 2) .env.local এ FIREBASE_ADMIN_* ভ্যারিয়েবলগুলো সেট করা আছে কিনা নিশ্চিত করুন।
 * 3) রান করুন: node scripts/setAdminClaim.js you@example.com
 */
require("dotenv").config({ path: ".env.local" });
const { initializeApp, cert } = require("firebase-admin/app");
const { getAuth } = require("firebase-admin/auth");
const { getFirestore } = require("firebase-admin/firestore");

const email = process.argv[2];
if (!email) {
  console.error("ব্যবহার: node scripts/setAdminClaim.js you@example.com");
  process.exit(1);
}

const privateKey = (process.env.FIREBASE_ADMIN_PRIVATE_KEY || "").replace(/\\n/g, "\n");

const app = initializeApp({
  credential: cert({
    projectId: process.env.FIREBASE_ADMIN_PROJECT_ID,
    clientEmail: process.env.FIREBASE_ADMIN_CLIENT_EMAIL,
    privateKey,
  }),
});

(async () => {
  const auth = getAuth(app);
  const db = getFirestore(app);

  const user = await auth.getUserByEmail(email);
  await auth.setCustomUserClaims(user.uid, { admin: true });
  await db.collection("members").doc(user.uid).set(
    { role: "admin", status: "active" },
    { merge: true }
  );

  console.log(`${email} এখন অ্যাডমিন। এই ইউজারকে আবার লগইন করতে বলুন (নতুন টোকেন পেতে)।`);
  process.exit(0);
})().catch((err) => {
  console.error(err);
  process.exit(1);
});
