import { Html, Head, Main, NextScript } from "next/document";

const PIXEL_ID = process.env.NEXT_PUBLIC_PIXEL_ID || "1315836315668314";
const GTM_ID = process.env.NEXT_PUBLIC_GTM_ID || "";

// শুধু পাবলিক স্টোর পেজে ট্র্যাকিং চলবে — অ্যাডমিন/মেম্বার/লগইন পেজের ভিজিট পিক্সেলে যাবে না।
const SKIP = "admin|member|login|register|pending|notifications|notices|leaderboard|partner";
const TRACKING = `(function(){
if(/^\\/(${SKIP})(\\/|$)/.test(location.pathname))return;
window.__store=1;window.dataLayer=window.dataLayer||[];
${GTM_ID ? `(function(w,d,s,l,i){w[l].push({'gtm.start':new Date().getTime(),event:'gtm.js'});var f=d.getElementsByTagName(s)[0],j=d.createElement(s);j.async=true;j.src='https://www.googletagmanager.com/gtm.js?id='+i;f.parentNode.insertBefore(j,f);})(window,document,'script','dataLayer','${GTM_ID}');` : ""}
!function(f,b,e,v,n,t,s){if(f.fbq)return;n=f.fbq=function(){n.callMethod?n.callMethod.apply(n,arguments):n.queue.push(arguments)};if(!f._fbq)f._fbq=n;n.push=n;n.loaded=!0;n.version='2.0';n.queue=[];t=b.createElement(e);t.async=!0;t.src=v;s=b.getElementsByTagName(e)[0];s.parentNode.insertBefore(t,s)}(window,document,'script','https://connect.facebook.net/en_US/fbevents.js');
fbq('init','${PIXEL_ID}');fbq('track','PageView');
window.dataLayer.push({event:'page_view'});
})();`;

export default function Document() {
  return (
    <Html lang="bn">
      <Head>
        <link rel="icon" type="image/png" sizes="32x32" href="/favicon-32.png" />
        <link rel="icon" type="image/png" sizes="16x16" href="/favicon-16.png" />
        <link rel="apple-touch-icon" sizes="180x180" href="/apple-touch-icon.png" />
        <meta name="theme-color" content="#12213B" />
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="true" />
        <link
          href="https://fonts.googleapis.com/css2?family=Hind+Siliguri:wght@400;500;600;700&family=Manrope:wght@500;700;800&display=swap"
          rel="stylesheet"
        />
        <script dangerouslySetInnerHTML={{ __html: TRACKING }} />
      </Head>
      <body>
        <Main />
        <NextScript />
      </body>
    </Html>
  );
}
