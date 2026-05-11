# Mohon Finder PH - Play Store Release Notes

## Version
- App version: `1.0.1`
- Build number: `2`
- Track target: `Subscriber release`
- Release artifact: `mfph-subscriber-playstore-v1.0.1-build2-20260325-1854.aab`

## Highlights
- Hardened release entitlement flow:
  - Basic mode is default on release startup.
  - Developer/mock premium bypass is blocked in release builds.
- Preserved and validated premium feature gating flow for subscriber package.
- Retained Google Maps runtime key loading from `.env.local` (`EXPO_PUBLIC_GOOGLE_MAPS_API_KEY`).
- Added/retained app version display support in app settings area.

## Build Notes
- Android App Bundle generated from local Gradle:
  - Command: `gradlew bundleRelease`
  - Output: `android/app/build/outputs/bundle/release/app-release.aab`
- Build completed successfully on `2026-03-25`.

## QA Focus Before Upload
- Verify app starts in Basic mode for fresh install.
- Verify Upgrade flow unlocks premium features only via entitlement flow.
- Verify Google Map rendering and map actions (fit lot/full screen/satellite/save map).
- Verify Saved Lots create/update/save-as-new/delete behaviors.
- Verify CTC scanner and OCR flow.
