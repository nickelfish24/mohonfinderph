# Build & Release Guide (MF-SA)

This document explains local build flows used in this workspace.

## 1) Development server

Start Metro on `8081`:

```bash
npx expo start --dev-client --port 8081 --clear
```

Useful scripts in root:

- `Start-MF-SA-Dev.cmd`
- `Reload-Metro-8081.cmd`
- `Clear-8081.cmd`
- `Clear-8080.cmd`
- `Clear-8080-8081.cmd`

## 2) Android APK release build

From project root:

```bash
cd android
gradlew.bat assembleRelease
```

Default output:

`android/app/build/outputs/apk/release/app-release.apk`

## 3) ADS-ON / ADS-OFF release variants

These are controlled by env flags during build:

- `EXPO_PUBLIC_STANDALONE_ADS_MODE=on`
- `EXPO_PUBLIC_STANDALONE_ADS_MODE=off`

Package IDs can be separated for side-by-side install (if configured):

- ADS-ON example: `com.mohonfinderph.app.adson.mfsa`
- ADS-OFF example: `com.mohonfinderph.app.adsoff.mfsa`

## 4) AdMob credentials location

Main env variables are stored in:

- `.env.local`
- `.env.example`

Examples:

- `EXPO_PUBLIC_ADMOB_APP_ID_ANDROID`
- `EXPO_PUBLIC_ADMOB_BANNER_ANDROID_ID`
- `EXPO_PUBLIC_ADMOB_INTERSTITIAL_ANDROID_ID`
- `EXPO_PUBLIC_ADMOB_REWARDED_ANDROID_ID`

## 5) Security note

For final public distribution, use a real release keystore and secure signing.
