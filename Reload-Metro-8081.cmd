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
echo [MF-SA] Workspace locked to: %CD%

echo [MF-SA] Reloading Metro (port 8081)...
powershell -NoProfile -ExecutionPolicy Bypass -Command "$port=8081; $statusUrl='http://127.0.0.1:'+$port+'/status'; $reloadUrls=@('http://127.0.0.1:'+$port+'/reload','http://127.0.0.1:'+$port+'/refresh'); try { $status=Invoke-WebRequest -UseBasicParsing -Uri $statusUrl -TimeoutSec 2; if ($status.Content -match 'packager-status:running') { $sent=$false; foreach ($url in $reloadUrls) { try { Invoke-WebRequest -UseBasicParsing -Method Post -Uri $url -TimeoutSec 2 | Out-Null; $sent=$true; break } catch { try { Invoke-WebRequest -UseBasicParsing -Uri $url -TimeoutSec 2 | Out-Null; $sent=$true; break } catch {} } }; if ($sent) { Write-Output '[MF-SA] Reload signal sent to existing Metro.'; exit 0 } else { Write-Output '[MF-SA] Metro is running but reload endpoint did not respond.'; exit 2 } } else { Write-Output '[MF-SA] Metro status endpoint is reachable but not running.'; exit 1 } } catch { Write-Output '[MF-SA] Metro is not running on port 8081.'; exit 1 }"
if %errorlevel%==0 (
  goto :done
)

echo [MF-SA] Starting Metro because none was detected...
call "%WORKSPACE_ROOT%\Start-MF-SA-Dev.cmd"

:done
endlocal
