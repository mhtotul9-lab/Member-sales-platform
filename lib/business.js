// Server-only. Import only from /pages/api/** files.
import { adminDb, VALID_SALE_STATUSES } from "./firebaseAdmin";
import { FieldValue } from "firebase-admin/firestore";

const SETTINGS_DEFAULTS = {
  activeDays: 7,
  minApprovedSalesForActive: 1,
  minWithdrawalAmount: 100,
  paymentMethods: ["bkash", "nagad", "rocket", "bank"],
};

export async function getSettings() {
  const snap = await adminDb.collection("settings").doc("business").get();
  return { ...SETTINGS_DEFAULTS, ...(snap.exists ? snap.data() : {}) };
}

function cutoffIso(activeDays) {
  return new Date(Date.now() - activeDays * 24 * 60 * 60 * 1000).toISOString();
}

// Rolling-window check: does this member have at least
// settings.minApprovedSalesForActive currently-valid (approved/processing/
// delivered/completed, i.e. never returned/refunded/rejected/cancelled
// afterward) sales approved within the last N days?
export async function isMemberActive(uid, settings) {
  const s = settings || (await getSettings());
  const snap = await adminDb
    .collection("orders")
    .where("memberId", "==", uid)
    .where("status", "in", VALID_SALE_STATUSES)
    .where("approvedAt", ">=", cutoffIso(s.activeDays))
    .get();
  return snap.size >= s.minApprovedSalesForActive;
}

// The "snapshot" used for profit sharing: every member who (a) currently has
// a qualifying sale inside the rolling window AND (b) is still an
// account-approved member right now. Taken at approval time, then frozen
// forever inside the profitPools document — later membership changes never
// rewrite history (section 15 of the spec).
export async function getEligibleActiveMemberIds(settings) {
  const s = settings || (await getSettings());
  const snap = await adminDb
    .collection("orders")
    .where("status", "in", VALID_SALE_STATUSES)
    .where("approvedAt", ">=", cutoffIso(s.activeDays))
    .get();

  const counts = {};
  snap.docs.forEach((d) => {
    const memberId = d.data().memberId;
    counts[memberId] = (counts[memberId] || 0) + 1;
  });
  const candidateIds = Object.keys(counts).filter((id) => counts[id] >= s.minApprovedSalesForActive);
  if (candidateIds.length === 0) return [];

  const refs = candidateIds.map((id) => adminDb.collection("members").doc(id));
  const memberSnaps = await adminDb.getAll(...refs);
  return memberSnaps.filter((m) => m.exists && m.data().status === "active").map((m) => m.id);
}

function firstTwoGraphemes(str) {
  const s = String(str || "").trim();
  try {
    if (typeof Intl !== "undefined" && Intl.Segmenter) {
      const seg = new Intl.Segmenter(undefined, { granularity: "grapheme" });
      const parts = [...seg.segment(s)].map((p) => p.segment);
      return parts.slice(0, 2).join("");
    }
  } catch {
    // fall through to the plain slice below
  }
  return s.slice(0, 2);
}

// Called once, right when an order first becomes a valid sale. Writes a
// lightweight, non-sensitive entry any signed-in member can read directly
// (see firestore.rules) — just enough for a live "someone just sold X" feed.
// Full seller identity (name, phone) never leaves the `orders` collection,
// which stays admin-only.
export async function recordSalesFeedEntry(order) {
  await adminDb.collection("salesFeed").add({
    productId: order.productId,
    productName: order.productName,
    productImageUrl: order.productImageUrl || "",
    amount: order.orderAmount,
    memberInitials: firstTwoGraphemes(order.memberName),
    createdAt: new Date().toISOString(),
  });
}


// order's profit equally among the eligible-active snapshot and writes one
// immutable ledger transaction per member. Idempotent via order.profitPoolId.
export async function createProfitPool(orderRefId, order) {
  if (order.profitPoolId) return; // already distributed for this order
  if (order.profitAtOrder === undefined || order.profitAtOrder === null) return;

  const settings = await getSettings();
  const eligibleMemberIds = await getEligibleActiveMemberIds(settings);
  const poolRef = adminDb.collection("profitPools").doc();
  const now = new Date().toISOString();
  const poolAmount = order.profitAtOrder;

  if (eligibleMemberIds.length === 0) {
    await poolRef.set({
      orderRefId, orderId: order.orderId, productId: order.productId,
      poolAmount, eligibleMemberIds: [], perMemberShare: 0,
      distributed: false, note: "কোনো eligible active member পাওয়া যায়নি এই মুহূর্তে",
      createdAt: now,
    });
    await adminDb.collection("orders").doc(orderRefId).update({ profitPoolId: poolRef.id });
    return;
  }

  const perMemberShare = Number((poolAmount / eligibleMemberIds.length).toFixed(2));
  const batch = adminDb.batch();

  batch.set(poolRef, {
    orderRefId, orderId: order.orderId, productId: order.productId,
    poolAmount, eligibleMemberIds, perMemberShare, distributed: true, createdAt: now,
  });

  for (const memberId of eligibleMemberIds) {
    const txnRef = adminDb.collection("transactions").doc();
    batch.set(txnRef, {
      memberId, type: "profit_earned", amount: perMemberShare,
      refOrderId: orderRefId, refOrderCode: order.orderId, profitPoolId: poolRef.id,
      status: "completed",
      description: `${order.orderId} অর্ডার থেকে প্রফিট শেয়ার`,
      createdAt: now,
    });
    batch.update(adminDb.collection("members").doc(memberId), {
      availableBalance: FieldValue.increment(perMemberShare),
      totalProfitEarned: FieldValue.increment(perMemberShare),
    });
  }

  batch.update(adminDb.collection("orders").doc(orderRefId), { profitPoolId: poolRef.id });
  await batch.commit();
}

// Called when a previously-valid order moves to returned/refunded/rejected/
// cancelled. Never deletes the original ledger entries — writes a matching
// negative adjustment transaction per member instead, so history stays intact.
export async function reverseProfitPool(orderRefId, order) {
  if (!order.profitPoolId || order.profitPoolReversed) return;

  const poolRef = adminDb.collection("profitPools").doc(order.profitPoolId);
  const poolSnap = await poolRef.get();
  if (!poolSnap.exists) return;
  const pool = poolSnap.data();

  if (!pool.distributed || !pool.eligibleMemberIds?.length) {
    await adminDb.collection("orders").doc(orderRefId).update({ profitPoolReversed: true });
    return;
  }

  const now = new Date().toISOString();
  const batch = adminDb.batch();

  for (const memberId of pool.eligibleMemberIds) {
    const txnRef = adminDb.collection("transactions").doc();
    batch.set(txnRef, {
      memberId, type: "profit_adjustment", amount: -pool.perMemberShare,
      refOrderId: orderRefId, refOrderCode: order.orderId, profitPoolId: order.profitPoolId,
      status: "completed",
      description: `${order.orderId} রিটার্ন/রিফান্ড/বাতিলের কারণে প্রফিট এডজাস্টমেন্ট`,
      createdAt: now,
    });
    batch.update(adminDb.collection("members").doc(memberId), {
      availableBalance: FieldValue.increment(-pool.perMemberShare),
      totalProfitEarned: FieldValue.increment(-pool.perMemberShare),
    });
  }

  batch.update(poolRef, { reversedAt: now });
  batch.update(adminDb.collection("orders").doc(orderRefId), { profitPoolReversed: true });
  await batch.commit();
}
