# Test de Flujo Completo - rojasloza (CORREGIDO)
# Endpoints correctos: /auth/login y /auth/logout
$baseUrl = "http://192.168.1.121:3001"
$pcId = "72f2b5d1-765d-4d00-ae20-f833b22471be"
$lanId = "724f11c3-b44c-46a1-80fb-8ba0ce6ceeec"
$apiKey = "8fc837e8-77a4-49e7-8274-f10bdfa0f78b"

Write-Host "`n=== SIMULACION DE FLUJO COMPLETO ===" -ForegroundColor Cyan
Write-Host "Servidor: $baseUrl`n" -ForegroundColor Cyan

# PASO 0: Login cajero
Write-Host "[0] LOGIN CAJERO" -ForegroundColor Yellow
$body0 = @{ identifier = "test@test.com"; password = "123456" } | ConvertTo-Json
$staffResp = Invoke-RestMethod -Uri "$baseUrl/auth/login" -Method POST -ContentType "application/json" -Body $body0
$staffToken = $staffResp.access_token
Write-Host "OK Cajero autenticado`n" -ForegroundColor Green

# PASO 1: LOGIN rojasloza (usando /auth/login)
Write-Host "[1] LOGIN rojasloza" -ForegroundColor Yellow
$body1 = @{ identifier = "rojasloza"; password = "123456"; pcId = $pcId } | ConvertTo-Json
$loginResp = Invoke-RestMethod -Uri "$baseUrl/auth/login" -Method POST -ContentType "application/json" -Body $body1
$token = $loginResp.access_token
$userId = $loginResp.user.id
$initialBalance = $loginResp.user.balance
Write-Host "OK User: $userId, Saldo: S/ $initialBalance`n" -ForegroundColor Green

# PASO 2: Verificar saldo
Write-Host "[2] VERIFICAR SALDO" -ForegroundColor Yellow
$user = Invoke-RestMethod -Uri "$baseUrl/users/$userId" -Headers @{Authorization = "Bearer $token" }
Write-Host "Balance: S/ $($user.balance)`n" -ForegroundColor White

# PASO 3: Recarga S/ 5
Write-Host "[3] RECARGA S/ 5.00" -ForegroundColor Yellow
$body3 = @{ amount = 5; lanId = $lanId; paymentMethod = "CASH" } | ConvertTo-Json
$recharge1 = Invoke-RestMethod -Uri "$baseUrl/users/$userId/recharge" -Method POST -ContentType "application/json" -Headers @{Authorization = "Bearer $staffToken" } -Body $body3
Write-Host "OK Nuevo saldo: S/ $($recharge1.newBalance)`n" -ForegroundColor Green

# PASO 4: Verificar saldo
Write-Host "[4] VERIFICAR SALDO" -ForegroundColor Yellow
$user = Invoke-RestMethod -Uri "$baseUrl/users/$userId" -Headers @{Authorization = "Bearer $token" }
Write-Host "Balance: S/ $($user.balance)`n" -ForegroundColor White

# PASO 5: Iniciar OPEN
Write-Host "[5] INICIAR SESION OPEN" -ForegroundColor Yellow
$body5 = @{ userId = $userId; type = "OPEN"; paymentMethod = "BALANCE"; pcId = $pcId } | ConvertTo-Json
$open = Invoke-RestMethod -Uri "$baseUrl/agents/purchase?pcId=$pcId" -Method POST -ContentType "application/json" -Headers @{Authorization = "Bearer $token"; "x-api-key" = $apiKey } -Body $body5
$sessionId = $open.session.id
Write-Host "OK Session: $sessionId`n" -ForegroundColor Green

# PASO 6: Esperar 61 seg (reducido a 10s para prueba rapida)
Write-Host "[6] ESPERAR 61 segundos" -ForegroundColor Yellow
for ($i = 61; $i -gt 0; $i--) {
    Write-Host "`r  Tiempo: $i seg  " -NoNewline
    Start-Sleep -Seconds 1
}
Write-Host "`nOK Completado`n" -ForegroundColor Green

