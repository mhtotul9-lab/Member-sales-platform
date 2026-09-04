// Server-only. Import only from /pages/api/** files.
import { adminDb, VALID_SALE_STATUSES } from "./firebaseAdmin";
import { FieldValue } from "firebase-admin/firestore";
import { notifyUser } from "./notify";

const SETTINGS_DEFAULTS = {
  activeDays: 7,
  minApprovedSalesForActive: 1,
  minWithdrawalAmount: 100,
  paymentMethods: ["bkash", "nagad", "rocket", "bank"],

  // --- Referral / Profit Pool program (admin-configurable, platform-wide) ---
  // Direct Referral Commission: one-time flat ৳ bonus paid to the referrer
  // once their referred member reaches `requiredSalesForCommission` valid
  // sales. Replaces the old per-product referralCommissionAmount field —
  // this is now a single global number the admin sets here.
  directReferralCommission: 200,
  requiredSalesForCommission: 1,

  // Profit Pool Share: flat ৳ paid EVERY time a downline member makes a
  // valid sale, to each qualifying upline referrer, cascading up to
  // `maxReferralLevels` levels (1, 2, or 3). This is a fixed amount, not a
  // percentage — it no longer scales with the order's profit.
  profitPoolShare: 20,
  maxReferralLevels: 1,

  // Guard rail: a product's per-unit profit (sellingPrice - costPrice) must
  // be at least this much for the direct referral commission AND the
  // profit-pool cascade to fire on an order for that product. Protects
  // against paying out referral/pool bonuses on thin- or negative-margin
  // products. Does NOT affect the product's own fixed member commission
  // (processProductCommission), which always pays as configured.
  minProductProfit: 0,

  // Master ON/OFF switches.
  commissionEnabled: true, // controls the direct referral commission
  profitPoolEnabled: true, // controls the profit-pool cascade

  // Safety cap: the total ৳ paid out on a single order — seller's product
  // commission + (if triggered) the direct referral bonus + every level of
  // profit-pool share — will never exceed this. 0 = no cap. If adding the
  // next profit-pool level would exceed the cap, distribution stops there
  // (already-queued levels below the cap still get paid).
  maxTotalPayoutPerSale: 0,

  // Whether refunded/returned/rejected/cancelled orders automatically claw
  // back any commission/bonus/pool share already paid on them. This has
  // always been the app's behavior (see the reverse* functions below); the
  // toggle exists so the admin panel can display and confirm it.
  reverseOnRefund: true,

  // Whether an admin is allowed to manually edit/override an already-paid
  // transaction amount from the admin panel (UI-level permission flag; read
  // by the admin transactions/orders screens, not enforced in this file).
  adminOverrideEnabled: true,
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
  // count() instead of get(): this function is called ONCE PER MEMBER on
  // every admin/members page load (N+1 pattern) — get() would fetch every
  // matching order document (real reads), while count() is a cheap
  // aggregate query billed far lower regardless of how many orders match.
  // This one change is the single biggest read-quota saving in this app.
  const snap = await adminDb
    .collection("orders")
    .where("memberId", "==", uid)
    .where("status", "in", VALID_SALE_STATUSES)
    .where("approvedAt", ">=", cutoffIso(s.activeDays))
    .count()
    .get();
  return snap.data().count >= s.minApprovedSalesForActive;
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


// --- Profit Pool (multi-level referral cascade) -----------------------------
// Every time a member's order becomes a valid sale, a FIXED ৳ amount
// (settings.profitPoolShare) is paid to each qualifying member up their
// referral chain — the person who referred them (level 1), that person's
// own referrer (level 2), and so on — up to settings.maxReferralLevels deep
// (max 3). This is a flat amount, NOT a percentage of the order's profit,
// and is completely separate from:
//   - processProductCommission: the fixed per-unit commission paid in full
//     to whoever actually made the sale.
//   - processReferralCommission: the ONE-TIME direct referral bonus paid
//     when a referred member first reaches the required sale count.
// Idempotent via order.profitPoolId — running this twice for the same order
// is a no-op the second time.
export async function processProfitPoolShares(orderRefId, order, settingsIn) {
  if (order.profitPoolId) return; // already processed for this order
  const s = settingsIn || (await getSettings());
  const poolRef = adminDb.collection("profitPools").doc();
  const now = new Date().toISOString();

  const shareAmount = Number(s.profitPoolShare) || 0;
  const maxLevels = Math.min(3, Math.max(0, Number(s.maxReferralLevels) || 0));
  const qty = Number(order.quantity) || 1;
  const perUnitProfit = qty > 0 ? Number(order.profitAtOrder || 0) / qty : 0;
  const minProfitOk = perUnitProfit >= (Number(s.minProductProfit) || 0);

  if (!s.profitPoolEnabled || shareAmount <= 0 || maxLevels <= 0 || !minProfitOk) {
    await poolRef.set({
      orderRefId, orderId: order.orderId, productId: order.productId,
      poolAmount: 0, entries: [], distributed: false,
      note: !s.profitPoolEnabled
        ? "প্রফিট পুল বন্ধ আছে (Admin Setting)"
        : !minProfitOk
        ? "এই প্রোডাক্টের প্রতি ইউনিট প্রফিট Minimum Product Profit-এর কম"
        : "প্রফিট পুল শেয়ার বা লেভেল সেট করা নেই",
      createdAt: now,
    });
    await adminDb.collection("orders").doc(orderRefId).update({ profitPoolId: poolRef.id });
    return;
  }

  // Cumulative payout already made on THIS order (seller's own commission +
  // the direct referral bonus, if it fired on this order) — counted first
  // against maxTotalPayoutPerSale so the cascade never pushes a single
  // order's total payout past the admin's cap.
  const cap = Number(s.maxTotalPayoutPerSale) || 0; // 0 = no cap
  let paidSoFar = (Number(order.commissionAtOrder) || 0) + (Number(order.referralBonusAmount) || 0);

  const entries = [];
  let currentId = order.memberId;
  for (let level = 1; level <= maxLevels; level++) {
    const memberSnap = await adminDb.collection("members").doc(currentId).get();
    if (!memberSnap.exists) break;
    const uplineId = memberSnap.data().referredByMemberId;
    if (!uplineId) break;

    const uplineSnap = await adminDb.collection("members").doc(uplineId).get();
    currentId = uplineId;
    if (!uplineSnap.exists || uplineSnap.data().status !== "active") continue; // skip, keep climbing

    if (cap > 0 && paidSoFar + shareAmount > cap) break; // cap reached — stop the cascade here

    entries.push({ memberId: uplineId, level, amount: shareAmount });
    paidSoFar += shareAmount;
  }

  if (entries.length === 0) {
    await poolRef.set({
      orderRefId, orderId: order.orderId, productId: order.productId,
      poolAmount: 0, entries: [], distributed: false,
      note: "কোনো eligible upline referrer পাওয়া যায়নি (বা payout cap-এ পৌঁছে গেছে)",
      createdAt: now,
    });
    await adminDb.collection("orders").doc(orderRefId).update({ profitPoolId: poolRef.id });
    return;
  }

  const poolAmount = Number(entries.reduce((sum, e) => sum + e.amount, 0).toFixed(2));
  const batch = adminDb.batch();

  batch.set(poolRef, {
    orderRefId, orderId: order.orderId, productId: order.productId,
    poolAmount, entries, distributed: true, createdAt: now,
  });

  for (const entry of entries) {
    const txnRef = adminDb.collection("transactions").doc();
    batch.set(txnRef, {
      memberId: entry.memberId, type: "profit_pool_share", amount: entry.amount,
      refOrderId: orderRefId, refOrderCode: order.orderId, profitPoolId: poolRef.id, level: entry.level,
      status: "completed",
      description: `${order.orderId} অর্ডার থেকে লেভেল-${entry.level} প্রফিট পুল শেয়ার`,
      createdAt: now,
    });
    batch.update(adminDb.collection("members").doc(entry.memberId), {
      availableBalance: FieldValue.increment(entry.amount),
      totalProfitEarned: FieldValue.increment(entry.amount),
    });
  }

  batch.update(adminDb.collection("orders").doc(orderRefId), { profitPoolId: poolRef.id });
  await batch.commit();

  for (const entry of entries) {
    await notifyUser(entry.memberId, {
      type: "profit_pool_share",
      message: `💰 আপনার ডাউনলাইনের একটি সেল থেকে (লেভেল-${entry.level}) আপনি ৳${entry.amount} প্রফিট পুল শেয়ার পেয়েছেন!`,
      link: "/member/wallet",
    });
  }
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

  if (!pool.distributed || !pool.entries?.length) {
    await adminDb.collection("orders").doc(orderRefId).update({ profitPoolReversed: true });
    return;
  }

  const now = new Date().toISOString();
  const batch = adminDb.batch();

  for (const entry of pool.entries) {
    const txnRef = adminDb.collection("transactions").doc();
    batch.set(txnRef, {
      memberId: entry.memberId, type: "profit_pool_adjustment", amount: -entry.amount,
      refOrderId: orderRefId, refOrderCode: order.orderId, profitPoolId: order.profitPoolId, level: entry.level,
      status: "completed",
      description: `${order.orderId} রিটার্ন/রিফান্ড/বাতিলের কারণে লেভেল-${entry.level} প্রফিট পুল এডজাস্টমেন্ট`,
      createdAt: now,
    });
    batch.update(adminDb.collection("members").doc(entry.memberId), {
      availableBalance: FieldValue.increment(-entry.amount),
      totalProfitEarned: FieldValue.increment(-entry.amount),
    });
  }

  batch.update(poolRef, { reversedAt: now });
  batch.update(adminDb.collection("orders").doc(orderRefId), { profitPoolReversed: true });
  await batch.commit();
}

// --- Per-product fixed member commission -----------------------------------
// Separate from the profit pool above. Each product has its own fixed
// commissionAtOrder (৳ per unit, set by the admin on the product, snapshotted
// onto the order at submit time same as costPriceAtOrder). The ENTIRE amount
// goes to the one member who made this specific sale — never split. Same
// trigger point as processProfitPoolShares (order first becomes a valid sale).
export async function processProductCommission(orderRefId, order) {
  const amount = Number(order.commissionAtOrder) || 0;
  if (amount <= 0) return; // this product has no commission configured
  if (order.commissionPaid) return; // idempotent

  const now = new Date().toISOString();
  const memberRef = adminDb.collection("members").doc(order.memberId);
  const batch = adminDb.batch();

  const txnRef = adminDb.collection("transactions").doc();
  batch.set(txnRef, {
    memberId: order.memberId, type: "product_commission", amount,
    refOrderId: orderRefId, refOrderCode: order.orderId, productId: order.productId,
    status: "completed",
    description: `${order.orderId} অর্ডারের "${order.productName}" সেলের কমিশন`,
    createdAt: now,
  });
  batch.update(memberRef, {
    availableBalance: FieldValue.increment(amount),
    totalCommissionEarned: FieldValue.increment(amount),
  });
  batch.update(adminDb.collection("orders").doc(orderRefId), { commissionPaid: true });

  await batch.commit();
}

// Called when a previously-valid order (that had a commission paid) moves
// OUT of a valid-sale status. Same reversal pattern as reverseProfitPool —
// writes a negative adjustment, never deletes the original entry.
export async function reverseProductCommission(orderRefId, order) {
  if (!order.commissionPaid || order.commissionReversed) return;

  const amount = Number(order.commissionAtOrder) || 0;
  if (amount <= 0) return;

  const now = new Date().toISOString();
  const memberRef = adminDb.collection("members").doc(order.memberId);
  const batch = adminDb.batch();

  const txnRef = adminDb.collection("transactions").doc();
  batch.set(txnRef, {
    memberId: order.memberId, type: "product_commission_reversal", amount: -amount,
    refOrderId: orderRefId, refOrderCode: order.orderId, productId: order.productId,
    status: "completed",
    description: `${order.orderId} রিটার্ন/রিফান্ড/বাতিলের কারণে কমিশন এডজাস্টমেন্ট`,
    createdAt: now,
  });
  batch.update(memberRef, {
    availableBalance: FieldValue.increment(-amount),
    totalCommissionEarned: FieldValue.increment(-amount),
  });
  batch.update(adminDb.collection("orders").doc(orderRefId), { commissionReversed: true });

  await batch.commit();
}

// --- Referral program -----------------------------------------------------

// Called right when an order first becomes a valid sale (same trigger point
// as processProfitPoolShares). Pays the ONE-TIME "Direct Referral
// Commission" to the referrer once their referred member's cumulative valid
// sales count reaches settings.requiredSalesForCommission (default: 1, i.e.
// the first sale). The ৳ amount is order.referralCommissionAtOrder, which
// was snapshotted from settings.directReferralCommission at the moment this
// order was submitted (so a later admin setting change never rewrites a
// bonus that's already in flight) — mirrors how costPriceAtOrder locks in
// the cost price. Gated by settings.commissionEnabled and by
// settings.minProductProfit (this product's per-unit profit must clear the
// bar). Duplicate-safe: only fires once per referred member, guarded by
// referralCommissionPaid inside the transaction.
export async function processReferralCommission(orderRefId, order, settingsIn) {
  const s = settingsIn || (await getSettings());
  if (!s.commissionEnabled) return;

  const bonusAmount = Number(order.referralCommissionAtOrder) || 0;
  if (bonusAmount <= 0) return;

  const qty = Number(order.quantity) || 1;
  const perUnitProfit = qty > 0 ? Number(order.profitAtOrder || 0) / qty : 0;
  if (perUnitProfit < (Number(s.minProductProfit) || 0)) return;

  const requiredSales = Math.max(1, Number(s.requiredSalesForCommission) || 1);
  const memberRef = adminDb.collection("members").doc(order.memberId);
  const now = new Date().toISOString();

  const result = await adminDb.runTransaction(async (tx) => {
    const memberSnap = await tx.get(memberRef);
    if (!memberSnap.exists) return null;
    const member = memberSnap.data();
    if (!member.referredByMemberId) return null;

    // Monotonic counter of this member's valid sales, used only to decide
    // when the required-sales threshold is first crossed. Incremented here
    // (on becoming valid) and decremented in reverseReferralCommission's
    // sibling call point below (on becoming invalid) — see status.js.
    const newCount = (Number(member.qualifyingSalesCount) || 0) + 1;
    const memberUpdate = { qualifyingSalesCount: newCount };

    if (member.referralCommissionPaid || newCount < requiredSales) {
      tx.update(memberRef, memberUpdate);
      return null;
    }

    const referrerRef = adminDb.collection("members").doc(member.referredByMemberId);
    const referrerSnap = await tx.get(referrerRef);
    if (!referrerSnap.exists) {
      tx.update(memberRef, memberUpdate);
      return null;
    }

    memberUpdate.firstSaleCompleted = true;
    memberUpdate.referralCommissionPaid = true;
    memberUpdate.referralCommissionAmountPaid = bonusAmount;
    memberUpdate.firstSaleOrderId = orderRefId;
    memberUpdate.firstSaleAt = now;
    tx.update(memberRef, memberUpdate);

    const txnRef = adminDb.collection("transactions").doc();
    tx.set(txnRef, {
      memberId: member.referredByMemberId,
      type: "referral_bonus",
      amount: bonusAmount,
      refOrderId: orderRefId,
      refOrderCode: order.orderId,
      refMemberId: order.memberId,
      refMemberName: member.fullName,
      refProductName: order.productName,
      status: "completed",
      description: `${member.fullName} (${member.memberId}) ${requiredSales}-টি সেল সম্পন্ন করায় রেফারেল বোনাস`,
      createdAt: now,
    });

    tx.update(referrerRef, {
      availableBalance: FieldValue.increment(bonusAmount),
      referralEarnings: FieldValue.increment(bonusAmount),
      referralFirstSalesCount: FieldValue.increment(1),
    });

    tx.update(adminDb.collection("orders").doc(orderRefId), {
      referralBonusPaid: true,
      referralBonusRecipientId: member.referredByMemberId,
      referralBonusAmount: bonusAmount,
    });

    return {
      referrerId: member.referredByMemberId,
      referredName: member.fullName,
      referredCode: member.memberId,
      bonusAmount,
    };
  });

  if (result) {
    await notifyUser(result.referrerId, {
      type: "referral_bonus",
      message: `🎉 আপনার মাধ্যমে যুক্ত হওয়া ${result.referredName} (${result.referredCode}) প্রয়োজনীয় সেল সম্পন্ন করেছে — আপনি ৳${result.bonusAmount} রেফারেল বোনাস পেয়েছেন!`,
      link: "/member/referrals",
    });
  }
}

// Called when an order that previously paid a referral bonus moves OUT of a
// valid-sale status (returned/refunded/rejected/cancelled). Never deletes
// the original transaction — writes a matching negative adjustment instead,
// same pattern as reverseProfitPool.
export async function reverseReferralCommission(orderRefId, order) {
  // Always decrement the referred member's qualifying-sales counter when
  // one of their valid sales is reversed, regardless of whether THIS
  // particular order was the one that triggered the bonus payment — the
  // counter must track their true current valid-sale count so a future
  // sale is evaluated against an accurate number.
  await adminDb.collection("members").doc(order.memberId).update({
    qualifyingSalesCount: FieldValue.increment(-1),
  }).catch(() => {}); // member doc may not exist in edge cases — non-fatal

  if (!order.referralBonusPaid || order.referralBonusReversed) return;

  const now = new Date().toISOString();
  const referrerRef = adminDb.collection("members").doc(order.referralBonusRecipientId);
  const amount = order.referralBonusAmount || 0;
  if (amount <= 0) return;

  const batch = adminDb.batch();
  const txnRef = adminDb.collection("transactions").doc();
  batch.set(txnRef, {
    memberId: order.referralBonusRecipientId,
    type: "referral_bonus_reversal",
    amount: -amount,
    refOrderId: orderRefId,
    refOrderCode: order.orderId,
    refMemberId: order.memberId,
    status: "completed",
    description: `${order.orderId} রিটার্ন/রিফান্ড/বাতিলের কারণে রেফারেল বোনাস এডজাস্টমেন্ট`,
    createdAt: now,
  });
  batch.update(referrerRef, {
    availableBalance: FieldValue.increment(-amount),
    referralEarnings: FieldValue.increment(-amount),
  });
  batch.update(adminDb.collection("orders").doc(orderRefId), { referralBonusReversed: true });
  await batch.commit();
}
