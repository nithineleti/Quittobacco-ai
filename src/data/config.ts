/**
 * DEMO_MODE gates whether reward vouchers are real or clearly-marked demos.
 *
 * A real partner exists (per §12 Q1), but until the partner name + redemption
 * mechanism are wired in, we MUST NOT render anything that looks like a real
 * redeemable code (§10). So codes are watermarked "DEMO — not a real voucher".
 * Flip to false and supply real codes once the partner integration is ready.
 */
export const DEMO_MODE = true;

/** Partner name shown on redemption instructions (placeholder until confirmed). */
export const REWARD_PARTNER = {
  name: { en: "our partner clinic", hi: "हमारे पार्टनर क्लिनिक" },
};
