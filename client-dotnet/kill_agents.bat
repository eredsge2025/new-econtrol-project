@echo off
echo Stopping eControl Agents...

taskkill /F /IM agent-ui.exe /T 2>NUL
if %ERRORLEVEL% EQU 0 (
    echo [OK] agent-ui.exe terminated.
) else (
    echo [INFO] agent-ui.exe was not running.
)

taskkill /F /IM agent-master.exe /T 2>NUL
if %ERRORLEVEL% EQU 0 (
    echo [OK] agent-master.exe terminated.
) else (
    echo [INFO] agent-master.exe was not running.
)

echo.
echo All agent processes stopped. You can now replace binaries.
pause
