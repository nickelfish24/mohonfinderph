# GCash Auto-Issue License Setup

This setup lets a paid GCash checkout automatically issue a Firebase license key.

Important: automatic checkout API deployment requires Firebase Blaze plan.  
If staying on Spark (free plan), keep `EXPO_PUBLIC_ENABLE_GCASH_CHECKOUT=false` and issue license keys manually after payment.

## 1. Install Function Dependencies

```powershell
cd "C:\Users\LENOVO\Desktop\System Projects\mohon_finder_ph\functions"
npm install
```

## 2. Set Firebase Project

```powershell
cd "C:\Users\LENOVO\Desktop\System Projects\mohon_finder_ph"
firebase use mohonfinderph
```

## 3. Set Function Secrets / Env

Set these in your deploy environment:

- `PAYMONGO_SECRET_KEY` (PayMongo secret key)
- `PAYMONGO_WEBHOOK_SECRET` (PayMongo webhook signing secret)
- `LICENSE_SUCCESS_URL` (where checkout redirects on success)
- `LICENSE_CANCEL_URL` (where checkout redirects on cancel)
- `LICENSE_PRICE_PHP` (example: `299`)
- `LICENSE_DEFAULT_DAYS` (example: `30`)
- `LICENSE_KEY_PREFIX` (example: `MFS`)
- `FUNCTION_REGION` (example: `asia-southeast1`)

Example local PowerShell session before deploy:

```powershell
$env:PAYMONGO_SECRET_KEY="sk_live_xxx"
$env:PAYMONGO_WEBHOOK_SECRET="whsk_live_xxx"
$env:LICENSE_SUCCESS_URL="https://your-site/success"
$env:LICENSE_CANCEL_URL="https://your-site/cancel"
$env:LICENSE_PRICE_PHP="299"
$env:LICENSE_DEFAULT_DAYS="30"
$env:LICENSE_KEY_PREFIX="MFS"
$env:FUNCTION_REGION="asia-southeast1"
```

## 4. Deploy Function

```powershell
cd "C:\Users\LENOVO\Desktop\System Projects\mohon_finder_ph"
npm run firebase:deploy:license
```

## 5. Configure PayMongo Webhook

Webhook URL:

`https://asia-southeast1-mohonfinderph.cloudfunctions.net/licenseApi/webhook/paymongo`

Enable at least paid events:

- `checkout_session.payment.paid`
- `payment.paid`
- optional: failure events for status tracking

## 6. Add API URL to App

In `.env.local`:

```txt
EXPO_PUBLIC_LICENSE_API_BASE_URL=https://asia-southeast1-mohonfinderph.cloudfunctions.net/licenseApi
```

Then rebuild the app.

## 7. Firestore Rules Needed

```txt
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /licenses/{docId} {
      allow read: if request.auth != null;
      allow update: if request.auth != null;
      allow create, delete: if false;
    }

    match /_server_clock/{uid} {
      allow read, write: if request.auth != null && request.auth.uid == uid;
    }

    match /license_orders/{orderId} {
      allow read: if false;
      allow write: if false;
    }
  }
}
```

Also enable **Firebase Authentication -> Anonymous**.
