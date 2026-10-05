import { useEffect, useState } from "react";
import Link from "next/link";
import StoreLayout from "../components/store/StoreLayout";
import { getStoreSettings, publicSettings } from "../lib/storefront";
import { taka } from "../components/store/ProductCard";

export async function getServerSideProps() {
  return { props: { settings: publicSettings(await getStoreSettings()) } };
}

export default function OrderSuccess({ settings }) {
  const [info, setInfo] = useState(null);
  useEffect(() => {
    try {
      const last = JSON.parse(sessionStorage.getItem("lastOrder") || "null");
      const o = new URLSearchParams(location.search).get("o");
      setInfo(last && last.orderId === o ? last : o ? { orderId: o } : null);
    } catch {}
  }, []);
  const wa = settings.whatsapp ? String(settings.whatsapp).replace(/\D/g, "") : "";

  return (
    <StoreLayout settings={settings} title="অর্ডার সম্পন্ন">
      <div className="st-wrap st-center">
        <div className="st-ok" aria-hidden="true">✓</div>
        <h1>ধন্যবাদ! আপনার অর্ডার পাওয়া গেছে</h1>
        {info?.orderId && (
          <p className="st-orderid">অর্ডার নম্বর: <b>{info.orderId}</b>{info.total ? <> · মোট {taka(info.total)} (ক্যাশ অন ডেলিভারি)</> : null}</p>
        )}
        <p>আমাদের প্রতিনিধি খুব শীঘ্রই আপনার নম্বরে ফোন করে অর্ডার কনফার্ম করবেন। অনুগ্রহ করে ফোন রিসিভ করবেন।</p>
        <div className="st-actions">
          <Link href="/track" className="st-btn">অর্ডার ট্র্যাক করুন</Link>
          <Link href="/" className="st-btn st-btn-ghost">আরও প্রোডাক্ট দেখুন</Link>
          {wa && <a className="st-btn st-btn-ghost" href={`https://wa.me/${wa}`}>হোয়াটসঅ্যাপে মেসেজ</a>}
        </div>
      </div>
    </StoreLayout>
  );
}
