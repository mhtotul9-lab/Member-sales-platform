import { createContext, useContext, useEffect, useRef, useState } from "react";
import { onAuthStateChanged } from "firebase/auth";
import { doc, onSnapshot, setDoc } from "firebase/firestore";
import { auth, db } from "../lib/firebase";

const AuthContext = createContext({ user: null, profile: null, loading: true });

const HEARTBEAT_MS = 3 * 60 * 1000; // রিড/রাইট কমাতে ৩ মিনিট (অ্যাডমিনের "অনলাইন" সময়সীমা ৫ মিনিট)

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const loginRecordedRef = useRef(false);

  useEffect(() => {
    const unsubAuth = onAuthStateChanged(auth, (firebaseUser) => {
      setUser(firebaseUser);
      loginRecordedRef.current = false;
      if (!firebaseUser) {
        setProfile(null);
        setLoading(false);
      }
    });
    return () => unsubAuth();
  }, []);

  useEffect(() => {
    if (!user) return;
    const unsubDoc = onSnapshot(doc(db, "members", user.uid), (snap) => {
      setProfile(snap.exists() ? snap.data() : null);
      setLoading(false);
    });
    return () => unsubDoc();
  }, [user]);

  // Lightweight presence: heartbeats `lastActiveAt` every ~50s while a tab
  // is open (plus on tab focus), and stamps `lastLoginAt` once per sign-in.
  // This is an approximation, not an instant presence system — a member
  // reads as "online" if their last heartbeat was within the last couple
  // of minutes. Simple and needs no extra Firebase product beyond Firestore.
  useEffect(() => {
    if (!user || !profile) return;

    const memberRef = doc(db, "members", user.uid);
    const nowIso = () => new Date().toISOString();

    if (!loginRecordedRef.current) {
      loginRecordedRef.current = true;
      setDoc(memberRef, { lastLoginAt: nowIso(), lastActiveAt: nowIso() }, { merge: true }).catch(() => {});
    }

    const beat = () => document.visibilityState === "visible" && setDoc(memberRef, { lastActiveAt: nowIso() }, { merge: true }).catch(() => {});
    const interval = setInterval(beat, HEARTBEAT_MS); // ট্যাব লুকানো থাকলে beat কিছু লেখে না
    const onVisible = () => { if (document.visibilityState === "visible") beat(); };
    document.addEventListener("visibilitychange", onVisible);

    return () => {
      clearInterval(interval);
      document.removeEventListener("visibilitychange", onVisible);
    };
  }, [user, profile]);

  return (
    <AuthContext.Provider value={{ user, profile, loading }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}
