import Head from "next/head";
import Logo from "../Logo";
import s from "../../styles/store.module.css";
import { PIXEL_ID, pixelBaseCode, GTM_ID, gtmCode } from "../../lib/store/pixel";

// স্টোরের সব পেজের কাঠামো + Pixel/GTM কোড।
export default function StoreLayout({ settings, title, description, image, children, search, onSearch, hideFooter }) {
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
        <script dangerouslySetInnerHTML={{ __html: "window.dataLayer=window.dataLayer||[];" }} />
        {GTM_ID && <script dangerouslySetInnerHTML={{ __html: gtmCode }} />}
        <script dangerouslySetInnerHTML={{ __html: pixelBaseCode }} />
      </Head>
      <noscript>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img height="1" width="1" style={{ display: "none" }} alt="" src={`https://www.facebook.com/tr?id=${PIXEL_ID}&ev=PageView&noscript=1`} />
      </noscript>

      {settings.announcement && <div className={s.announce}>{settings.announcement}</div>}

      <header className={s.header}>
        <div className={`${s.wrap} ${s.headerRow}`}>
          <a href="/" aria-label={settings.storeName}><Logo height={38} /></a>
          {onSearch ? (
            <div className={s.search}>
              <svg className={s.searchIcon} width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><circle cx="11" cy="11" r="7" /><path d="m21 21-4.3-4.3" /></svg>
              <input value={search} onChange={(e) => onSearch(e.target.value)} placeholder="পণ্য খুঁজুন..." aria-label="পণ্য খুঁজুন" />
            </div>
          ) : <div style={{ flex: 1 }} />}
          {telLink && <a className={s.callBtn} href={telLink}>📞 <span>{settings.phone}</span></a>}
        </div>
      </header>

      {children}

      {!hideFooter && (
        <footer className={s.footer}>
          <div className={`${s.wrap} ${s.footerGrid}`}>
            <div>
              <h4>{settings.storeName}</h4>
              <p style={{ margin: 0, fontSize: "0.93rem" }}>{settings.tagline}</p>
            </div>
            <div>
              <h4>যোগাযোগ</h4>
              {settings.phone && <a href={telLink}>📞 {settings.phone}</a>}
              {waLink && <a href={waLink} target="_blank" rel="noreferrer">💬 WhatsApp</a>}
              {settings.address && <span style={{ fontSize: "0.93rem" }}>📍 {settings.address}</span>}
            </div>
            <div>
              <h4>ডেলিভারি</h4>
              <span style={{ fontSize: "0.93rem" }}>{settings.deliveryNote}</span>
              {settings.facebookUrl && <a href={settings.facebookUrl} target="_blank" rel="noreferrer" style={{ marginTop: 8 }}>👍 Facebook পেজ</a>}
            </div>
          </div>
          <div className={`${s.wrap} ${s.copy}`}>© {new Date().getFullYear()} {settings.storeName} — সর্বস্বত্ব সংরক্ষিত</div>
        </footer>
      )}

      {(waLink || telLink) && (
        <div className={s.float}>
          {waLink && <a className={s.floatBtn} style={{ background: "#25D366" }} href={waLink} target="_blank" rel="noreferrer" aria-label="WhatsApp">💬</a>}
          {telLink && <a className={s.floatBtn} style={{ background: "#12213B" }} href={telLink} aria-label="ফোন করুন">📞</a>}
        </div>
      )}
    </div>
  );
}
