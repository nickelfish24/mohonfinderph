# Mohon Finder PH Release Checklist

## 1) Environment
- Install dependencies: `npm install`
- Check Expo dependency alignment: `npx expo install --check`
- Run diagnostics: `npx expo-doctor`

## 2) Core Functional QA (Expo Go / Dev Build)
- Start app: `npm start`
- Open in Expo Go (Android)
- Verify tabs order: `Home -> Input -> Map`
- Verify tab bar is elevated and content does not show behind it
- Note: Full native map + OCR verification should be done in Development Build / EAS APK.

## 3) Survey Flow
- Input manual starting lat/lng + bearing/distance
- Compute mohon and verify result section updates
- Enter multi-line traverse and compute full polygon
- Open Map and confirm markers + polygon render

## 4) CTC Scanner Flow
- Open `CTC Scanner` from Home or Input
- Use sample CTC data and parse
- Apply parsed data to Input and verify fields are populated
- OCR auto-read from image (camera/gallery) works in Development Build / EAS build

## 5) Premium & Paywall
- Verify locked features for free user:
  - Save lots
  - Advanced accuracy mode
  - Mohon Finder mode
  - AR Finder mode
- Trigger upgrade flow and verify mock premium unlock

## 6) Finder & AR Navigation
- Select target mohon from Map
- Enable Mohon Finder and verify:
  - Distance updates
  - Bearing/direction updates
  - Arrival detection when near target
- Open AR Finder and verify camera overlay + direction updates

## 7) Accuracy Mode QA
- Toggle Advanced Accuracy ON in Input or Settings
- Verify Map/AR show `Accuracy Mode: Advanced (Premium)`
- Confirm GPS quality label appears
- In weak GPS conditions, verify filtered-fix status message appears

## 8) External GNSS Bridge QA
- Open Settings -> GNSS Bridge
- Paste sample NMEA and apply
- Switch source mode (`internal`, `auto`, `external`)
- Verify Map/AR show position source + fix type/satellites/HDOP when external fix is active

## 9) Disclaimer & Recovery
- Verify legal disclaimer popup shows once per day on Home
- In Settings, use `Reset Daily Disclaimer (Developer)` then confirm popup appears again
- Pull-to-refresh on screens and verify temporary data clears correctly

## 10) Production Build Prep (EAS)
- Ensure logged into Expo account: `npx expo whoami`
- Configure EAS once: `npx eas build:configure`
- Set required environment variables in EAS:
  - `EXPO_PUBLIC_GOOGLE_MAPS_API_KEY`
  - `EXPO_PUBLIC_REVENUECAT_ANDROID_API_KEY` (for real billing)
- Create Android preview build:
  - `npx eas build -p android --profile preview`
- Create Android production build:
  - `npx eas build -p android --profile production`

## 11) Final Pre-Release
- Confirm app name, icon, splash, and version in `app.json`
- Confirm no critical warnings in Metro
- Smoke test on at least 2 Android devices
