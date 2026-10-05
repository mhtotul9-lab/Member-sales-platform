// বাংলাদেশি মোবাইল নম্বর — ব্রাউজার ও সার্ভার দুই জায়গাতেই ব্যবহার হয়।
const BN = "০১২৩৪৫৬৭৮৯";

export function normalizeBdPhone(input) {
  let s = String(input || "").replace(/[০-৯]/g, (d) => BN.indexOf(d)).replace(/\D/g, "");
  if (s.startsWith("880")) s = "0" + s.slice(3);
  else if (s.length === 10 && s.startsWith("1")) s = "0" + s;
  return s;
}

export const isValidBdPhone = (s) => /^01[3-9]\d{8}$/.test(s);

// Meta/GTM-এর জন্য আন্তর্জাতিক ফরম্যাট (8801XXXXXXXXX)
export const toIntlPhone = (s) => "88" + s;
