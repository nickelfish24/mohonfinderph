# Mohon Finder PH (MF-SA Workspace)

This repository contains the `MF-SA` Android app workspace built with Expo + React Native.

## What this project includes

- Android app with Home, Input, Map, and Fullscreen Map workflows
- Lot computation and saved-lots workflows
- CTC scanning flow and map rendering
- Variant-oriented build setup (ADS-ON and ADS-OFF)
- Local scripts for Metro, cleanup, and release builds

## Workspace root

`F:\System Projects\MF-SA\MF-SA-Workspace`

## Tech stack

- Expo / React Native
- Android Gradle build pipeline
- React Navigation
- Google Maps + geolocation tools
- AdMob integration (config-driven)

## Environment files

- `.env.local` -> active local credentials/settings
- `.env.example` -> template values

## Quick start (development)

```bash
npm install
npx expo start --dev-client --port 8081
```

## APK builds

See [README-BUILD.md](README-BUILD.md) for build and release commands.

## Notes

- Keep `google-services.json` and `.env.local` private.
- Regenerable folders (build/cache) are intentionally not tracked.
