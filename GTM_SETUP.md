# GTM সংযোগ — ধাপে ধাপে

## সাইটের দিক থেকে কী করা আছে
- সাইটে এখন GTM Web কন্টেইনার **GTM-P8FMFQD5 (Jolrasi.com)** লোড হয়।
- Pixel সরাসরি লোড হয় না (নইলে একই ইভেন্ট ২ বার গণনা হতো)। সব ইভেন্ট GTM এর dataLayer দিয়ে যায়।
- ইভেন্ট: page_view, view_item, add_to_cart, begin_checkout, purchase, search (GA4 ইকমার্স ফরম্যাট, event_id সহ)।
- purchase এ গ্রাহকের ফোন ও নাম (Advanced Matching) আর অর্ডার নাম্বারও যায়।

## GTM এ করণীয়
1. tagmanager.google.com → **Jolrasi.com** (GTM-P8FMFQD5) চাপুন।
2. **Admin** → **Import Container**।
3. **Choose container file** → `gtm/jolrasi-store-gtm-import.json` দিন।
4. **Workspace**: Existing → Default Workspace বাছুন।
5. **Import option**: **Merge** → **Rename conflicting tags, triggers, and variables** → **Confirm**।
6. **Tags** মেনুতে এখন ৬টা "JR - ..." ট্যাগ দেখবেন (PageView, ViewContent, AddToCart, InitiateCheckout, Purchase, Search)।
7. **আগের Meta Pixel ট্যাগ থাকলে** (যেমন "Facebook Pixel - PageView") সেটা Pause করুন, নইলে PageView/Purchase ২ বার যাবে।
8. উপরে **Preview** চাপুন → `https://jolrasi.com` দিন → Connect। প্রোডাক্টে ঢুকলে Tag Assistant এ "JR - Meta ViewContent" Fired দেখা উচিত।
9. Meta Events Manager → Pixel → **Test events** এ একই ইভেন্ট আসছে কিনা দেখুন।
10. সব ঠিক থাকলে GTM এর **Submit** → **Publish**।

## সার্ভার-সাইড (GTM-TFTHXNWN)
- Server কন্টেইনারে ডেটা পাঠাতে Web কন্টেইনারে Google ট্যাগ/GA4 ট্যাগে `server_container_url` লাগে। আপনার sGTM ডোমেইন ও GA4 Measurement ID দিলে সেটা যোগ করে দেব।
- sGTM দিয়ে Meta CAPI Purchase পাঠালে Vercel এ **FB_CAPI_TOKEN বসাবেন না**, নইলে সার্ভার থেকে Purchase ২ বার যাবে।

## মোড বদল
- ডিফল্ট: GTM মোড। সরাসরি Pixel চাইলে Vercel এ `NEXT_PUBLIC_TRACKING_MODE` = `direct` দিয়ে Redeploy করুন (তখন GTM লোড হয় না)।
