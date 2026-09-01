import { useEffect, useState } from "react";
import { collection, query, orderBy, limit, onSnapshot } from "firebase/firestore";
import { db } from "../lib/firebase";
import { timeAgo } from "../lib/timeAgo";

export default function LiveSalesFeed() {
  const [items, setItems] = useState(null);
  const [justArrived, setJustArrived] = useState(null);

  useEffect(() => {
    if (!db) return;
    const q = query(collection(db, "salesFeed"), orderBy("createdAt", "desc"), limit(8));
    const unsub = onSnapshot(q, (snap) => {
      const rows = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
      setItems((prev) => {
        if (prev && rows[0] && prev[0]?.id !== rows[0].id) {
          setJustArrived(rows[0].id);
          setTimeout(() => setJustArrived(null), 1200);
        }
        return rows;
      });
    });
    return () => unsub();
  }, []);

  if (items !== null && items.length === 0) return null;

  return (
    <div className="card" style={{ marginBottom: 20 }}>
      <h2 style={{ fontSize: "1.05rem", marginBottom: 4, display: "flex", alignItems: "center", gap: 8 }}>
        <span className="live-dot" /> লাইভ সেল
      </h2>
      <p className="muted" style={{ marginBottom: 14, fontSize: "0.85rem" }}>এইমাত্র প্ল্যাটফর্মে যা বিক্রি হচ্ছে</p>

      {items === null && <Loading />}

      {items && items.map((item) => (
        <div className={`list-row${item.id === justArrived ? " feed-item-new" : ""}`} key={item.id}>
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            {item.productImageUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={item.productImageUrl} alt={item.productName} style={{ width: 44, height: 44, objectFit: "cover", borderRadius: 8, flexShrink: 0 }} />
            ) : (
              <div style={{ width: 44, height: 44, borderRadius: 8, background: "var(--paper)", flexShrink: 0 }} />
            )}
            <div>
              <div style={{ fontWeight: 600 }}>{item.productName}</div>
              <div className="muted" style={{ fontSize: "0.85rem" }}>বিক্রেতা: {item.memberInitials}**</div>
            </div>
          </div>
          <div className="muted" style={{ fontSize: "0.78rem", whiteSpace: "nowrap" }}>{timeAgo(item.createdAt)}</div>
        </div>
      ))}
    </div>
  );
}

function Loading() {
  return (
    <div className="loading-row">
      <span className="spinner" />
      <span className="muted">লোড হচ্ছে...</span>
    </div>
  );
}
