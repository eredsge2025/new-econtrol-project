@echo off
echo Starting eControl Client...
cd /d "%~dp0"
echo Launching Service...
start "" "econtrol-agent-service.exe"
echo Done.
exit
