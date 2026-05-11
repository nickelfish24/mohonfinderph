# MF-Subs Distribution Checklist (Direct APK)

Use this checklist before sending `MF-Subs.apk` to buyers.

## 1) Secure Signing (Required)

Set these env vars in the same terminal before build:

- `MFPH_UPLOAD_STORE_FILE`
- `MFPH_UPLOAD_STORE_PASSWORD`
- `MFPH_UPLOAD_KEY_ALIAS`
- `MFPH_UPLOAD_KEY_PASSWORD`

If not created yet, generate once:

```powershell
npm run setup:release:keystore
```

Then build with secure signing:

```powershell
npm run apk:release:subscriber:secure
```

Do not use `apk:release:subscriber:insecure` for buyer distribution.

## 2) Readiness Check (Required)

Run:

```powershell
npm run release:check
```

Fix all `FAIL:` items first.

## 3) Version Update (Required every release)

- `package.json` `version`
- `app.json` `expo.version`
- Android build number with either:
  - env var `MFPH_VERSION_CODE`, or
  - `-Papp.versionCode=...` in Gradle command.

Example:

```powershell
set MFPH_VERSION_NAME=1.0.3
set MFPH_VERSION_CODE=3
npm run apk:release:subscriber
```

## 4) Release Behavior Checks

In subscriber release APK:

- Dev-only settings panels hidden.
- Premium locked until valid license key.
- Ads on in free mode, ads off after premium activation.
- Checkout flow creates order and dashboard receives updates.
- License activation works and survives app restart.

## 5) Dashboard Operations

In `config/license-dashboard.env`:

- Strong `LICENSE_DASHBOARD_ADMIN_TOKEN`
- Strong `LICENSE_PUBLIC_API_TOKEN`
- Strong `MFPH_LOCAL_LICENSE_SECRET`
- Correct `LICENSE_PRICE_PHP` and `LICENSE_DEFAULT_DAYS`
- SMTP working for buyer receipt and owner alert emails

## 6) Backup Routine

Back up these after each selling session:

- `backups/local-license-store.json`
- `backups/license-orders.json`
- `config/license-dashboard.env` (secure private copy)

## 7) Output Packaging

After successful build, copy and stamp:

- `android/app/build/outputs/apk/release/app-release.apk`
- rename to `MF-Subs-Release-v<version>-<YYYYMMDD-HHMM>.apk`
- optional convenience copy: `MF-Subs.apk`
