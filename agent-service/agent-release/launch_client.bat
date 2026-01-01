@echo off
echo Starting eControl Client...
cd /d "%~dp0"
echo Launching Service (agent-service.exe)...
start "" "agent-service.exe"
echo Done.
exit
