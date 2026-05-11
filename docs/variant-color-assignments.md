# Variant Color Assignments

Last updated: 2026-03-31

This file records the active visual color identity per app variant.
Sources:
- `config/devBuildConfig.json`
- `config/subscriberReleaseConfig.json`
- `config/ownerReleaseConfig.json`
- `config/dualReleaseConfig.json`
- `config/standaloneReleaseConfig.json`
- `assets/variants/*`

## Assigned Colors

| Variant | Primary (`brand`) | Dark (`brandDark`) | Soft (`brandSoft`) | Asset Folder |
|---|---|---|---|---|
| subscriber | `#34d399` | `#059669` | `rgba(52, 211, 153, 0.22)` | `assets/variants/subscriber` |
| owner | `#34d399` | `#059669` | `rgba(52, 211, 153, 0.22)` | `assets/variants/owner` |
| dev | `#34d399` | `#059669` | `rgba(52, 211, 153, 0.22)` | `assets/variants/dev` |
| dual | `#34d399` | `#059669` | `rgba(52, 211, 153, 0.22)` | `assets/variants/dual` |
| standalone (MF-SA) | `#34d399` | `#059669` | `rgba(52, 211, 153, 0.22)` | `assets/variants/standalone` |

## Icon/Splash Naming Notes

- UI color theming is unified to mint green across all variants for readability and consistency.
- Variant identity is now primarily via app naming and feature set, while icon/splash assets remain variant-scoped in `assets/variants/*`.
