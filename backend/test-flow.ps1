# Test de Flujo Completo - rojasloza
$baseUrl = "http://192.168.1.121:3001"
$pcId = "72f2b5d1-765d-4d00-ae20-f833b22471be"
$lanId = "724f11c3-b44c-46a1-80fb-8ba0ce6ceeec"

Write-Host "`n=== SIMULACION DE FLUJO COMPLETO ===" -ForegroundColor Cyan
Write-Host "Servidor: $baseUrl`n" -ForegroundColor Cyan

# PASO 0: Login cajero
Write-Host "[0] LOGIN CAJERO" -ForegroundColor Yellow
$staffResp = Invoke-RestMethod -Uri "$baseUrl/auth/login" -Method POST -ContentType "application/json" -Body '{"identifier":"test@test.com","password":"123456"}'
$staffToken = $staffResp.token
Write-Host "OK Cajero autenticado`n" -ForegroundColor Green

# PASO 1: LOGIN rojasloza
Write-Host "[1] LOGIN rojasloza" -ForegroundColor Yellow
$loginResp = Invoke-RestMethod -Uri "$baseUrl/auth/login-from-pc" -Method POST -ContentType "application/json" -Body "{`"identifier`":`"rojasloza`",`"password`":`"123456`",`"pcId`":`"$pcId`"}"
$token = $loginResp.token
$userId = $loginResp.user.id
$initialBalance = $loginResp.user.balance
Write-Host "OK User: $userId, Saldo: S/ $initialBalance`n" -ForegroundColor Green

# PASO 2: Verificar saldo
Write-Host "[2] VERIFICAR SALDO" -ForegroundColor Yellow
$bal = Invoke-RestMethod -Uri "$baseUrl/agents/balance/$userId"
Write-Host "Balance: S/ $($bal.balance)`n" -ForegroundColor White

# PASO 3: Recarga S/ 5
Write-Host "[3] RECARGA S/ 5.00" -ForegroundColor Yellow
$recharge1 = Invoke-RestMethod -Uri "$baseUrl/users/$userId/recharge" -Method POST -ContentType "application/json" -Headers @{Authorization = "Bearer $staffToken" } -Body "{`"amount`":5,`"lanId`":`"$lanId`",`"paymentMethod`":`"CASH`"}"
Write-Host "OK Nuevo saldo: S/ $($recharge1.newBalance)`n" -ForegroundColor Green

# PASO 4: Verificar saldo
Write-Host "[4] VERIFICAR SALDO" -ForegroundColor Yellow
$bal = Invoke-RestMethod -Uri "$baseUrl/agents/balance/$userId"
Write-Host "Balance: S/ $($bal.balance)`n" -ForegroundColor White

# PASO 5: Iniciar OPEN
Write-Host "[5] INICIAR SESION OPEN" -ForegroundColor Yellow
$open = Invoke-RestMethod -Uri "$baseUrl/agents/purchase?pcId=$pcId" -Method POST -ContentType "application/json" -Headers @{Authorization = "Bearer $token" } -Body "{`"userId`":`"$userId`",`"type`":`"OPEN`",`"paymentMethod`":`"BALANCE`",`"pcId`":`"$pcId`"}"
$sessionId = $open.session.id
Write-Host "OK Session: $sessionId`n" -ForegroundColor Green

# PASO 6: Esperar 61 seg
Write-Host "[6] ESPERAR 61 segundos" -ForegroundColor Yellow
for ($i = 61; $i -gt 0; $i--) {
    Write-Host "`r  Tiempo: $i seg  " -NoNewline
    Start-Sleep -Seconds 1
}
Write-Host "`nOK Completado`n" -ForegroundColor Green

# PASO 7: Finalizar OPEN
Write-Host "[7] FINALIZAR SESSION OPEN" -ForegroundColor Yellow
$end = Invoke-RestMethod -Uri "$baseUrl/sessions/$sessionId/end" -Method POST -ContentType "application/json" -Headers @{Authorization = "Bearer $token" } -Body '{"paymentMethod":"BALANCE"}'
Write-Host "OK Costo: S/ $($end.session.totalCost), Duracion: $($end.session.durationSeconds) seg`n" -ForegroundColor Green

# PASO 8: Verificar saldo
Write-Host "[8] VERIFICAR SALDO" -ForegroundColor Yellow
$bal = Invoke-RestMethod -Uri "$baseUrl/agents/balance/$userId"
Write-Host "Balance: S/ $($bal.balance)`n" -ForegroundColor White

# PASO 9: Verificar PC
Write-Host "[9] VERIFICAR PC" -ForegroundColor Yellow
$pc = Invoke-RestMethod -Uri "$baseUrl/pcs/$pcId"
Write-Host "Estado: $($pc.status), Usuario: $($pc.activeuser.username), Sesiones: $($pc.sessions.Count)`n" -ForegroundColor White

# PASO 10: Recarga S/ 3
Write-Host "[10] RECARGA S/ 3.00" -ForegroundColor Yellow
$recharge2 = Invoke-RestMethod -Uri "$baseUrl/users/$userId/recharge" -Method POST -ContentType "application/json" -Headers @{Authorization = "Bearer $staffToken" } -Body "{`"amount`":3,`"lanId`":`"$lanId`",`"paymentMethod`":`"CASH`"}"
Write-Host "OK Nuevo saldo: S/ $($recharge2.newBalance)`n" -ForegroundColor Green

# PASO 11: Verificar saldo
Write-Host "[11] VERIFICAR SALDO" -ForegroundColor Yellow
$bal = Invoke-RestMethod -Uri "$baseUrl/agents/balance/$userId"
Write-Host "Balance: S/ $($bal.balance)`n" -ForegroundColor White

