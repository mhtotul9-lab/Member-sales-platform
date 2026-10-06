import { useState, useEffect } from "react";
import StoreLayout from "../components/store/StoreLayout";
import s from "../styles/store.module.css";
import { getSettings } from "../lib/store/server";
import { fmtPrice, ORDER_STATUSES, COURIER_STATUS_TEXT } from "../lib/store/shared";

export async function getServerSideProps({ res }) {
  res.setHeader("Cache-Control", "no-store");
  return { props: { settings: await getSettings() } };
}

const FLOW = ["new", "confirmed", "shipped", "delivered"];
const FLOW_LABEL = ["অর্ডার হয়েছে", "কনফার্মড", "কুরিয়ারে", "ডেলিভার্ড"];

export default function Track({ settings }) {
  const [orderNo, setOrderNo] = useState("");
  const [phone, setPhone] = useState("");
  const [r, setR] = useState(null);
  const [err, setErr] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    try { const last = JSON.parse(localStorage.getItem("jr_my_orders") || "[]")[0]; if (last) { setOrderNo(last.orderNo); setPhone(last.phone); } } catch (e) {}
  }, []);

  async function go(e) {
    e.preventDefault(); setErr(""); setR(null); setBusy(true);
    try {
      const res = await fetch("/api/store/track", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ orderNo, phone }) });
      const d = await res.json();
      if (!res.ok) throw new Error(d.error);
      setR(d);
    } catch (e2) { setErr(e2.message || "খুঁজে পাওয়া যায়নি।"); }
    setBusy(false);
  }

  const idx = r ? (r.status === "no_answer" ? 0 : FLOW.indexOf(r.status)) : -1;
  const bad = r && ["cancelled", "returned"].includes(r.status);

  return (
    <StoreLayout settings={settings} title={`অর্ডার ট্র্যাক — ${settings.storeName}`}>
      <div className={s.wrap}>
        <div className={s.success} style={{ textAlign: "left" }}>
          <h1 style={{ margin: "0 0 6px", fontSize: "1.4rem", textAlign: "center" }}>অর্ডার ট্র্যাক করুন</h1>
          <p style={{ textAlign: "center", color: "#6B6671", margin: "0 0 18px", fontSize: ".9rem" }}>অর্ডার নাম্বার ও যে মোবাইল দিয়ে অর্ডার করেছেন সেটা লিখুন।</p>
          <form onSubmit={go}>
            <div className={s.fld}><label>অর্ডার নাম্বার</label><input value={orderNo} onChange={(e) => setOrderNo(e.target.value)} placeholder="JR-20261006-0001" /></div>
            <div className={s.fld}><label>মোবাইল নাম্বার</label><input type="tel" value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="০১XXXXXXXXX" /></div>
            {err && <p className={s.err}>{err}</p>}
            <button className={s.submit} disabled={busy}>{busy ? "খোঁজা হচ্ছে..." : "অবস্থা দেখুন"}</button>
          </form>
          {r && (
            <div style={{ marginTop: 22, borderTop: "1px dashed #e6ded2", paddingTop: 18 }}>
              <div style={{ display: "flex", gap: 12, alignItems: "center" }}>
                {r.item.image && <div style={{ width: 56, height: 70, borderRadius: 10, overflow: "hidden", background: "#f3ece2", flex: "none" }}>{/* eslint-disable-next-line @next/next/no-img-element */}<img src={r.item.image} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} /></div>}
                <div><b>{r.item.name}</b><div style={{ fontSize: ".85rem", color: "#6B6671" }}>{r.item.variant && `${r.item.variant} · `}{r.orderNo} · মোট {fmtPrice(r.total)}</div></div>
              </div>
              {bad ? (
                <p style={{ marginTop: 16, color: "#8B1E3F", fontWeight: 700 }}>অর্ডারের অবস্থা: {ORDER_STATUSES[r.status].text}</p>
              ) : (
                <div className={s.steps}>
                  {FLOW_LABEL.map((l, i) => <div key={l} className={`${s.step} ${i <= idx ? s.stepOn : ""}`}><i>{i <= idx ? "✓" : i + 1}</i>{l}</div>)}
                </div>
              )}
              {r.status === "no_answer" && <p style={{ fontSize: ".88rem" }}>আমরা আপনাকে ফোনে পাইনি। অনুগ্রহ করে আমাদের কল করুন।</p>}
              {r.courier && <p style={{ fontSize: ".9rem", margin: "10px 0 0" }}>কুরিয়ার: <b>{COURIER_STATUS_TEXT[r.courier.status] || r.courier.status}</b>{r.courier.trackingCode && <> · <a href={`https://steadfast.com.bd/t/${r.courier.trackingCode}`} target="_blank" rel="noreferrer">কুরিয়ার ট্র্যাকিং ↗</a></>}</p>}
            </div>
          )}
        </div>
      </div>
    </StoreLayout>
  );
}
