// Server-only: স্টোরের পাবলিক ডেটা (cost price/কমিশন কখনো বের হয় না)।
import { adminDb } from "./firebaseAdmin";

export const STORE_DEFAULTS = {
  storeName: "জলরাশি",
  tagline: "সারাদেশে ক্যাশ অন ডেলিভারি",
  hotline: "",
  whatsapp: "",
  facebookUrl: "",
  address: "",
  announcement: "",
  heroTitle: "পছন্দের পণ্য, ঘরে বসেই অর্ডার করুন",
  heroSubtitle: "শুধু নাম, মোবাইল নম্বর আর ঠিকানা দিন — পণ্য হাতে পেয়ে টাকা দিন।",
  heroImageUrl: "",
  deliveryCharge: 0,
  freeDeliveryAbove: 0,
  orderingEnabled: true,
  blockedPhones: [],
};

export async function getStoreSettings() {
  const snap = await adminDb.collection("settings").doc("store").get();
  return { ...STORE_DEFAULTS, ...(snap.exists ? snap.data() : {}) };
}

export function publicSettings(s) {
  const { blockedPhones, ...rest } = s;
  return rest;
}

export function deliveryFor(settings, orderAmount) {
  const fee = Number(settings.deliveryCharge) || 0;
  const free = Number(settings.freeDeliveryAbove) || 0;
  return free > 0 && orderAmount >= free ? 0 : fee;
}

export function isStoreVisible(d) {
  return ["active", "out_of_stock"].includes(d.status) && d.showOnStore !== false;
}

export function toCard(id, d) {
  return {
    id,
    name: d.name || "",
    category: d.category || "",
    sellingPrice: Number(d.sellingPrice) || 0,
    comparePrice: Number(d.comparePrice) || 0,
    mainImageUrl: d.mainImageUrl || (d.imageUrls && d.imageUrls[0]) || "",
    outOfStock: d.status === "out_of_stock",
  };
}

export function toDetail(id, d) {
  return {
    ...toCard(id, d),
    shortDescription: d.shortDescription || "",
    fullDescription: d.fullDescription || "",
    imageUrls: Array.isArray(d.imageUrls) ? d.imageUrls : [],
    videoUrls: Array.isArray(d.videoUrls) ? d.videoUrls : [],
  };
}

// শুধু createdAt-এর auto index লাগে — নতুন composite index বানাতে হয় না।
export async function getStoreProducts() {
  const snap = await adminDb.collection("products").orderBy("createdAt", "desc").limit(300).get();
  return snap.docs.filter((d) => isStoreVisible(d.data())).map((d) => ({ id: d.id, data: d.data() }));
}

export async function getStoreProduct(id) {
  if (!id) return null;
  const snap = await adminDb.collection("products").doc(String(id)).get();
  if (!snap.exists || !isStoreVisible(snap.data())) return null;
  return { id: snap.id, data: snap.data() };
}
