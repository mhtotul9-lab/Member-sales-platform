# Member Sales Platform — Phase 0 + Phase 1 + Phase 2 + Phase 3 + Phase 4

এই ভার্সনে আছে:
- প্রজেক্ট স্ট্রাকচার, Firebase সেটআপ
- রেজিস্ট্রেশন → অ্যাডমিন অ্যাপ্রুভাল → লগইন ফ্লো
- প্রোডাক্ট ম্যানেজমেন্ট (অ্যাডমিন: তৈরি/এডিট/স্ট্যাটাস পরিবর্তন) + মার্কেটিং কিট (external image/video URL + কপি-করা-যায় এমন ক্যাপশন)
- মেম্বার প্রোডাক্ট ব্রাউজিং (সার্চ, ক্যাটাগরি ফিল্টার, ডিটেইল পেজ)
- **অর্ডার সাবমিশন** (মেম্বার) + **অ্যাডমিন ভেরিফিকেশন** (approve/reject/processing/delivered/completed/cancelled/returned/refunded) + টাইমলাইন
- **Duplicate/fraud flag**: একই মেম্বার ২৪ ঘণ্টার মধ্যে একই কাস্টমার+প্রোডাক্টে দ্বিতীয়বার সাবমিট করলে ব্লক হবে; ভিন্ন মেম্বার একই ফোন নম্বর ব্যবহার করলে বা কেউ ঘন ঘন অর্ডার দিলে অ্যাডমিনের জন্য ⚠ ফ্ল্যাগ দেখাবে (ব্লক করবে না, শুধু সতর্ক করবে)
- **Active/Inactive সিস্টেম**: গত ৭ দিনে (কনফিগারযোগ্য) অন্তত ১টা অ্যাপ্রুভড+এখনো-ভ্যালিড সেল না থাকলে মেম্বার "ইনঅ্যাক্টিভ" — মেম্বার ওয়ালেট পেজ খুললে রিয়েল-টাইমে রিক্যালকুলেট হয়
- **Profit Pool + Wallet Ledger**: অর্ডার Approve হলে সেই মুহূর্তের eligible active member স্ন্যাপশট নিয়ে প্রফিট সমানভাবে ভাগ হয়, প্রতিটা মেম্বারের জন্য একটা immutable transaction তৈরি হয় এবং wallet balance আপডেট হয়। Return/Refund/Cancel হলে original transaction মুছে না ফেলে উল্টো একটা adjustment transaction তৈরি হয় (history অক্ষত থাকে)
- **অ্যাডমিন প্রফিট ভিউ** (`/admin/profit`): মোট পুল, বিতরণ, প্রতিটা পুলের eligible member সংখ্যা ও জনপ্রতি ভাগ

এখনো নেই (পরের ফেজে আসবে): উইথড্র রিকোয়েস্ট, লিডারবোর্ড, নোটিফিকেশন, ট্রেনিং, রিপোর্ট/অডিট লগ UI, রোল ম্যানেজমেন্ট, সেটিংস প্যানেল।

## Phase 4-এর গুরুত্বপূর্ণ ডিজাইন নোট

- মেম্বারের দুইটা আলাদা "স্ট্যাটাস" আছে, গুলিয়ে ফেলবেন না:
  - `status` (`members` কালেকশনে) = **অ্যাকাউন্ট অ্যাপ্রুভাল** স্ট্যাটাস — pending/active/rejected/suspended (Phase 1)
  - `activityStatus` = **সেলস অ্যাক্টিভিটি** স্ট্যাটাস — active/inactive, রোলিং ৭ দিনের সেল-ভিত্তিক নিয়ম (Phase 4)। এটা মেম্বার ওয়ালেট পেজ (`/member/wallet`) খুললে রিফ্রেশ হয়।
- প্রফিট-ভাগের eligible-member লিস্ট আমাদের বাজেট-বান্ধব আর্কিটেকচারে (কোনো Cloud Function/cron ছাড়া) প্রতিটা approval-এর সময় সরাসরি হিসাব করে বের করা হয় — মেম্বার সংখ্যা কয়েকশো পর্যন্ত এভাবে ঠিকঠাক চলবে। ভবিষ্যতে মেম্বার সংখ্যা অনেক বেড়ে গেলে (হাজার+) এটাকে queue/Cloud Function ভিত্তিক করা ভালো হবে — এখন তার দরকার নেই।

## Firestore Index সংক্রান্ত জরুরি নোট

এই ফেজের কিছু ফিচার (মেম্বার/প্রোডাক্ট/অর্ডার লিস্ট, ডুপ্লিকেট চেক) একসাথে একাধিক ফিল্ড দিয়ে ফিল্টার+সর্ট করে, যার জন্য Firestore-এ "composite index" লাগে। এগুলো আগে থেকে তৈরি করা নেই।

**যা করতে হবে**: অ্যাপ ব্যবহার করার সময় (যেমন প্রথমবার প্রোডাক্ট লিস্ট লোড করা, বা অর্ডার সাবমিট করা) যদি এরর মেসেজে **"The query requires an index"** লেখা দেখেন — মেসেজের ভেতরে একটা লিংক থাকবে। সেই লিংকে ক্লিক করলে সরাসরি Firebase Console-এ ইনডেক্স তৈরির পেজ খুলবে, যেখানে সব ফিল্ড আগে থেকেই সঠিকভাবে বসানো থাকবে — শুধু **Create Index** বাটনে ক্লিক করবেন। ইনডেক্স তৈরি হতে ১-৫ মিনিট লাগতে পারে, এর মধ্যে পেজ রিফ্রেশ করলে কাজ করবে।

