@echo off
NET SESSION >nul 2>&1
IF %ERRORLEVEL% NEQ 0 (
    echo [ERROR] This script requires Administrator privileges.
    echo Right-click and select "Run as administrator".
    pause
    exit /b
)

set SERVICE_NAME=eControlMaestro

echo [INFO] stopping mutual watchdog...

echo [INFO] Stopping Service: %SERVICE_NAME%...
sc stop "%SERVICE_NAME%" >nul 2>&1
timeout /t 2 /nobreak >nul

echo [INFO] Killing all agent processes to prevent auto-restart...
taskkill /F /IM agent-launcher.exe /T >nul 2>&1
taskkill /F /IM agent-master.exe /T >nul 2>&1
taskkill /F /IM agent-ui.exe /T >nul 2>&1
timeout /t 1 /nobreak >nul

echo [INFO] Deleting Service: %SERVICE_NAME%...
sc delete "%SERVICE_NAME%" >nul 2>&1

echo [INFO] Removing Registry Auto-start...
reg delete "HKCU\Software\Microsoft\Windows\CurrentVersion\Run" /v "eControlLauncher" /f >nul 2>&1

echo [INFO] Cleaning up C:\eControl...
if exist "C:\eControl" (
    rmdir /S /Q "C:\eControl"
)

echo.
echo [SUCCESS] Service removed, processes killed, and files cleaned.
echo You can now proceed with a clean installation.
pause
