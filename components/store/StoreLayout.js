import Head from "next/head";
import Link from "next/link";
import Logo from "../Logo";
import { track } from "../../lib/pixel";
import { RESELLER } from "../../lib/features";

const SITE = process.env.NEXT_PUBLIC_SITE_URL || "";

export default function StoreLayout({ settings, title, description, image, children }) {
  const s = settings || {};
  const pageTitle = title ? `${title} | ${s.storeName || "জলরাশি"}` : `${s.storeName || "জলরাশি"} — ${s.tagline || ""}`;
  const wa = s.whatsapp ? String(s.whatsapp).replace(/\D/g, "") : "";
  const tel = s.hotline ? String(s.hotline).replace(/[^\d+]/g, "") : "";

  return (
    <div className="st">
      <Head>
        <title>{pageTitle}</title>
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        {description && <meta name="description" content={description} />}
        <meta property="og:title" content={pageTitle} />
        {description && <meta property="og:description" content={description} />}
        {image && <meta property="og:image" content={image} />}
        <meta property="og:type" content="website" />
        {SITE && <meta property="og:site_name" content={s.storeName} />}
      </Head>

      {s.announcement && <div className="st-announce">{s.announcement}</div>}

      <header className="st-header">
        <Link href="/" className="st-logo" aria-label="হোম"><Logo height={34} /></Link>
        <nav className="st-nav">
          <Link href="/">হোম</Link>
          <Link href="/track">অর্ডার ট্র্যাক</Link>
          {tel && <a href={`tel:${tel}`} className="st-call" onClick={() => track("Contact", { content_name: "header_call" })}>📞 {s.hotline}</a>}
        </nav>
      </header>

      <main>{children}</main>

      <footer className="st-footer">
        <div className="st-wrap st-footer-grid">
          <div>
            <b>{s.storeName}</b>
            <p>{s.tagline}</p>
            {s.address && <p>{s.address}</p>}
          </div>
          <div>
            <b>যোগাযোগ</b>
            {s.hotline && <p>হটলাইন: <a href={`tel:${tel}`}>{s.hotline}</a></p>}
            {wa && <p>হোয়াটসঅ্যাপ: <a href={`https://wa.me/${wa}`}>{s.whatsapp}</a></p>}
            {s.facebookUrl && <p><a href={s.facebookUrl} target="_blank" rel="noreferrer">ফেসবুক পেজ</a></p>}
          </div>
          <div>
            <b>লিংক</b>
            <p><Link href="/track">অর্ডার ট্র্যাক করুন</Link></p>
            {RESELLER && <p><Link href="/partner">রিসেলার / পার্টনার হোন</Link></p>}
            {RESELLER && <p><Link href="/login">পার্টনার লগইন</Link></p>}
          </div>
        </div>
        <div className="st-copy">© {new Date().getFullYear()} {s.storeName} — সব অধিকার সংরক্ষিত</div>
      </footer>

      {wa && (
        <a
          className="st-wa" href={`https://wa.me/${wa}`} target="_blank" rel="noreferrer" aria-label="হোয়াটসঅ্যাপে মেসেজ করুন"
          onClick={() => track("Contact", { content_name: "whatsapp" })}
        >
          <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 12a8.5 8.5 0 0 1-12.6 7.4L3 21l1.6-5.2A8.5 8.5 0 1 1 21 12Z"/></svg>
        </a>
      )}
    </div>
  );
}
