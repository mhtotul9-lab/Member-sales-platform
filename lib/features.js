// রিসেলার/মেম্বার সিস্টেম বন্ধ রাখা (ডিফল্ট) — শুধু স্টোর + অ্যাডমিন।
// আবার চালু করতে Vercel-এ NEXT_PUBLIC_RESELLER_ENABLED=true দিন।
export const RESELLER = process.env.NEXT_PUBLIC_RESELLER_ENABLED === "true";
