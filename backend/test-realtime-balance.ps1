$BASE_URL = "http://192.168.1.121:3001"
# PC_ID actual de PC21 segun heartbeats del Master
$PC_ID = "d2b3a609-ada5-4013-a79e-9dedd1599fa2" 
$LAN_ID = "724f11c3-b44c-46a1-80fb-8ba0ce6ceeec"
$API_KEY = "8fc837e8-77a4-49e7-8274-f10bdfa0f78b"

$STAFF_EMAIL = "test@test.com"
$STAFF_PASS = "123456"

$USER_NAME = "rojasloza"
$USER_PASS = "123456"

function Write-Step($num, $desc) {
    Write-Host "`n[STEP $num] $desc" -ForegroundColor Cyan
}

Write-Step 0 "Cleanup: Logout PC to ensure clean state"
try {
    Invoke-RestMethod -Uri "$BASE_URL/auth/logout-from-pc" -Method Post -Body (@{ pcId = $PC_ID } | ConvertTo-Json) -ContentType "application/json" -ErrorAction SilentlyContinue
    Write-Host "OK PC Logged out (if it was logged in)."
}
catch {
    Write-Host "Info: Logout failed or not needed." -ForegroundColor Gray
}

Write-Step 1 "Staff Login (Cajero)"
$staffLoginBody = @{ email = $STAFF_EMAIL; password = $STAFF_PASS } | ConvertTo-Json
$staffLogin = Invoke-RestMethod -Uri "$BASE_URL/auth/login" -Method Post -Body $staffLoginBody -ContentType "application/json"
$staffToken = $staffLogin.access_token
$staffUserId = $staffLogin.user.id
Write-Host "OK Staff Authenticated. ID: $staffUserId"

Write-Step 2 "User Login on PC"
$userLoginBody = @{ identifier = $USER_NAME; password = $USER_PASS; pcId = $PC_ID } | ConvertTo-Json
$userLogin = Invoke-RestMethod -Uri "$BASE_URL/auth/login" -Method Post -Body $userLoginBody -ContentType "application/json"
$userToken = $userLogin.access_token
$userId = $userLogin.user.id
$initialBalance = $userLogin.user.balance
Write-Host "OK User $USER_NAME logged in. Current Balance: S/ $initialBalance"

Write-Step 3 "Wait 5 seconds for UI Polling to stabilize"
Start-Sleep -Seconds 5

Write-Step 4 "Executing Recharge (Staff -> User)"
$rechargeAmount = 5.00
$rechargeBody = @{ amount = $rechargeAmount; lanId = $LAN_ID; paymentMethod = "CASH" } | ConvertTo-Json
$headers = @{ "Authorization" = "Bearer $staffToken" }
$rechargeResponse = Invoke-RestMethod -Uri "$BASE_URL/users/$userId/recharge" -Method Post -Body $rechargeBody -ContentType "application/json" -Headers $headers
$newBalance = $rechargeResponse.balance
Write-Host "OK Recharge successful. New Backend Balance: S/ $newBalance"

Write-Step 5 "Monitoring for Real-Time Update"
Write-Host "Waiting 10 seconds to allow WebSocket -> Master -> NamedPipe -> UI Polling flow to complete..." -ForegroundColor Gray
Start-Sleep -Seconds 10

Write-Step 6 "Verifying results in Logs"
$logPath = "c:\Users\EREDS\Documents\new econtrol project\client-dotnet\Release_V2\eControlLogs\ui_vm.log"
if (Test-Path $logPath) {
    $lastLines = Get-Content $logPath -Tail 50
    Write-Host "`nLast 50 lines of ui_vm.log:" -ForegroundColor Yellow
    $lastLines | ForEach-Object { Write-Host $_ }
    
    # Buscamos la transicion de saldo en los logs
    if ($lastLines -match "Updating Dashboard. Old Balance=$initialBalance, New Balance=$newBalance") {
        Write-Host "`n✅ SUCCESS: Real-time balance update detected in UI logs!" -ForegroundColor Green
    }
    elseif ($lastLines -match "Balance updated from Dashboard: $newBalance") {
        Write-Host "`n✅ SUCCESS: UI VM detected the new balance ($newBalance) via polling!" -ForegroundColor Green
    }
    else {
        Write-Host "`n⚠️ WARNING: Real-time update not explicitly found in logs. Manual verification needed." -ForegroundColor Yellow
    }
}
else {
    Write-Host "❌ ERROR: Log file not found at $logPath" -ForegroundColor Red
}

Write-Step 7 "Final Backend Check"
$finalCheck = Invoke-RestMethod -Uri "$BASE_URL/users/$userId" -Method Get -Headers @{ "Authorization" = "Bearer $userToken" }
Write-Host "Final User Balance in DB: S/ $($finalCheck.balance)"
