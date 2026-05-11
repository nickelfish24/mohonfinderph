# MF-SA Latest Style Baseline

Last Updated: 2026-04-26  
Workspace (source of truth): `C:\Users\LENOVO\Desktop\System Projects\MF_Variants\MF-SA\MF-SA-Workspace`

## Purpose
This file is the single reference for the latest MF-SA UI/content styling decisions so they are not lost between sessions.

## Variant + Theme Source
- Variant: `standalone` (MF-SA)
- Theme config file: `config/standaloneReleaseConfig.json`
- Brand colors:
  - `brand`: `#1e3a8a`
  - `brandDark`: `#172554`
  - `brandSoft`: `rgba(30, 58, 138, 0.22)`

## Icons / Branding Assets (Current)
- App icon path: `./assets/variants/standalone/icon-dev-blue.png`
- Splash image path: `./assets/variants/standalone/splash-dev-white.png`
- Adaptive icon foreground: `./assets/variants/standalone/android-icon-foreground-dev-skyblue-safe.png`
- Adaptive icon background image: `./assets/variants/standalone/android-icon-background-dev-black.png`
- Adaptive icon background color: `#000000`

## Home Tab (Current)
- Uses icon+label quick access row (`IconTileButton`) for:
  - Start New Lot
  - Saved Lots
  - CTC Scanner
  - Settings
- Old Home subscription blocks removed from this MF-SA dev baseline:
  - Remove Ads Subscription
  - Subscription Benefits

## Input Tab (Current)
- Main actions use icon+label tiles (`IconTileButton`):
  - Use Sample CTC Data
  - Add Line Segment
  - Compute Mohon Points
  - Save Computed Lots
  - Save As New (when editing)
  - View on Map
  - Saved Lots Folder
- Action tiles now use enclosed centered style: `[icon + label]` inside one full-width box.
- Result area is separated into dedicated blocks:
  - Standalone `Result` output container
  - Standalone `Lot Name (for Save)` container
  - Standalone action tiles (no shared grouping card for Save/View/Saved Lots)

## Fullscreen Map (Current)
- Fullscreen controls are thumb-friendly in both orientations:
  - Larger icon buttons (`52x52`) with larger icon size (`26`).
  - Extra spacing between buttons to reduce accidental taps.
- Orientation behavior:
  - Landscape: right-side vertical control stack is scrollable.
  - Portrait: bottom control bar is horizontal-scrollable.
- Landscape right-side stack placement is moved inward:
  - `fullScreenRightBar.right = 56` (clears system/navigation edge overlap).
- Data visibility now uses a dedicated menu (from the list icon in fullscreen controls):
  - `Show All` toggle (wired to all layers below).
  - `Area name + lot size`
  - `Locator pin`
  - `Line segments`
  - `Bearings`
- Mohon details are no longer controlled from the slider group row.
- Label badge theming is unified to polygon theme:
  - Area badge, point details, segment/bearing badges all derive color from polygon stroke color.
  - Text color auto-adjusts for contrast against badge background.
- Opacity slider now affects all label/detail badges consistently:
  - Area badge
  - Point detail badges
  - Segment/bearing detail badges
- Marker view refresh fix:
  - Point detail and segment detail markers now allow style repaint (`tracksViewChanges` enabled) so opacity/style changes apply live.

## Saved Lots Page (Current)
- Actions converted to icon+label tiles (`IconTileButton`) including:
  - View Selected Lots
  - Clear Selection
  - Go to Input
  - Select for Map
  - View on Map
  - Navigate Lot
  - Edit Points
  - Delete Lot
  - Clear All Saved Lots
- Action tiles now use enclosed centered style: `[icon + label]` inside one full-width box.
- Removed redundant card text:
  - `Multi-lot map: Selected/Not selected`
- In each lot card, `Select for Map` tile is positioned directly above `View on Map`.
- Disabled white-tile labels remain readable (gray/visible), especially `Clear Selection`.

## Stability Note (Dev)
- Repeated banner mounts previously caused high memory pressure in device logs.
- Current baseline uses one `AdBanner` per screen where recently patched.

## Dev Start Command (Must Use)
- Script: `Start-MF-SA-Dev.cmd`
- Workspace lock file: `workspace.lock`
  - Locked root path: `C:\Users\LENOVO\Desktop\System Projects\MF_Variants\MF-SA\MF-SA-Workspace`
  - `Start-MF-SA-Dev.cmd` and `Reload-Metro-8081.cmd` now force `cd` to this locked path before running.
- Script now sets:
  - `APP_VARIANT=standalone`
  - `EXPO_PUBLIC_APP_VARIANT=standalone`
- This prevents loading the wrong variant behavior during dev sessions.
- Metro reload helper updated:
  - `Reload-Metro-8081.cmd` now sends reload to existing Metro first.
  - It only starts a new Metro if none is running.

## Rule for Future Sessions
Before building MF-SA dev/release, treat this file as the required checklist.
If a UI/flow decision changes, append a dated entry below before generating APK.

---

## Change Log Entries

### 2026-04-26
- Re-established MF-SA dev source-of-truth in `MF-SA-Workspace`.
- Converted Home/Input/Saved key actions to icon+label tile style.
- Restored CTC Scanner quick access on Home.
- Removed outdated Home subscription containers from MF-SA dev baseline.
- Enforced standalone variant env in dev startup script.
- Saved Lots refined:
  - Centered enclosed icon+label tiles
  - Removed redundant `Multi-lot map` text
  - Moved `Select for Map` just above `View on Map`
  - Fixed disabled `Clear Selection` readability
- Input refined:
  - Centered enclosed icon+label tiles
  - `Lot Name (for Save)` moved below result
  - `Result`, `Lot Name`, and action tiles split into separate visual blocks
- `Reload-Metro-8081.cmd` changed to smart-reload existing Metro instead of always rebuilding a new session.
- Fullscreen map refined:
  - Larger thumb-friendly fullscreen control buttons
  - Landscape control stack moved inward and kept vertically scrollable
  - Portrait fullscreen controls switched to horizontal scroll bar
  - Added `Map Data Visibility` menu with per-layer eye toggles + `Show All`
  - Unified label/detail badge colors to polygon color theme
  - Added auto-contrast label text colors
  - Wired point/segment/bearing badge opacity to the same opacity slider used by area label
  - Enabled live repaint for detail markers so opacity updates reflect immediately
