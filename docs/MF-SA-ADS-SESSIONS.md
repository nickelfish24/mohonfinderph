# MF-SA ADS Sessions (MF-SA-Workspace)

Use this workspace only:
`C:\Users\LENOVO\Desktop\System Projects\MF_Variants\MF-SA\MF-SA-Workspace`

## ADS-ON
- Profile: `config/build-sessions/mf-sa-ads-on.json`
- Script: `scripts/build-mfsa-ads-on.ps1`
- Output: `releases/MF-SA/ADS-ON`
- Package ID: `com.mohonfinderph.app.adson.mfsa`

Run:
```powershell
powershell -ExecutionPolicy Bypass -File .\scripts\build-mfsa-ads-on.ps1
```

## ADS-OFF
- Profile: `config/build-sessions/mf-sa-ads-off.json`
- Script: `scripts/build-mfsa-ads-off.ps1`
- Output: `releases/MF-SA/ADS-OFF`
- Package ID: `com.mohonfinderph.app.adsoff.mfsa`

Run:
```powershell
powershell -ExecutionPolicy Bypass -File .\scripts\build-mfsa-ads-off.ps1
```

## Notes
- `subscription.js` includes `EXPO_PUBLIC_STANDALONE_ADS_MODE` handling so ADS-ON can show ads in standalone.
- Build outputs are timestamped to avoid overwriting.
- ADS-ON and ADS-OFF use different package IDs, so they can be installed side-by-side.
