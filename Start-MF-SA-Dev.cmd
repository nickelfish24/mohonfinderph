@echo off
setlocal
set "LOCK_FILE=%~dp0workspace.lock"
if exist "%LOCK_FILE%" (
  set /p "WORKSPACE_ROOT="<"%LOCK_FILE%"
)
if not defined WORKSPACE_ROOT (
  set "WORKSPACE_ROOT=%~dp0"
)
cd /d "%WORKSPACE_ROOT%"
echo [MF-SA Dev] Workspace locked to: %CD%

for /f "usebackq delims=" %%I in (`powershell -NoProfile -Command "$ip=(Get-NetIPAddress -AddressFamily IPv4 | Where-Object { $_.IPAddress -notlike '127.*' -and $_.IPAddress -notlike '169.254*' } | Sort-Object InterfaceMetric | Select-Object -First 1 -ExpandProperty IPAddress); if (-not $ip) { $ip='127.0.0.1' }; Write-Output $ip"`) do set "LAN_IP=%%I"

echo [MF-SA Dev] Using LAN IP: %LAN_IP%
powershell -NoProfile -Command "Get-NetTCPConnection -LocalPort 8081 -State Listen -ErrorAction SilentlyContinue | ForEach-Object { Stop-Process -Id $_.OwningProcess -Force -ErrorAction SilentlyContinue }"
set "REACT_NATIVE_PACKAGER_HOSTNAME=%LAN_IP%"
set "APP_VARIANT=standalone"
set "EXPO_PUBLIC_APP_VARIANT=standalone"

npx expo start --dev-client --host lan --port 8081 --clear

endlocal
