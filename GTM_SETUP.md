# GTM ও পিক্সেল — আপনার আগের কন্টেইনারের সাথে

আপনার GTM-P8FMFQD5 এ WordPress আমলের সব ট্যাগ (Facebook Pixel, FB | SS সার্ভার ট্যাগ, TikTok) আগে থেকেই আছে।
তাই আগে দেওয়া `jolrasi-store-gtm-import.json` **ইম্পোর্ট করবেন না** — ওটা ডুপ্লিকেট ট্যাগ বানাত।

## সাইট এখন যা পাঠায় (dataLayer)
view_item, add_to_cart, begin_checkout, add_shipping_info, add_payment_info, purchase, search
- `ecommerce.items[]` (item_id, item_name, item_brand, item_category, price, quantity), `ecommerce.value`, `ecommerce.currency`
- একই তথ্য টপ-লেভেলেও: value, currency, transaction_id, content_ids, content_name
- purchase এ: `customer` (phone, first_name, last_name, country, fbp, fbc) ও `user_data`

## আপনার ট্রিগারের সাথে মিল
- cEvent-begin_checkout এ শর্ত "Page URL contains /checkout" আছে। সাইটে চেকআউট পেজ নেই, তাই ফর্মে লেখা শুরু হলে URL এর শেষে `#/checkout` বসে (পেজ রিলোড হয় না)।
  Preview এ begin_checkout ফায়ার না করলে ট্রিগার খুলে ওই শর্তটা মুছে "All Custom Events" করে দিন।

## পরীক্ষা: jolrasi.com/tracking-check
পেজটা খুললে ৪ সেকেন্ড পর দেখায়: GTM লোড হলো কিনা, কোন Pixel ID চালু, Facebook এ কোন ইভেন্ট গেল, সার্ভার কন্টেইনারের হোস্ট, ব্লকার আছে কিনা।
"টেস্ট ইভেন্ট পাঠান" চাপলে একটা ViewContent পাঠিয়ে দেখায় GTM থেকে Pixel এ গেল কিনা।

## মোড বদল
ডিফল্ট GTM মোড। Vercel এ `NEXT_PUBLIC_TRACKING_MODE`=`direct` দিলে GTM বাদ, সরাসরি Pixel (শুধু জরুরি অবস্থায়)।
sGTM দিয়ে Meta CAPI পাঠালে Vercel এ `FB_CAPI_TOKEN` বসাবেন না (Purchase ২ বার যাবে)।
