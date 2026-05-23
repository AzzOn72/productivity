/**
 * DEV MODE OVERRIDE — TESTING UX ONLY, NOT PRODUCTION MONETIZATION.
 *
 * When IS_DEV_MODE is true, the upgrade flow instantly grants Pro / Elite
 * via POST /api/billing/upgrade with dev_mode=true, bypassing Stripe.
 *
 * Set this to FALSE before launching real billing.
 */
export const IS_DEV_MODE = true;
