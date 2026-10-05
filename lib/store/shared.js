// স্টোরের শেয়ার্ড হেল্পার — সার্ভার ও ব্রাউজার দুই জায়গাতেই চলে।

const BN_DIGITS = "০১২৩৪৫৬৭৮৯";

export function toBnDigits(str) {
  return String(str).replace(/[0-9]/g, (d) => BN_DIGITS[d]);
}

export function fmtPrice(n) {
  const num = Math.round(Number(n) || 0);
  return "৳" + toBnDigits(num.toLocaleString("en-US"));
}

// বাংলাদেশি মোবাইল নাম্বার ঠিক করে (০১XXXXXXXXX)। ভুল হলে null।
export function normalizePhone(raw) {
  let s = String(raw || "").replace(/[০-৯]/g, (d) => BN_DIGITS.indexOf(d));
  s = s.replace(/\D/g, "");
  if (s.startsWith("8801") && s.length === 13) s = s.slice(2);
  else if (s.startsWith("1") && s.length === 10) s = "0" + s;
  return /^01[3-9]\d{8}$/.test(s) ? s : null;
}

// ঠিকানায় "ঢাকা"/"Dhaka" থাকলে ঢাকার ভেতরের চার্জ ধরা হয়।
export function isInsideDhaka(address) {
  return /ঢাকা|dhaka/i.test(String(address || ""));
}

export function calcDelivery(settings, subtotal, address) {
  const free = Number(settings.freeDeliveryAbove) || 0;
  if (free > 0 && subtotal >= free) return 0;
  return isInsideDhaka(address) ? Number(settings.deliveryInsideDhaka) || 0 : Number(settings.deliveryOutsideDhaka) || 0;
}

export function discountPercent(price, compare) {
  const p = Number(price) || 0;
  const c = Number(compare) || 0;
  if (c > p && p > 0) return Math.round(((c - p) / c) * 100);
  return 0;
}

export function slugify(name) {
  const ascii = String(name || "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 40);
  const rand = Math.random().toString(36).slice(2, 7);
  return `${ascii || "product"}-${rand}`;
}

export const ORDER_STATUSES = {
  new: { text: "নতুন", cls: "stamp-pending" },
  confirmed: { text: "কনফার্মড", cls: "stamp-active" },
  no_answer: { text: "ফোন ধরেনি", cls: "stamp-pending" },
  shipped: { text: "কুরিয়ারে", cls: "stamp-active" },
  delivered: { text: "ডেলিভার্ড", cls: "stamp-active" },
  cancelled: { text: "বাতিল", cls: "stamp-rejected" },
  returned: { text: "রিটার্ন", cls: "stamp-rejected" },
};

export const COURIER_STATUS_TEXT = {
  pending: "পেন্ডিং",
  in_review: "রিভিউতে",
  hold: "হোল্ড",
  delivered: "ডেলিভার্ড",
  partial_delivered: "আংশিক ডেলিভার্ড",
  cancelled: "বাতিল/রিটার্ন",
  unknown: "অজানা",
  delivered_approval_pending: "ডেলিভার্ড (অ্যাপ্রুভাল বাকি)",
  partial_delivered_approval_pending: "আংশিক ডেলিভার্ড (অ্যাপ্রুভাল বাকি)",
  cancelled_approval_pending: "বাতিল (অ্যাপ্রুভাল বাকি)",
  unknown_approval_pending: "অজানা (অ্যাপ্রুভাল বাকি)",
};

export const DEFAULT_SETTINGS = {
  storeName: "জলরাশি",
  tagline: "সেরা মানের পণ্য, সারা বাংলাদেশে ক্যাশ অন ডেলিভারি",
  announcement: "🚚 সারা বাংলাদেশে ক্যাশ অন ডেলিভারি — পণ্য হাতে পেয়ে টাকা দিন",
  heroTitle: "পছন্দের পণ্য, ঘরে বসেই অর্ডার করুন",
  heroSub: "শুধু নাম, মোবাইল নাম্বার আর ঠিকানা দিন — বাকিটা আমরা দেখব। পণ্য হাতে পেয়ে টাকা পরিশোধ করুন।",
  phone: "",
  whatsapp: "",
  address: "",
  facebookUrl: "",
  deliveryInsideDhaka: 60,
  deliveryOutsideDhaka: 120,
  freeDeliveryAbove: 0,
  deliveryNote: "অর্ডার কনফার্মের পর ২-৫ কর্মদিবসের মধ্যে ডেলিভারি দেওয়া হয়।",
};
