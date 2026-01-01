$ErrorActionPreference = "Stop"
$dest = "C:\Users\EREDS\Documents\new econtrol project\agent-service\agent-release"

# Clean destination first to remove confusion
if (Test-Path $dest) {
    Write-Host "Cleaning destination directory..."
    Remove-Item "$dest\*" -Recurse -Force
}
else {
    New-Item -ItemType Directory -Force -Path $dest | Out-Null
}

Write-Host "Copying Agent Service..."
Copy-Item "C:\Users\EREDS\Documents\new econtrol project\agent-service\target\release\econtrol-agent-service.exe" -Destination "$dest\agent-service.exe" -Force

Write-Host "Copying Agent UI..."
Copy-Item "C:\Users\EREDS\Documents\new econtrol project\agent-ui\src-tauri\target\release\app.exe" -Destination "$dest\agent-ui.exe" -Force

# Handle Config: Copy and PATCH configuration to ensure uiPath is correct
$sourceConfig = "C:\Users\EREDS\Documents\new econtrol project\agent-service\config.json"
$destConfig = "$dest\config.json"
$configData = @{}

if (Test-Path $sourceConfig) {
    Write-Host "Reading existing config.json..."
    $jsonContent = Get-Content $sourceConfig -Raw
    $configData = $jsonContent | ConvertFrom-Json
}
else {
    Write-Host "Creating default config..."
    $configData = @{
        lanId             = "default-pc"
        apiKey            = "your-api-key"
        serverUrl         = "http://192.168.1.X:3000"
        heartbeatInterval = 5
    }
}

# Force update uiPath to match the deployed file name
Write-Host "Enforcing uiPath = 'agent-ui.exe' in deployed config..."
$configData | Add-Member -MemberType NoteProperty -Name "uiPath" -Value "agent-ui.exe" -Force

# Write back to destination
$configData | ConvertTo-Json -Depth 10 | Out-File $destConfig -Encoding utf8

# Copy WebView2Loader.dll if needed (Tauri usually embeds or handles it, but sometimes needed for sidecars? No, this is main app)
# Windows requires WebView2 runtime installed.

Write-Host "✅ Deployment Ready in $dest"
Write-Host "Files:"
Get-ChildItem $dest | Select-Object Name
