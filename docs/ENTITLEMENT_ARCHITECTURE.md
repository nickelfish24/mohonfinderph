# Mohon Finder PH Entitlement Architecture

## 1. Objective
- Keep all users in Basic mode by default.
- Unlock premium only from verified paid entitlements.
- Support Play Billing and direct web checkout channels (Stripe/GCash) with one entitlement backend.

## 2. Core Principle
- Client app must never be source of truth for premium.
- Backend entitlement service decides access.
- App only renders UI based on server response.

## 3. Entitlement States
- `basic`: No active paid entitlement.
- `premium_active`: Active paid entitlement.
- `premium_grace`: Temporarily active while payment issue is being resolved.
- `premium_expired`: Previously paid but no longer active.
- `premium_revoked`: Access removed due to refund, chargeback, fraud, or admin action.

## 4. Data Model (Recommended)
### `users`
- `id` (uuid, pk)
- `email` (unique, nullable if phone auth)
- `phone` (unique, nullable)
- `created_at`, `updated_at`

### `devices`
- `id` (uuid, pk)
- `user_id` (fk users.id)
- `device_fingerprint` (hashed)
- `platform` (`android`/`ios`)
- `last_seen_at`
- `is_active`

### `plans`
- `id` (pk)
- `code` (`monthly`, `yearly`, `pay_per_use`)
- `name`
- `channel` (`play`, `stripe`, `gcash`, `license`)
- `price_minor` (integer cents/centavos)
- `currency`
- `duration_days` (nullable for usage-based)
- `is_active`

### `subscriptions`
- `id` (uuid, pk)
- `user_id` (fk users.id)
- `plan_id` (fk plans.id)
- `provider` (`play`, `revenuecat`, `stripe`, `gcash`, `license`)
- `provider_customer_id` (nullable)
- `provider_subscription_id` (nullable)
- `status` (`active`, `grace`, `expired`, `revoked`, `cancelled`)
- `starts_at`, `ends_at`, `grace_until`
- `auto_renew` (bool)
- `created_at`, `updated_at`

### `entitlements`
- `id` (uuid, pk)
- `user_id` (fk users.id, unique per feature)
- `feature_code` (`premium`)
- `state` (`basic`, `active`, `grace`, `expired`, `revoked`)
- `source_subscription_id` (fk subscriptions.id, nullable)
- `effective_at`, `expires_at`
- `updated_by` (`system`, `webhook`, `admin`)
- `updated_at`

### `license_codes`
- `id` (uuid, pk)
- `code_hash` (unique)
- `plan_id` (fk plans.id)
- `max_redemptions`
- `redemption_count`
- `expires_at`
- `is_active`
- `created_by`, `created_at`

### `license_redemptions`
- `id` (uuid, pk)
- `license_code_id` (fk license_codes.id)
- `user_id` (fk users.id)
- `redeemed_at`
- `device_id` (fk devices.id, nullable)

### `payment_events` (append-only audit)
- `id` (uuid, pk)
- `provider` (`play`, `revenuecat`, `stripe`, `gcash`)
- `event_type`
- `external_event_id` (unique)
- `payload_json`
- `received_at`
- `processed_at`
- `status` (`received`, `processed`, `failed`)

## 5. API Endpoints
### Auth
- `POST /v1/auth/login`
- `POST /v1/auth/refresh`
- `POST /v1/auth/logout`

### Device
- `POST /v1/devices/register`
- `POST /v1/devices/heartbeat`

### Entitlements
- `GET /v1/entitlements/me`
  - Returns current entitlement state and expiry metadata.
- `POST /v1/entitlements/refresh`
  - Forces provider refresh (RevenueCat/Play, Stripe, etc.).

### License
- `POST /v1/licenses/redeem`
  - Input: code
  - Output: entitlement state + expiry

### Billing Webhooks (server-to-server)
- `POST /v1/webhooks/revenuecat`
- `POST /v1/webhooks/stripe`
- `POST /v1/webhooks/gcash`

## 6. Access Rules
- Premium features unlock only when `/entitlements/me` returns `state=active` or `state=grace`.
- If status is `expired` or `revoked`, force Basic mode.
- Device limit example:
  - Max 2 active devices per account.
  - On third device, require device management action.

## 7. Mobile App Flow
1. App launch:
   - Read cached entitlement snapshot (for instant UI).
   - Call `/entitlements/me`.
2. If server says premium active:
   - Unlock premium features.
3. If not active:
   - Show locked UI + upgrade options.
4. On purchase/redeem:
   - Call provider flow.
   - Backend receives webhook.
   - App calls `/entitlements/refresh`.
5. Offline mode:
   - Use signed cached entitlement for limited time (for example 24h).
   - Require online refresh after offline TTL expires.

## 8. Security Requirements
- JWT access token (short TTL) + refresh token rotation.
- Verify webhook signatures for Stripe/RevenueCat/GCash.
- Idempotency on external events (`external_event_id` unique).
- Never trust client flags such as `isPremiumUser=true`.
- Store only hashed license codes.

## 9. Migration Plan From Current App
1. Keep current local lock UI.
2. Add backend auth + `/entitlements/me`.
3. Replace local premium source checks with backend result.
4. Keep RevenueCat client SDK for purchase UX, but entitlement truth remains backend.
5. Disable and remove remaining mock premium paths in production.

## 10. Acceptance Criteria
- Fresh install opens in Basic mode.
- Premium unlock only after verified payment or valid license redemption.
- Reinstall/login restores entitlement from backend.
- Refund/revoke downgrades to Basic automatically.
- Audit trail exists for every entitlement state change.
