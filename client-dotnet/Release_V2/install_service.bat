@echo off
NET SESSION >nul 2>&1
IF %ERRORLEVEL% NEQ 0 (
    echo [ERROR] This script requires Administrator privileges.
    echo Right-click and select "Run as administrator".
    pause
    exit /b
)

set SERVICE_NAME=eControlMaestro
set EXE_NAME=agent-master.exe
set EXE_PATH=C:\eControl\%EXE_NAME%

echo [INFO] Stopping existing service (if any)...
sc stop "%SERVICE_NAME%" >nul 2>&1
timeout /t 2 /nobreak >nul

echo [INFO] Deleting existing service (if any)...
sc delete "%SERVICE_NAME%" >nul 2>&1
timeout /t 2 /nobreak >nul

echo.
echo [INFO] Installing Service: %SERVICE_NAME%
echo [PATH] %EXE_PATH%

if not exist "C:\eControl" mkdir "C:\eControl"
echo [INFO] Copying files...
xcopy /Y /E /I "%~dp0*.*" "C:\eControl\"

echo Granting permissions...
icacls "C:\eControl" /grant Everyone:(OI)(CI)F /t
if not exist "C:\eControl\eControlLogs" mkdir "C:\eControl\eControlLogs"
icacls "C:\eControl\eControlLogs" /grant Everyone:(OI)(CI)F /t
if not exist "C:\Users\Public\eControlLogs" mkdir "C:\Users\Public\eControlLogs"
icacls "C:\Users\Public\eControlLogs" /grant Everyone:(OI)(CI)F /t

sc create "%SERVICE_NAME%" binPath= "%EXE_PATH%" start= auto DisplayName= "eControl Kiosk Maestro"
IF %ERRORLEVEL% NEQ 0 (
    echo [ERROR] Failed to create service.
    pause
    exit /b
)

echo.
echo [INFO] Configuring Recovery Actions (Restart on Failure)...
:: Restart after 1s, then 10s, then 60s. Reset failure count after 1 day (86400s).
sc failure "%SERVICE_NAME%" reset= 86400 actions= restart/1000/restart/10000/restart/60000

echo.
echo [INFO] Configuring User-Session Launcher (Global Startup - Registry)...
reg add "HKLM\Software\Microsoft\Windows\CurrentVersion\Run" /v "eControlLauncher" /t REG_SZ /d "C:\eControl\agent-launcher.exe" /f

echo [INFO] Configuring User-Session Launcher (Global Startup - Startup Folder)...
set SCRIPT="%TEMP%\CreateShortcut.vbs"
echo Set oWS = WScript.CreateObject("WScript.Shell") > %SCRIPT%
echo sLinkFile = "C:\ProgramData\Microsoft\Windows\Start Menu\Programs\Startup\eControlLauncher.lnk" >> %SCRIPT%
echo Set oLink = oWS.CreateShortcut(sLinkFile) >> %SCRIPT%
echo oLink.TargetPath = "C:\eControl\agent-launcher.exe" >> %SCRIPT%
echo oLink.WorkingDirectory = "C:\eControl" >> %SCRIPT%
echo oLink.Save >> %SCRIPT%
cscript /nologo %SCRIPT%
del %SCRIPT%

echo.
echo [INFO] Verifying Service Installation...
sc query "%SERVICE_NAME%"

echo.
echo [INFO] Starting Service...
sc start "%SERVICE_NAME%"

echo.
echo [INFO] Launching UI for current session...
start "" "C:\eControl\agent-launcher.exe"

echo.
echo [SUCCESS] eControl Maestro installed and started!
pause