এটা ভয়ের কিছু না, বরং Firebase-এর স্বাভাবিক নিয়ম — প্রতিটা নতুন ধরনের কোয়েরির জন্য একবার করে এই কাজ করতে হয়।

## ১) Firebase প্রজেক্ট তৈরি

1. https://console.firebase.google.com এ যান → **Add project** → নাম দিন (যেমন `sales-partner`) → তৈরি করুন।
2. বাম মেনু থেকে **Build → Authentication** → **Get started** → **Sign-in method** ট্যাবে যান → **Email/Password** enable করুন।
3. বাম মেনু থেকে **Build → Firestore Database** → **Create database** → **Production mode** সিলেক্ট করে আপনার কাছের region (যেমন `asia-south1`) বেছে নিন।
4. **Project settings** (গিয়ার আইকন) → **General** ট্যাবের নিচে **Your apps** → `</>` (Web) আইকনে ক্লিক করে একটা Web App যোগ করুন। এখানে যে `firebaseConfig` অবজেক্ট দেখাবে, সেটার মান দিয়ে `.env.local` এর `NEXT_PUBLIC_FIREBASE_*` ভ্যারিয়েবলগুলো পূরণ করবেন।
5. **Project settings → Service accounts** ট্যাবে যান → **Generate new private key** → একটা JSON ফাইল ডাউনলোড হবে। এই ফাইলের `project_id`, `client_email`, আর `private_key` — এই তিনটা মান দিয়ে `.env.local` এর `FIREBASE_ADMIN_*` ভ্যারিয়েবলগুলো পূরণ করবেন (private_key এর ভিতরের `\n` গুলো ঠিক তেমনই রাখবেন, এক লাইনে পুরো স্ট্রিং)।

## ২) লোকাল সেটআপ

```bash
cp .env.local.example .env.local
# এবার .env.local ফাইলটা উপরের ধাপ থেকে পাওয়া মান দিয়ে পূরণ করুন

npm install
npm run dev
```

ব্রাউজারে http://localhost:3000 খুলে `/register` দিয়ে একটা টেস্ট অ্যাকাউন্ট খুলুন।

## ৩) প্রথম অ্যাডমিন তৈরি করা

Firestore Rules-এ সবকিছু ডিফল্টভাবে admin-only, তাই প্রথম অ্যাডমিনকে ম্যানুয়ালি সেট করতে হয়:

```bash
npm run set-admin -- your-email@example.com
```

এই কমান্ড আপনার অ্যাকাউন্টে `admin: true` কাস্টম ক্লেইম আর Firestore-এ `role: admin, status: active` সেট করে দেবে। এরপর ঐ অ্যাকাউন্ট দিয়ে লগ আউট করে আবার লগইন করুন — তাহলে `/admin/dashboard` এ যাবে।

## ৪) Firestore Security Rules আপলোড করা

1. Firebase Console → **Firestore Database → Rules** ট্যাবে যান।
2. এই রিপোর জোর `firestore.rules` ফাইলের পুরো কনটেন্ট কপি করে ওখানে পেস্ট করুন → **Publish**।

## ৫) GitHub-এ পুশ করা

```bash
git init
git add .
git commit -m "Phase 0 + Phase 1: auth and admin approval flow"
git branch -M main
git remote add origin https://github.com/<your-username>/member-sales-platform.git
git push -u origin main
```

## ৬) Vercel-এ ডিপ্লয়

1. https://vercel.com এ গিয়ে GitHub দিয়ে লগইন করুন।
2. **Add New → Project** → আপনার `member-sales-platform` রিপো সিলেক্ট করুন → **Import**।
3. **Environment Variables** সেকশনে গিয়ে `.env.local` এর প্রতিটা ভ্যারিয়েবল একই নাম আর মান দিয়ে যোগ করুন (৭টা `NEXT_PUBLIC_FIREBASE_*` + ৩টা `FIREBASE_ADMIN_*`)। `FIREBASE_ADMIN_PRIVATE_KEY` পেস্ট করার সময় পুরো স্ট্রিং (BEGIN/END লাইনসহ) এক লাইনে দিন, Vercel নিজে থেকেই `\n` ঠিকমতো হ্যান্ডেল করবে।
4. **Deploy** ক্লিক করুন। কয়েক মিনিটের মধ্যে একটা লাইভ URL পাবেন (যেমন `member-sales-platform.vercel.app`)।

এরপর থেকে যতবার আপনি `main` ব্র্যাঞ্চে পুশ করবেন, Vercel অটোমেটিক্যালি নতুন ভার্সন ডিপ্লয় করবে।

## খরচ সংক্রান্ত নোট

- Firebase **Spark (Free) plan** ব্যবহার হচ্ছে — কোনো কার্ড লাগবে না। Cloud Functions ব্যবহার করা হয়নি, তার বদলে সব সার্ভার-সাইড লজিক Next.js API Routes হিসেবে লেখা, যেটা Vercel-এর ফ্রি টায়ারে চলে।
- Firestore ফ্রি কোটা: প্রতিদিন ৫০,০০০ read এবং ২০,০০০ write — শুরুর দিকে যথেষ্ট।
- প্রোডাক্ট ইমেজ/ভিডিওর জন্য Firebase Storage ব্যবহার করবেন না (এটা পেইড হয়ে যেতে পারে) — পরের ফেজে external URL (ImgBB / Cloudinary ফ্রি টায়ার / YouTube লিংক) ব্যবহার করা হবে, যেভাবে স্পেকেও বলা আছে।

## পরের ফেজ

Phase 2: প্রোডাক্ট ম্যানেজমেন্ট + মার্কেটিং কিট (external media URL)।
