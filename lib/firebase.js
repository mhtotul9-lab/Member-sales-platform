// Client-side Firebase init. Safe to expose in browser — these are public config values.
import { initializeApp, getApps, getApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";

const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
};

// The Firebase JS SDK assumes a browser environment. Next.js still imports
// this module on the server while building/collecting page data, and if it
// eagerly initializes there with missing config it throws and can fail the
// whole build. Guarding with `typeof window` keeps real init browser-only —
// server-side code never actually needs `auth`/`db` from this file anyway,
// since every page here is a client component using useEffect.
const isBrowser = typeof window !== "undefined";

function getFirebaseApp() {
  return getApps().length ? getApp() : initializeApp(firebaseConfig);
}

const app = isBrowser ? getFirebaseApp() : null;
export const auth = isBrowser ? getAuth(app) : null;
export const db = isBrowser ? getFirestore(app) : null;
export default app;
