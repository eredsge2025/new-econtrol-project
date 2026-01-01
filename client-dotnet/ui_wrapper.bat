@echo off
set LOGFILE=C:\Users\Public\eControl_Wrapper_Debug.log
echo %DATE% %TIME% - HARDWARE SERVICE INVOKED ME >> %LOGFILE%
echo Current Dir: %CD% >> %LOGFILE%
echo User Profile: %USERPROFILE% >> %LOGFILE%
echo Temp: %TEMP% >> %LOGFILE%

REM Redirect all output to temp logs to capture dotnet host error
agent-ui.exe > "%TEMP%\eControl_UI_StdOut.log" 2> "%TEMP%\eControl_UI_Err.log"

set EXIT_CODE=%ERRORLEVEL%
echo %DATE% %TIME% - UI Exited with code %EXIT_CODE% >> %LOGFILE%
exit /b %EXIT_CODE%
