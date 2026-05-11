# MF-SA Session Log

Use this file to track every UI/content decision per session so instructions are never lost.

## 2026-04-26
- Confirmed MF-SA source workspace: `MF-SA-Workspace`.
- Updated Home/Input/Saved pages to icon+label action style.
- Restored `CTC Scanner` entry in Home quick actions.
- Removed outdated Home subscription containers from MF-SA dev baseline.
- Added standalone variant lock in `Start-MF-SA-Dev.cmd`.
- Added port clear scripts in workspace:
  - `Clear-8080.cmd`
  - `Clear-8081.cmd`
  - `Clear-8080-8081.cmd`
- Updated `Reload-Metro-8081.cmd` to smart-reload existing Metro first (and only start new if absent).
- Added hard workspace lock:
  - New file: `workspace.lock` with fixed MF-SA workspace root.
  - `Start-MF-SA-Dev.cmd` now always switches to locked workspace path first.
  - `Reload-Metro-8081.cmd` now always switches to locked workspace path first.
- Saved Lots refinements:
  - All action tiles set to enclosed centered `[icon + label]` style.
  - Removed `Multi-lot map: Selected/Not selected` status text.
  - Moved `Select for Map` tile directly above `View on Map`.
  - Fixed disabled white-tile label readability (`Clear Selection` remains visible).
- Input refinements:
  - Converted action tiles to enclosed centered `[icon + label]` style.
  - Moved `Lot Name (for Save)` below result area.
  - Separated containers into:
    - standalone `Result` output box
    - standalone `Lot Name` box
    - standalone action tile rows (no shared group card).
- Fullscreen map refinements:
  - Enlarged fullscreen action buttons for thumb-friendly tapping.
  - Landscape controls remain right-side vertical stack with scroll support.
  - Landscape right stack shifted inward to `right: 56`.
  - Portrait controls converted into a horizontal scrollable bottom bar.
  - Added map data menu from list icon with individual eye toggles:
    - Area name + lot size
    - Locator pin
    - Line segments
    - Bearings
  - Added wired `Show All` toggle in the same menu.
  - Removed old Mohon row dependency from slider control group.
  - Unified label/detail badge background to polygon-based color.
  - Added auto-contrast label text color logic for readability.
  - Wired opacity slider to area + point + segment/bearing label badges.
  - Fixed live visual updates by enabling marker view tracking on detail markers.

## Next Entry Template
- Date:
- Page/Feature:
- What changed:
- Files:
- Build generated: Yes/No
- APK path:
