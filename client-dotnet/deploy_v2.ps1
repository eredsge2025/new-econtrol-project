$baseDir = "C:\Users\EREDS\Documents\new econtrol project\client-dotnet"
# Kill existing processes to ensure clean update
Stop-Process -Name "agent-ui" -Force -ErrorAction SilentlyContinue
Stop-Process -Name "agent-master" -Force -ErrorAction SilentlyContinue

$releaseDir = "$baseDir\Release_V2"
$tempMaster = "$baseDir\temp_master"
$tempUI = "$baseDir\temp_ui"

# Backup config if exists
$configFile = "$releaseDir\config.json"
$hasConfig = Test-Path $configFile
if ($hasConfig) {
    Copy-Item $configFile "$baseDir\config.backup.json" -Force
}

if (Test-Path $releaseDir) { Remove-Item -Recurse -Force $releaseDir }
if (Test-Path $tempMaster) { Remove-Item -Recurse -Force $tempMaster }
if (Test-Path $tempUI) { Remove-Item -Recurse -Force $tempUI }

New-Item -ItemType Directory $releaseDir
New-Item -ItemType Directory $tempMaster
New-Item -ItemType Directory $tempUI

$tempLauncher = "$baseDir\temp_launcher"
if (Test-Path $tempLauncher) { Remove-Item -Recurse -Force $tempLauncher }
New-Item -ItemType Directory $tempLauncher

Write-Host "Publishing Master..."
dotnet publish "$baseDir\eControl.Agent.Master\eControl.Agent.Master.csproj" -c Release -o $tempMaster -r win-x64 --self-contained true

Write-Host "Publishing UI..."
dotnet publish "$baseDir\eControl.Agent.UI\eControl.Agent.UI.csproj" -c Release -r win-x64 --self-contained true -p:PublishSingleFile=false -p:IncludeNativeLibrariesForSelfExtract=false -o $tempUI

Write-Host "Publishing Launcher..."
dotnet publish "$baseDir\eControl.Agent.Launcher\eControl.Agent.Launcher.csproj" -c Release -o $tempLauncher -r win-x64 --self-contained true

Write-Host "Consolidating..."
Copy-Item "$tempMaster\*" $releaseDir -Recurse -Force
Copy-Item "$tempUI\*" $releaseDir -Recurse -Force
Copy-Item "$tempLauncher\*" $releaseDir -Recurse -Force

Remove-Item -Recurse -Force $tempLauncher

if ($hasConfig) {
    Copy-Item "$baseDir\config.backup.json" "$releaseDir\config.json" -Force
    Remove-Item "$baseDir\config.backup.json" -Force
}
elseif (!(Test-Path "$releaseDir\config.json")) {
    $config = @{
        lanId                    = "724f11c3-b44c-46a1-80fb-8ba0ce6ceeec"
        apiKey                   = "8fc837e8-77a4-49e7-8274-f10bdfa0f78b"
        serverUrl                = "http://192.168.1.121:3001"
        heartbeatIntervalSeconds = 10
        uiPath                   = "agent-ui.exe"
    }
    $config | ConvertTo-Json | Out-File "$releaseDir\config.json" -Encoding utf8
}

Copy-Item "$baseDir\install_service.bat" "$releaseDir\install_service.bat" -Force
Copy-Item "$baseDir\uninstall_clean.bat" "$releaseDir\uninstall_clean.bat" -Force

Remove-Item -Recurse -Force $tempMaster
Remove-Item -Recurse -Force $tempUI

Write-Host "DONE! Binaries in $releaseDir"
dir $releaseDir | select Name, Length | select -First 15
