import { useState } from "react";
import Head from "next/head";
import Logo from "../Logo";
import { catSlug } from "../../lib/store/shared";
import s from "../../styles/store.module.css";
import { PIXEL_ID, pixelBaseCode, GTM_ID, gtmCode, TRACKING_MODE } from "../../lib/store/pixel";

const NAV = [
  { href: "/", label: "হোম" },
  { href: "/#products", label: "সব পণ্য" },
  { href: "/track", label: "অর্ডার ট্র্যাক" },
  { href: "#contact", label: "যোগাযোগ" },
];

// স্টোরের সব পেজের কাঠামো (হেডার, ফুটার, Pixel/GTM)।
export default function StoreLayout({ settings, title, description, image, children, search, onSearch, hideFooter, categories = [] }) {
  const [menu, setMenu] = useState(false);
  const waLink = settings.whatsapp ? `https://wa.me/${settings.whatsapp}` : "";
  const telLink = settings.phone ? `tel:${settings.phone.replace(/\s/g, "")}` : "";
  return (
    <div className={s.page}>
      <Head>
        <title>{title || `${settings.storeName} — অনলাইন শপ`}</title>
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <meta name="description" content={description || settings.tagline} />
        <meta property="og:title" content={title || settings.storeName} />
        <meta property="og:description" content={description || settings.tagline} />
        <meta property="og:type" content="website" />
        {image && <meta property="og:image" content={image} />}
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="" />
        <link href="https://fonts.googleapis.com/css2?family=Noto+Serif+Bengali:wght@500;600;700&display=swap" rel="stylesheet" />
        <script dangerouslySetInnerHTML={{ __html: "window.dataLayer=window.dataLayer||[];" }} />
        {TRACKING_MODE === "gtm" && GTM_ID && <script dangerouslySetInnerHTML={{ __html: gtmCode }} />}
        {TRACKING_MODE === "direct" && <script dangerouslySetInnerHTML={{ __html: pixelBaseCode }} />}
      </Head>
      <noscript>
        {TRACKING_MODE === "gtm" && GTM_ID ? (
          <iframe src={`https://www.googletagmanager.com/ns.html?id=${GTM_ID}`} height="0" width="0" style={{ display: "none", visibility: "hidden" }} title="gtm" />
        ) : (
          // eslint-disable-next-line @next/next/no-img-element
          <img height="1" width="1" style={{ display: "none" }} alt="" src={`https://www.facebook.com/tr?id=${PIXEL_ID}&ev=PageView&noscript=1`} />
        )}
      </noscript>

      <div className={s.topbar}>
        <div className={`${s.wrap} ${s.topbarRow}`}>
          <span className={s.topbarSide}>{settings.phone && <a href={telLink}>📞 {settings.phone}</a>}</span>
          <span className={s.topbarMsg}>{settings.announcement || "সারা বাংলাদেশে ক্যাশ অন ডেলিভারি"}</span>
          <span className={s.topbarSide} style={{ textAlign: "right" }}><a href="/track">📦 অর্ডার ট্র্যাক</a></span>
        </div>
      </div>

      <header className={s.header}>
        <div className={`${s.wrap} ${s.headerRow}`}>
          <a href="/" aria-label={settings.storeName}><Logo height={40} /></a>
          <nav className={s.nav}>{NAV.map((n) => <a key={n.label} href={n.href}>{n.label}</a>)}</nav>
          <div className={s.headerRight}>
            {onSearch && (
              <div className={s.search}>
                <svg className={s.searchIcon} width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><circle cx="11" cy="11" r="7" /><path d="m21 21-4.3-4.3" /></svg>
                <input value={search} onChange={(e) => onSearch(e.target.value)} placeholder="পণ্য খুঁজুন..." aria-label="পণ্য খুঁজুন" />
              </div>
            )}
            {telLink && <a className={s.callBtn} href={telLink}>📞 <span>{settings.phone}</span></a>}
            <button className={s.burger} onClick={() => setMenu(true)} aria-label="মেনু">☰</button>
          </div>
        </div>
      </header>

      <div className={`${s.drawer} ${menu ? s.drawerOn : ""}`} onClick={() => setMenu(false)}>
        <div className={s.drawerPanel} onClick={(e) => e.stopPropagation()}>
          <button className={s.burger} style={{ alignSelf: "flex-end", marginBottom: 8 }} onClick={() => setMenu(false)} aria-label="বন্ধ করুন">✕</button>
          {NAV.map((n) => <a key={n.label} href={n.href} onClick={() => setMenu(false)}>{n.label}</a>)}
          {categories.slice(0, 8).map((c) => <a key={c} href={`/category/${encodeURI(catSlug(c))}`} style={{ paddingLeft: 20, fontSize: ".92rem" }}>› {c}</a>)}
          {telLink && <a href={telLink}>📞 কল করুন</a>}
          {waLink && <a href={waLink} target="_blank" rel="noreferrer">💬 WhatsApp</a>}
        </div>
      </div>

      {children}

      {!hideFooter && (
        <footer className={s.footer} id="contact">
          <div className={`${s.wrap} ${s.footerTop}`}>
            <div className={s.footBrand}>
              <span className={s.logoBox}><Logo height={38} /></span>
              <p>{settings.tagline}</p>
              <div className={s.social}>
                {settings.facebookUrl && <a href={settings.facebookUrl} target="_blank" rel="noreferrer" aria-label="Facebook">f</a>}
                {waLink && <a href={waLink} target="_blank" rel="noreferrer" aria-label="WhatsApp">💬</a>}
                {telLink && <a href={telLink} aria-label="ফোন">📞</a>}
              </div>
            </div>
            <div>
              <h4>দ্রুত লিংক</h4>
              <a href="/">হোম</a>
              <a href="/#products">সব পণ্য</a>
              <a href="/track">অর্ডার ট্র্যাক করুন</a>
              <a href="https://jolrasipartner.vercel.app" target="_blank" rel="noreferrer">রিসেলার/পার্টনার হোন</a>
              <a href="/login">পার্টনার লগইন</a>
            </div>
            <div>
              <h4>ক্যাটাগরি</h4>
              {categories.slice(0, 6).map((c) => <a key={c} href={`/category/${encodeURI(catSlug(c))}`}>{c}</a>)}
              {categories.length === 0 && <a href="/#products">সব কালেকশন</a>}
            </div>
            <div>
              <h4>যোগাযোগ</h4>
              {settings.phone && <a href={telLink}>📞 {settings.phone}</a>}
              {waLink && <a href={waLink} target="_blank" rel="noreferrer">💬 WhatsApp এ মেসেজ</a>}
              {settings.address && <span className="fl" style={{ display: "block", fontSize: ".92rem", marginBottom: 9 }}>📍 {settings.address}</span>}
              <h4 style={{ marginTop: 16 }}>পেমেন্ট</h4>
              <div className={s.pay}><span>💵 ক্যাশ অন ডেলিভারি</span></div>
            </div>
          </div>
          <div className={`${s.wrap} ${s.footerBottom}`}>
            <span>© {new Date().getFullYear()} {settings.storeName} — সর্বস্বত্ব সংরক্ষিত</span>
            <span>{settings.deliveryNote}</span>
          </div>
        </footer>
      )}

      {(waLink || telLink) && (
        <div className={s.float}>
          {waLink && <a className={s.floatBtn} style={{ background: "#25D366" }} href={waLink} target="_blank" rel="noreferrer" aria-label="WhatsApp">💬</a>}
          {telLink && <a className={s.floatBtn} style={{ background: "#8B1E3F" }} href={telLink} aria-label="ফোন করুন">📞</a>}
        </div>
      )}
    </div>
  );
}
