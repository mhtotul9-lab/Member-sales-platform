# Jolrasi Store — সেটআপ গাইড

## নতুন যোগ হওয়া ফাইল (পুরনো কোনো ফাইল বদলানো হয়নি)
- middleware.js — jolrasi.com এর হোম পেজে স্টোর দেখায়
- pages/store, pages/p/[slug].js, pages/order-success.js — কাস্টমারের পেজ
- pages/admin/store/* — স্টোর অ্যাডমিন
- pages/api/store/*, pages/api/admin/store/* — সার্ভার API
- lib/store/*, components/store/*, styles/store.module.css

## Vercel Environment Variables (Settings → Environment Variables)
STEADFAST_API_KEY      = (Steadfast প্যানেল থেকে)
STEADFAST_SECRET_KEY   = (Steadfast প্যানেল থেকে)
NEXT_PUBLIC_FB_PIXEL_ID = 1315836315668314   (না দিলেও এই ID-ই ব্যবহার হয়)
NEXT_PUBLIC_GTM_ID      = (ডিফল্ট GTM-P8FMFQD5)
NEXT_PUBLIC_TRACKING_MODE = gtm   (বা direct)

পরিবর্তনের পর Vercel → Deployments → Redeploy করতে হবে।

## ঐচ্ছিক: সার্ভার-সাইড Pixel (Conversions API)
FB_CAPI_TOKEN = (Meta Events Manager → Pixel → Settings → Conversions API → Generate access token)
FB_CAPI_TEST_CODE = (শুধু পরীক্ষার সময়, Test Events ট্যাবের কোড)

## পুরনো ফাইলে যে ৪টি পরিবর্তন (আপনার অনুরোধে)
- pages/login.js — লগইনের পর /go এ যায়
- pages/go.js (নতুন) — অ্যাডমিন হলে অ্যাডমিন প্যানেল, মেম্বার হলে মেম্বার প্যানেল
- components/Nav.js — অ্যাডমিন মেনুতে "স্টোর" লিংক
- pages/admin/dashboard.js — "ইকমার্স স্টোর ম্যানেজ করুন" বাটন

## জরুরি
- Firestore Rules বদলাতে হবে না (স্টোরের সব ডেটা সার্ভার API দিয়ে যায়)।
- নতুন Firestore collection: store_products, store_orders, store_images, store_settings
