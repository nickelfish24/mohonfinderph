# Monetization Setup (RevenueCat)

## 1) Runtime Rules
- Real purchase flow is enabled only when:
  - app is NOT running in Expo Go, and
  - RevenueCat API key is configured for current platform.
- Expo Go is treated as `billing unavailable` for safety.
- Optional developer override:
  - `EXPO_PUBLIC_ENABLE_MOCK_BILLING=true`
  - This allows mock unlocks for testing only.

## 2) Environment Variables
Configure in EAS secrets / environment:

- `EXPO_PUBLIC_REVENUECAT_ANDROID_API_KEY`
- `EXPO_PUBLIC_REVENUECAT_IOS_API_KEY`
- `EXPO_PUBLIC_REVENUECAT_ENTITLEMENT_ID` (optional, defaults to `premium`)
- `EXPO_PUBLIC_ENABLE_MOCK_BILLING` (optional, keep unset/false for production)

## 3) RevenueCat Dashboard Setup
1. Create Android app in RevenueCat and link Play package.
2. Create entitlement: `premium` (or your custom id).
3. Create offerings and attach packages:
  - Monthly (`$rc_monthly`) for Subscribe
  - Lifetime/Custom package for Pay Per Use if needed
4. Ensure an active `current` offering exists.

## 4) Google Play Console Setup
1. Create subscription products in Play Console.
2. Publish to Internal testing track.
3. Add license testers under Play Console.
4. Wait for products to become active before testing purchase.

## 5) App Behavior
- `UpgradeScreen` calls `purchasePremium(planType)`.
- Purchase success only unlocks premium when RevenueCat entitlement is active.
- Failed purchases do not auto-unlock in production flow.
- Restore button uses `restorePremiumPurchases()`.

## 6) Validation Checklist
1. Build dev client/store build (not Expo Go).
2. Open Upgrade screen and verify `Billing: revenuecat-live`.
3. Complete purchase and confirm premium-locked features unlock.
4. Reinstall app and run Restore Purchases.
5. Confirm entitlement sync from RevenueCat after app restart.

## 7) Build Commands (EAS)
1. Login and configure:
  - `npm install -g eas-cli`
  - `eas login`
  - `eas build:configure`
2. Development billing test build:
  - `eas build -p android --profile development`
3. Internal testing build:
  - `eas build -p android --profile preview`
4. Play Store bundle:
  - `eas build -p android --profile production`

## 8) Important Before First Store Build
- Set a permanent Android package id in `app.json`:
  - `expo.android.package` (example: `com.yourcompany.mohonfinderph`)
- Once published, package id cannot be changed for the same Play listing.