# PASO 12: Logout
Write-Host "[12] LOGOUT" -ForegroundColor Yellow
Invoke-RestMethod -Uri "$baseUrl/auth/logout-from-pc" -Method POST -ContentType "application/json" -Headers @{Authorization = "Bearer $token" } -Body "{`"pcId`":`"$pcId`"}" | Out-Null
Write-Host "OK Logout exitoso`n" -ForegroundColor Green

# PASO 13: Re-login
Write-Host "[13] RE-LOGIN" -ForegroundColor Yellow
$login2 = Invoke-RestMethod -Uri "$baseUrl/auth/login-from-pc" -Method POST -ContentType "application/json" -Body "{`"identifier`":`"rojasloza`",`"password`":`"123456`",`"pcId`":`"$pcId`"}"
$token = $login2.token
Write-Host "OK Saldo: S/ $($login2.user.balance)`n" -ForegroundColor Green

# PASO 14: Verificar saldo
Write-Host "[14] VERIFICAR SALDO" -ForegroundColor Yellow
$bal = Invoke-RestMethod -Uri "$baseUrl/agents/balance/$userId"
Write-Host "Balance: S/ $($bal.balance)`n" -ForegroundColor White

# PASO 15: Comprar tarifa
Write-Host "[15] COMPRAR TARIFA 2 min" -ForegroundColor Yellow
$rates = Invoke-RestMethod -Uri "$baseUrl/agents/rates?pcId=$pcId" -Headers @{Authorization = "Bearer $token" }
$rate = $rates | Where-Object { $_.minutes -eq 2 } | Select-Object -First 1
if ($rate) {
    Write-Host "Tarifa: $($rate.minutes) min - S/ $($rate.price)" -ForegroundColor White
    $ratePurch = Invoke-RestMethod -Uri "$baseUrl/agents/purchase?pcId=$pcId" -Method POST -ContentType "application/json" -Headers @{Authorization = "Bearer $token" } -Body "{`"userId`":`"$userId`",`"type`":`"RATE`",`"itemId`":`"$($rate.id)`",`"paymentMethod`":`"BALANCE`",`"pcId`":`"$pcId`"}"
    $sessionId = $ratePurch.session.id
    Write-Host "OK Tarifa comprada, Session: $sessionId`n" -ForegroundColor Green
}

# PASO 16: Verificar saldo
Write-Host "[16] VERIFICAR SALDO" -ForegroundColor Yellow
$bal = Invoke-RestMethod -Uri "$baseUrl/agents/balance/$userId"
Write-Host "Balance: S/ $($bal.balance)`n" -ForegroundColor White

# PASO 17: Finalizar tarifa
Write-Host "[17] FINALIZAR TARIFA" -ForegroundColor Yellow
$endRate = Invoke-RestMethod -Uri "$baseUrl/sessions/$sessionId/end" -Method POST -ContentType "application/json" -Headers @{Authorization = "Bearer $token" } -Body '{"paymentMethod":"BALANCE"}'
Write-Host "OK Duracion: $($endRate.session.durationSeconds) seg`n" -ForegroundColor Green

# PASO 18: Verificar saldo
Write-Host "[18] VERIFICAR SALDO" -ForegroundColor Yellow
$bal = Invoke-RestMethod -Uri "$baseUrl/agents/balance/$userId"
$finalBalance = $bal.balance
Write-Host "Balance final: S/ $finalBalance`n" -ForegroundColor White

# PASO 19: Verificar PC
Write-Host "[19] VERIFICAR PC" -ForegroundColor Yellow
$pc = Invoke-RestMethod -Uri "$baseUrl/pcs/$pcId"
Write-Host "Estado: $($pc.status), Usuario: $($pc.activeUser.username), Balance: S/ $($pc.activeUser.balance)`n" -ForegroundColor White

# PASO 20: Logout final
Write-Host "[20] LOGOUT FINAL" -ForegroundColor Yellow
Invoke-RestMethod -Uri "$baseUrl/auth/logout-from-pc" -Method POST -ContentType "application/json" -Headers @{Authorization = "Bearer $token" } -Body "{`"pcId`":`"$pcId`"}" | Out-Null
Write-Host "OK Logout exitoso`n" -ForegroundColor Green

# PASO 21: Verificar PC post-logout
Write-Host "[21] VERIFICAR PC POST-LOGOUT" -ForegroundColor Yellow
$pc = Invoke-RestMethod -Uri "$baseUrl/pcs/$pcId"
Write-Host "Estado: $($pc.status)" -ForegroundColor White
if ($pc.activeUser) {
    Write-Host "Usuario activo: $($pc.activeUser.username) (ERROR)" -ForegroundColor Red
}
else {
    Write-Host "Usuario activo: NULL (OK)" -ForegroundColor Green
}
Write-Host "Sesiones: $($pc.sessions.Count) (esperado: 0)`n" -ForegroundColor White

# RESUMEN
Write-Host "=== RESUMEN ===" -ForegroundColor Cyan
Write-Host "Balance inicial: S/ $initialBalance" -ForegroundColor White
Write-Host "Recargas totales: S/ 8.00" -ForegroundColor Cyan
Write-Host "Balance final: S/ $finalBalance" -ForegroundColor White
$gastado = $initialBalance + 8 - $finalBalance
Write-Host "Gastado: S/ $gastado" -ForegroundColor $(if ($gastado -gt 0) { "Red" } else { "Green" })
Write-Host ""
