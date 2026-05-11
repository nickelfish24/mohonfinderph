# Mohon Finder PH - Play Store Deployment Notes

## Current Release Artifact
- AAB file: `mohon-finder-ph-play-release-20260323-1935.aab`
- Absolute path: `C:\Users\LENOVO\Desktop\System Projects\mohon_finder_ph\mohon-finder-ph-play-release-20260323-1935.aab`

## Upload Keystore Fingerprints (for API restrictions)
- SHA1: `19:77:AA:41:A0:18:C5:C5:21:D3:03:02:C0:40:8F:3F:F2:60:E1:51`
- SHA256: `9C:CE:68:83:A3:CA:AC:91:5E:59:D4:A0:4A:C3:38:38:71:14:BF:02:2B:01:82:46:7F:13:41:0A:6F:A3:94:C8`

## Production Build Command (local)
Run from project root:

```powershell
$env:EXPO_PUBLIC_ENABLE_MOCK_BILLING="false"
$env:EXPO_PUBLIC_AUTO_DEV_AUTH="false"
cd android
.\gradlew.bat bundleRelease
```

## Play Console First Steps
1. Open Play Console and create app listing.
2. Upload the generated `.aab`.
3. Complete App Content forms (privacy policy, data safety, ads, etc.).
4. Fill Store Listing (title, short/full description, screenshots, icon, feature graphic).
5. Create internal test track release first.
6. Add testers and validate install + sign-in + map + OCR + saved lots.
7. Promote to production only after internal test passes.

## Important
- Keep signing keystore and passwords private.
- Do not publish builds with development-only flags enabled.
