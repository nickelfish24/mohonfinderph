@echo off
setlocal
for %%L in (8080 8081) do (
  for /f "tokens=5" %%P in ('netstat -ano ^| findstr :%%L ^| findstr LISTENING') do (
    taskkill /PID %%P /F >nul 2>&1
  )
)
echo Cleared ports 8080 and 8081.
endlocal
