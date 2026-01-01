$distDir = "C:\Users\EREDS\Documents\new econtrol project\dist"
$serviceSrc = "C:\Users\EREDS\Documents\new econtrol project\agent-service\target\release\econtrol-agent-service.exe"
$uiSrc = "C:\Users\EREDS\Documents\new econtrol project\agent-ui\src-tauri\target\release\app.exe"

# Clean and Create Dist
if (Test-Path $distDir) { Remove-Item -Recurse -Force $distDir }
New-Item -ItemType Directory -Force -Path "$distDir\ui" | Out-Null

# Copy Binaries
Copy-Item $serviceSrc "$distDir\econtrol-agent-service.exe"
Copy-Item $uiSrc "$distDir\ui\app.exe"

# Create Production Config
$config = @{
    lanId             = "e3609ca8-44b3-4ffe-9be4-f6db77e9fe71"
    apiKey            = "b088ef1b-47e5-412e-8d2d-4f99f7561107"
    serverUrl         = "http://192.168.1.121:3001"
    heartbeatInterval = 5
    uiPath            = "./ui/app.exe"
}
$config | ConvertTo-Json -Depth 2 | Set-Content "$distDir\config.json"

# Copy Launcher
Copy-Item "C:\Users\EREDS\Documents\new econtrol project\agent-service\launch_client.bat" "$distDir\launch_client.bat"

Write-Host "Package created at $distDir"
