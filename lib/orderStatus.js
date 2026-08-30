export const ORDER_STATUS_LABELS = {
  submitted: { text: "সাবমিটেড", cls: "stamp-pending" },
  under_review: { text: "রিভিউ চলছে", cls: "stamp-pending" },
  approved: { text: "অ্যাপ্রুভড", cls: "stamp-active" },
  rejected: { text: "রিজেক্টেড", cls: "stamp-rejected" },
  processing: { text: "প্রসেসিং", cls: "stamp-active" },
  delivered: { text: "ডেলিভার্ড", cls: "stamp-active" },
  completed: { text: "সম্পন্ন", cls: "stamp-active" },
  cancelled: { text: "বাতিল", cls: "stamp-rejected" },
  returned: { text: "রিটার্ন", cls: "stamp-rejected" },
  refunded: { text: "রিফান্ড", cls: "stamp-rejected" },
};

export const RISK_FLAG_LABELS = {
  shared_customer_across_members: "একই কাস্টমার অন্য মেম্বারও সম্প্রতি ব্যবহার করেছে",
  high_frequency_submission: "স্বল্প সময়ে অনেকগুলো অর্ডার সাবমিট হয়েছে",
};