# PASO 7: Finalizar OPEN
Write-Host "[7] FINALIZAR SESSION OPEN" -ForegroundColor Yellow
$body7 = @{ paymentMethod = "BALANCE" } | ConvertTo-Json
$end = Invoke-RestMethod -Uri "$baseUrl/sessions/$sessionId/end" -Method POST -ContentType "application/json" -Headers @{Authorization = "Bearer $token" } -Body $body7
Write-Host "OK Costo: S/ $($end.session.totalCost), Duracion: $($end.session.durationSeconds) seg`n" -ForegroundColor Green

# PASO 8: Verificar saldo
Write-Host "[8] VERIFICAR SALDO" -ForegroundColor Yellow
$user = Invoke-RestMethod -Uri "$baseUrl/users/$userId" -Headers @{Authorization = "Bearer $token" }
Write-Host "Balance: S/ $($user.balance)`n" -ForegroundColor White

# PASO 9: Verificar PC
Write-Host "[9] VERIFICAR PC" -ForegroundColor Yellow
$pc = Invoke-RestMethod -Uri "$baseUrl/pcs/$pcId" -Headers @{Authorization = "Bearer $token" }
Write-Host "Estado: $($pc.status), Usuario: $($pc.activeUser.username), Sesiones: $($pc.sessions.Count)`n" -ForegroundColor White

# PASO 10: Recarga S/ 3
Write-Host "[10] RECARGA S/ 3.00" -ForegroundColor Yellow
$body10 = @{ amount = 3; lanId = $lanId; paymentMethod = "CASH" } | ConvertTo-Json
$recharge2 = Invoke-RestMethod -Uri "$baseUrl/users/$userId/recharge" -Method POST -ContentType "application/json" -Headers @{Authorization = "Bearer $staffToken" } -Body $body10
Write-Host "OK Nuevo saldo: S/ $($recharge2.newBalance)`n" -ForegroundColor Green

# PASO 11: Verificar saldo
Write-Host "[11] VERIFICAR SALDO" -ForegroundColor Yellow
$user = Invoke-RestMethod -Uri "$baseUrl/users/$userId" -Headers @{Authorization = "Bearer $token" }
Write-Host "Balance: S/ $($user.balance)`n" -ForegroundColor White

# PASO 12: Logout (usando /auth/logout)
Write-Host "[12] LOGOUT" -ForegroundColor Yellow
Invoke-RestMethod -Uri "$baseUrl/auth/logout" -Method POST -ContentType "application/json" -Headers @{Authorization = "Bearer $token" } | Out-Null
Write-Host "OK Logout exitoso`n" -ForegroundColor Green

# PASO 13: Re-login
Write-Host "[13] RE-LOGIN" -ForegroundColor Yellow
$body13 = @{ identifier = "rojasloza"; password = "123456"; pcId = $pcId } | ConvertTo-Json
$login2 = Invoke-RestMethod -Uri "$baseUrl/auth/login" -Method POST -ContentType "application/json" -Body $body13
$token = $login2.access_token
Write-Host "OK Saldo: S/ $($login2.user.balance)`n" -ForegroundColor Green

# PASO 14: Verificar saldo
Write-Host "[14] VERIFICAR SALDO" -ForegroundColor Yellow
$user = Invoke-RestMethod -Uri "$baseUrl/users/$userId" -Headers @{Authorization = "Bearer $token" }
Write-Host "Balance: S/ $($user.balance)`n" -ForegroundColor White

