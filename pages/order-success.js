import { useEffect, useState } from "react";
import StoreLayout from "../components/store/StoreLayout";
import s from "../styles/store.module.css";
import { getSettings } from "../lib/store/server";
import { fmtPrice } from "../lib/store/shared";
import { track } from "../lib/store/pixel";

export async function getServerSideProps({ res }) {
  res.setHeader("Cache-Control", "no-store");
  return { props: { settings: await getSettings() } };
}

export default function OrderSuccess({ settings }) {
  const [o, setO] = useState(null);

  useEffect(() => {
    try {
      const data = JSON.parse(sessionStorage.getItem("jr_last_order") || "null");
      if (!data) return;
      setO(data);
      const flag = `jr_purchased_${data.orderNo}`;
      if (!sessionStorage.getItem(flag) && !data.duplicate) {
        sessionStorage.setItem(flag, "1");
        // Purchase ইভেন্ট — Pixel ও GTM dataLayer দুই জায়গাতেই যায়
        track("Purchase", { content_ids: [data.productId], content_name: data.productName, content_type: "product", num_items: data.qty, value: data.total, currency: "BDT", transaction_id: data.orderNo, contents: [{ id: data.productId, quantity: data.qty, item_price: data.price }] }, data.eventId || undefined);
      }
    } catch (e) {}
  }, []);

  const wa = settings.whatsapp ? `https://wa.me/${settings.whatsapp}` : "";
  return (
    <StoreLayout settings={settings} title={`অর্ডার সম্পন্ন — ${settings.storeName}`} hideFooter>
      <div className={s.wrap}>
        <div className={s.success}>
          <div className={s.check}>✓</div>
          <h1 style={{ margin: "0 0 6px", fontSize: "1.5rem" }}>আপনার অর্ডার সম্পন্ন হয়েছে!</h1>
          {o ? (
            <>
              <div className={s.orderNo}>{o.orderNo}</div>
              <p style={{ margin: "0 0 4px" }}>{o.name}, আমরা শীঘ্রই <b>{o.phone}</b> নাম্বারে ফোন করে অর্ডার কনফার্ম করব।</p>
              <p style={{ margin: "0 0 18px", color: "#3B4A63" }}>{o.productName} — সর্বমোট <b>{fmtPrice(o.total)}</b> (ক্যাশ অন ডেলিভারি)</p>
            </>
          ) : (
            <p style={{ margin: "10px 0 18px" }}>ধন্যবাদ! আমরা শীঘ্রই ফোন করে অর্ডার কনফার্ম করব।</p>
          )}
          <a href="/" className={s.heroBtn} style={{ background: "#12213B", color: "#fff" }}>আরও পণ্য দেখুন</a>
          {wa && <p style={{ marginTop: 16, fontSize: "0.9rem" }}>কিছু জানতে চাইলে <a href={wa} target="_blank" rel="noreferrer">WhatsApp এ মেসেজ করুন</a></p>}
        </div>
      </div>
    </StoreLayout>
  );
}
