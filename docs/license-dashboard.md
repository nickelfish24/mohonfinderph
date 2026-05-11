# Local License Dashboard (Subscriber)

Use this local HTML dashboard to issue and monitor **local signed license keys**.

No Firebase setup is required for Subscriber local activation.

Optional (recommended): enable online validation so app checks this dashboard API on every app start.

## Start

```powershell
cd "C:\Users\LENOVO\Desktop\System Projects\mohon_finder_ph"
npm run license:dashboard
```

## Autorun On Windows Login

Install autorun:

```powershell
cd "C:\Users\LENOVO\Desktop\System Projects\mohon_finder_ph"
powershell -ExecutionPolicy Bypass -File .\scripts\install-license-dashboard-autorun.ps1
```

Remove autorun:

```powershell
cd "C:\Users\LENOVO\Desktop\System Projects\mohon_finder_ph"
powershell -ExecutionPolicy Bypass -File .\scripts\install-license-dashboard-autorun.ps1 -Remove
```

Manual launcher (auto-start server + open dashboard page):

`C:\Users\LENOVO\Desktop\System Projects\mohon_finder_ph\scripts\start-license-dashboard.cmd`

The console prints a URL like:

`http://127.0.0.1:8787`

If the port is busy, it auto-switches (`8788`, `8789`, ...).

By default it listens on `0.0.0.0` for LAN access.
Use your PC LAN IP in app settings env (example `http://192.168.0.17:8787`).

## Data Storage

Keys are stored in:

`C:\Users\LENOVO\Desktop\System Projects\mohon_finder_ph\backups\local-license-store.json`

## What You Can Do

- Issue new local keys (`count`, `days`, `prefix`)
- Find key records
- Mark keys active/inactive (monitoring record)
- Extend by generating a replacement key (old key becomes inactive)
- View recent key history
- Create checkout orders for GCash flow
- Receive webhook/manual paid events and auto-issue license keys

## App Flow (Subscriber)

1. Generate key in dashboard.
2. Give key to buyer.
3. Buyer opens **Settings -> Activate License Key** and enters key.
4. App validates locally and unlocks premium.

## Online Validation API (Option 1)

Public validation endpoint:

`POST /api/public/validate`

Payload:

- `licenseKey`
- `deviceId`
- `action` = `activate` or `revalidate`

Optional token protection:

- Set `LICENSE_PUBLIC_API_TOKEN` when starting dashboard.
- App sends same token via `EXPO_PUBLIC_LICENSE_API_TOKEN`.

Recommended app env for online mode:

```txt
EXPO_PUBLIC_LICENSE_VALIDATION_URL=http://<PC-LAN-IP>:8787
EXPO_PUBLIC_LICENSE_REMOTE_REQUIRED=true
EXPO_PUBLIC_LICENSE_API_TOKEN=<same-token-if-used>
```

`REMOTE_REQUIRED=true` means app will fail activation/revalidate when dashboard API is unreachable.

## Webhook Checkout API (Option 2)

Checkout create endpoint:

- `POST /checkout` (or `POST /api/payment/checkout`)

Order status endpoint:

- `GET /order-status?orderId=...&claimToken=...` (or `GET /api/payment/status?...`)

Webhook endpoint:

- `POST /webhook/paymongo` (or `POST /api/webhook/paymongo`)

Manual paid trigger (for local testing):

- `POST /api/payment/mark-paid`
- body: `{ "orderId": "...", "adminToken": "..." }`

Optional environment variables:

- `LICENSE_DASHBOARD_ADMIN_TOKEN` for admin endpoints (mark-paid)
- `LICENSE_WEBHOOK_SECRET` for webhook endpoint
- `LICENSE_PRICE_PHP`, `LICENSE_DEFAULT_DAYS`, `LICENSE_GCASH_NAME`, `LICENSE_GCASH_NUMBER`, `LICENSE_GCASH_QR_URL`

App env for local webhook checkout:

```txt
EXPO_PUBLIC_ENABLE_GCASH_CHECKOUT=true
EXPO_PUBLIC_LICENSE_API_BASE_URL=http://<PC-LAN-IP>:8787
EXPO_PUBLIC_LICENSE_VALIDATION_URL=http://<PC-LAN-IP>:8787
```

## Security Note

By default this server listens on `0.0.0.0` for LAN testing.
Use only trusted local networks and do not expose this server to public internet.