# PASO 15: Comprar tarifa
Write-Host "[15] COMPRAR TARIFA 2 min" -ForegroundColor Yellow
$rates = Invoke-RestMethod -Uri "$baseUrl/agents/rates?pcId=$pcId" -Headers @{Authorization = "Bearer $token"; "x-api-key" = $apiKey }
$rate = $rates | Where-Object { $_.minutes -eq 2 } | Select-Object -First 1
if ($rate) {
    Write-Host "Tarifa: $($rate.minutes) min - S/ $($rate.price)" -ForegroundColor White
    $body15 = @{ userId = $userId; type = "RATE"; itemId = $rate.id; paymentMethod = "BALANCE"; pcId = $pcId } | ConvertTo-Json
    $ratePurch = Invoke-RestMethod -Uri "$baseUrl/agents/purchase?pcId=$pcId" -Method POST -ContentType "application/json" -Headers @{Authorization = "Bearer $token"; "x-api-key" = $apiKey } -Body $body15
    $sessionId = $ratePurch.session.id
    Write-Host "OK Tarifa comprada, Session: $sessionId`n" -ForegroundColor Green
}

# PASO 16: Verificar saldo
Write-Host "[16] VERIFICAR SALDO" -ForegroundColor Yellow
$user = Invoke-RestMethod -Uri "$baseUrl/users/$userId" -Headers @{Authorization = "Bearer $token" }
Write-Host "Balance: S/ $($user.balance)`n" -ForegroundColor White

# PASO 17: Finalizar tarifa
Write-Host "[17] FINALIZAR TARIFA" -ForegroundColor Yellow
$body17 = @{ paymentMethod = "BALANCE" } | ConvertTo-Json
$endRate = Invoke-RestMethod -Uri "$baseUrl/sessions/$sessionId/end" -Method POST -ContentType "application/json" -Headers @{Authorization = "Bearer $token" } -Body $body17
Write-Host "OK Duracion: $($endRate.session.durationSeconds) seg`n" -ForegroundColor Green

# PASO 18: Verificar saldo
Write-Host "[18] VERIFICAR SALDO" -ForegroundColor Yellow
$user = Invoke-RestMethod -Uri "$baseUrl/users/$userId" -Headers @{Authorization = "Bearer $token" }
$finalBalance = $user.balance
Write-Host "Balance final: S/ $finalBalance`n" -ForegroundColor White

# PASO 19: Verificar PC
Write-Host "[19] VERIFICAR PC" -ForegroundColor Yellow
$pc = Invoke-RestMethod -Uri "$baseUrl/pcs/$pcId" -Headers @{Authorization = "Bearer $token" }
Write-Host "Estado: $($pc.status), Usuario: $($pc.activeUser.username), Balance: S/ $($pc.activeUser.balance)`n" -ForegroundColor White

# PASO 20: Logout final
Write-Host "[20] LOGOUT FINAL" -ForegroundColor Yellow
Invoke-RestMethod -Uri "$baseUrl/auth/logout" -Method POST -ContentType "application/json" -Headers @{Authorization = "Bearer $token" } | Out-Null
Write-Host "OK Logout exitoso`n" -ForegroundColor Green

# PASO 21: Verificar PC post-logout
Write-Host "[21] VERIFICAR PC POST-LOGOUT" -ForegroundColor Yellow
$pc = Invoke-RestMethod -Uri "$baseUrl/pcs/$pcId" -Headers @{Authorization = "Bearer $staffToken" }
Write-Host "Estado: $($pc.status)" -ForegroundColor White
if ($pc.activeUser) {
    Write-Host "Usuario activo: $($pc.activeUser.username) [ERROR]" -ForegroundColor Red
}
else {
    Write-Host "Usuario activo: NULL [OK]" -ForegroundColor Green
}
Write-Host "Sesiones: $($pc.sessions.Count) (esperado: 0)`n" -ForegroundColor White

# RESUMEN
Write-Host "=== RESUMEN ===" -ForegroundColor Cyan
Write-Host "Balance inicial: S/ $initialBalance" -ForegroundColor White
Write-Host "Recargas: S/ 8.00" -ForegroundColor Cyan
Write-Host "Balance final: S/ $finalBalance" -ForegroundColor White
$gastado = $initialBalance + 8 - $finalBalance
if ($gastado -gt 0) {
    Write-Host "Gastado: S/ $gastado" -ForegroundColor Red
}
else {
    Write-Host "Gastado: S/ $gastado" -ForegroundColor Green
}
Write-Host ""
