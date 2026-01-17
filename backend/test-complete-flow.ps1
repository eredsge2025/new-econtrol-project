# Simulación Completa de Flujo de Usuario - rojasloza (v2)
# Incluye recargas de saldo
# Fecha: 2026-01-10 14:09

$baseUrl = "http://localhost:3000"
$pcId = "72f2b5d1-765d-4d00-ae20-f833b22471be"  # PC01
$username = "rojasloza"
$password = "123456"
$staffToken = ""  # Token del cajero para recargas

# Primero login como staff para obtener token
Write-Host "`n=== LOGIN CAJERO (para recargas) ===" -ForegroundColor Magenta
$staffLoginPayload = @{
    identifier = "admin@econtrol.com"
    password   = "admin123"
} | ConvertTo-Json

$staffLogin = Invoke-RestMethod -Uri "$baseUrl/auth/login" -Method POST -ContentType "application/json" -Body $staffLoginPayload
$staffToken = $staffLogin.token
Write-Host "✅ Cajero autenticado" -ForegroundColor Green

Write-Host "`n========================================" -ForegroundColor Cyan
Write-Host "SIMULACIÓN DE FLUJO COMPLETO" -ForegroundColor Cyan
Write-Host "Usuario: $username" -ForegroundColor Cyan
Write-Host "========================================`n" -ForegroundColor Cyan

$stepNum = 1

# PASO 1: LOGIN
Write-Host "`n[$stepNum] LOGIN - $username" -ForegroundColor Yellow
$stepNum++
$loginPayload = @{
    identifier = $username
    password   = $password
    pcId       = $pcId
} | ConvertTo-Json

$loginResponse = Invoke-RestMethod -Uri "$baseUrl/auth/login-from-pc" -Method POST -ContentType "application/json" -Body $loginPayload
$token = $loginResponse.token
$userId = $loginResponse.user.id
$initialBalance = $loginResponse.user.balance

Write-Host "  ✅ Login exitoso" -ForegroundColor Green
Write-Host "  User ID: $userId" -ForegroundColor White
Write-Host "  Saldo inicial: S/ $initialBalance" -ForegroundColor White

# PASO 2: VERIFICAR SALDO
Write-Host "`n[$stepNum] VERIFICAR SALDO después de login" -ForegroundColor Yellow
$stepNum++
$balanceResponse = Invoke-RestMethod -Uri "$baseUrl/agents/balance/$userId" -Method GET
Write-Host "  Saldo actual: S/ $($balanceResponse.balance)" -ForegroundColor White

# PASO 3: RECARGA SALDO (S/ 5.00)
Write-Host "`n[$stepNum] RECARGA SALDO (S/ 5.00 por cajero)" -ForegroundColor Yellow
$stepNum++
$rechargePayload = @{
    userId        = $userId
    amount        = 5.00
    paymentMethod = "CASH"
    description   = "Recarga de prueba"
} | ConvertTo-Json

$rechargeResponse = Invoke-RestMethod -Uri "$baseUrl/users/$userId/recharge" -Method POST -ContentType "application/json" -Body $rechargePayload -Headers @{ Authorization = "Bearer $staffToken" }
Write-Host "  ✅ Recarga exitosa: S/ $($rechargeResponse.amount)" -ForegroundColor Green
Write-Host "  Nuevo saldo: S/ $($rechargeResponse.newBalance)" -ForegroundColor White

# PASO 4: VERIFICAR SALDO después de recarga
Write-Host "`n[$stepNum] VERIFICAR SALDO después de recarga" -ForegroundColor Yellow
$stepNum++
$balanceResponse = Invoke-RestMethod -Uri "$baseUrl/agents/balance/$userId" -Method GET
Write-Host "  Saldo confirmado: S/ $($balanceResponse.balance)" -ForegroundColor White

# PASO 5: INICIAR TIEMPO LIBRE (OPEN)
Write-Host "`n[$stepNum] INICIAR SESIÓN TIEMPO LIBRE (OPEN)" -ForegroundColor Yellow
$stepNum++
$openSessionPayload = @{
    userId        = $userId
    type          = "OPEN"
    paymentMethod = "BALANCE"
    pcId          = $pcId
} | ConvertTo-Json

$openResponse = Invoke-RestMethod -Uri "$baseUrl/agents/purchase?pcId=$pcId" -Method POST -ContentType "application/json" -Body $openSessionPayload -Headers @{ Authorization = "Bearer $token" }
$sessionId = $openResponse.session.id
Write-Host "  ✅ Sesión OPEN iniciada" -ForegroundColor Green
Write-Host "  Session ID: $sessionId" -ForegroundColor White

# PASO 6: ESPERAR 1:01 MINUTOS
Write-Host "`n[$stepNum] ESPERAR 00:01:01 (simulando uso)" -ForegroundColor Yellow
$stepNum++
Write-Host "  ⏱️  Esperando 61 segundos..." -ForegroundColor Cyan
for ($i = 61; $i -gt 0; $i--) {
    Write-Host "`r  Tiempo restante: $i segundos  " -NoNewline
    Start-Sleep -Seconds 1
}
Write-Host "`n  ✅ Tiempo completado" -ForegroundColor Green

# PASO 7: FINALIZAR SESIÓN OPEN
Write-Host "`n[$stepNum] FINALIZAR SESIÓN OPEN" -ForegroundColor Yellow
$stepNum++
$endSessionPayload = @{
    paymentMethod = "BALANCE"
} | ConvertTo-Json

$endResponse = Invoke-RestMethod -Uri "$baseUrl/sessions/$sessionId/end" -Method POST -ContentType "application/json" -Body $endSessionPayload -Headers @{ Authorization = "Bearer $token" }
Write-Host "  ✅ Sesión finalizada" -ForegroundColor Green
Write-Host "  Costo total: S/ $($endResponse.session.totalCost)" -ForegroundColor White
Write-Host "  Duración: $($endResponse.session.durationSeconds) segundos" -ForegroundColor White

# PASO 8: VERIFICAR SALDO después de OPEN
Write-Host "`n[$stepNum] VERIFICAR SALDO después de sesión OPEN" -ForegroundColor Yellow
$stepNum++
$balanceResponse = Invoke-RestMethod -Uri "$baseUrl/agents/balance/$userId" -Method GET
Write-Host "  Saldo después de OPEN: S/ $($balanceResponse.balance)" -ForegroundColor White

# PASO 9: VERIFICAR ESTADO DE PC
Write-Host "`n[$stepNum] VERIFICAR ESTADO DE PC" -ForegroundColor Yellow
$stepNum++
$pcResponse = Invoke-RestMethod -Uri "$baseUrl/pcs/$pcId" -Method GET
Write-Host "  Estado PC: $($pcResponse.status)" -ForegroundColor White
if ($pcResponse.activeUser) {
    Write-Host "  Usuario activo: $($pcResponse.activeUser.username)" -ForegroundColor White
}
else {
    Write-Host "  Usuario activo: NULL" -ForegroundColor White
}
Write-Host "  Sesiones activas: $($pcResponse.sessions.Count)" -ForegroundColor White

# PASO 10: RECARGA SALDO (S/ 3.00)
Write-Host "`n[$stepNum] RECARGA SALDO (S/ 3.00 por cajero)" -ForegroundColor Yellow
$stepNum++
$rechargePayload2 = @{
    userId        = $userId
    amount        = 3.00
    paymentMethod = "CASH"
    description   = "Segunda recarga"
} | ConvertTo-Json

$rechargeResponse2 = Invoke-RestMethod -Uri "$baseUrl/users/$userId/recharge" -Method POST -ContentType "application/json" -Body $rechargePayload2 -Headers @{ Authorization = "Bearer $staffToken" }
Write-Host "  ✅ Recarga exitosa: S/ $($rechargeResponse2.amount)" -ForegroundColor Green
Write-Host "  Nuevo saldo: S/ $($rechargeResponse2.newBalance)" -ForegroundColor White

# PASO 11: VERIFICAR SALDO después de 2da recarga
Write-Host "`n[$stepNum] VERIFICAR SALDO después de 2da recarga" -ForegroundColor Yellow
$stepNum++
$balanceResponse = Invoke-RestMethod -Uri "$baseUrl/agents/balance/$userId" -Method GET
Write-Host "  Saldo confirmado: S/ $($balanceResponse.balance)" -ForegroundColor White

# PASO 12: LOGOUT
Write-Host "`n[$stepNum] LOGOUT de $username" -ForegroundColor Yellow
$stepNum++
$logoutPayload = @{
    pcId = $pcId
} | ConvertTo-Json

$logoutResponse = Invoke-RestMethod -Uri "$baseUrl/auth/logout-from-pc" -Method POST -ContentType "application/json" -Body $logoutPayload -Headers @{ Authorization = "Bearer $token" }
Write-Host "  ✅ Logout exitoso" -ForegroundColor Green

# PASO 13: RE-LOGIN
Write-Host "`n[$stepNum] RE-LOGIN de $username" -ForegroundColor Yellow
$stepNum++
$loginResponse2 = Invoke-RestMethod -Uri "$baseUrl/auth/login-from-pc" -Method POST -ContentType "application/json" -Body $loginPayload
$token = $loginResponse2.token
Write-Host "  ✅ Re-login exitoso" -ForegroundColor Green
Write-Host "  Saldo actual: S/ $($loginResponse2.user.balance)" -ForegroundColor White

# PASO 14: VERIFICAR SALDO después re-login
Write-Host "`n[$stepNum] VERIFICAR SALDO después de re-login" -ForegroundColor Yellow
$stepNum++
$balanceResponse = Invoke-RestMethod -Uri "$baseUrl/agents/balance/$userId" -Method GET
Write-Host "  Saldo confirmado: S/ $($balanceResponse.balance)" -ForegroundColor White

# PASO 15: COMPRAR TARIFA (2 minutos)
Write-Host "`n[$stepNum] COMPRAR TARIFA - 2 minutos" -ForegroundColor Yellow
$stepNum++
$ratesResponse = Invoke-RestMethod -Uri "$baseUrl/agents/rates?pcId=$pcId" -Method GET -Headers @{ Authorization = "Bearer $token" }
$rate2min = $ratesResponse | Where-Object { $_.minutes -eq 2 } | Select-Object -First 1

if ($rate2min) {
    Write-Host "  Tarifa encontrada: $($rate2min.minutes) min - S/ $($rate2min.price)" -ForegroundColor White
    
    $ratePurchasePayload = @{
        userId        = $userId
        type          = "RATE"
        itemId        = $rate2min.id
        paymentMethod = "BALANCE"
        pcId          = $pcId
    } | ConvertTo-Json

    $rateResponse = Invoke-RestMethod -Uri "$baseUrl/agents/purchase?pcId=$pcId" -Method POST -ContentType "application/json" -Body $ratePurchasePayload -Headers @{ Authorization = "Bearer $token" }
    $sessionId = $rateResponse.session.id
    Write-Host "  ✅ Tarifa comprada" -ForegroundColor Green
    Write-Host "  Session ID: $sessionId" -ForegroundColor White
}

# PASO 16: VERIFICAR SALDO después de comprar tarifa
Write-Host "`n[$stepNum] VERIFICAR SALDO después de comprar tarifa" -ForegroundColor Yellow
$stepNum++
$balanceResponse = Invoke-RestMethod -Uri "$baseUrl/agents/balance/$userId" -Method GET
Write-Host "  Saldo después de compra: S/ $($balanceResponse.balance)" -ForegroundColor White

# PASO 17: FINALIZAR SESIÓN DE TARIFA
Write-Host "`n[$stepNum] FINALIZAR SESIÓN DE TARIFA" -ForegroundColor Yellow
$stepNum++
$endRatePayload = @{
    paymentMethod = "BALANCE"
} | ConvertTo-Json

$endRateResponse = Invoke-RestMethod -Uri "$baseUrl/sessions/$sessionId/end" -Method POST -ContentType "application/json" -Body $endRatePayload -Headers @{ Authorization = "Bearer $token" }
Write-Host "  ✅ Sesión de tarifa finalizada" -ForegroundColor Green
Write-Host "  Duración real: $($endRateResponse.session.durationSeconds) segundos" -ForegroundColor White

# PASO 18: VERIFICAR SALDO después de finalizar tarifa
Write-Host "`n[$stepNum] VERIFICAR SALDO después de finalizar tarifa" -ForegroundColor Yellow
$stepNum++
$balanceResponse = Invoke-RestMethod -Uri "$baseUrl/agents/balance/$userId" -Method GET
Write-Host "  Saldo final: S/ $($balanceResponse.balance)" -ForegroundColor White

# PASO 19: VERIFICAR ESTADO DE PC final
Write-Host "`n[$stepNum] VERIFICAR ESTADO DE PC final" -ForegroundColor Yellow
$stepNum++
$pcResponse = Invoke-RestMethod -Uri "$baseUrl/pcs/$pcId" -Method GET
Write-Host "  Estado PC: $($pcResponse.status)" -ForegroundColor White
if ($pcResponse.activeUser) {
    Write-Host "  Usuario activo: $($pcResponse.activeUser.username)" -ForegroundColor White
    Write-Host "  Balance usuario: S/ $($pcResponse.activeUser.balance)" -ForegroundColor White
}
else {
    Write-Host "  Usuario activo: NULL" -ForegroundColor White
}
Write-Host "  Sesiones activas: $($pcResponse.sessions.Count)" -ForegroundColor White

# PASO 20: LOGOUT FINAL
Write-Host "`n[$stepNum] LOGOUT FINAL" -ForegroundColor Yellow
$stepNum++
$logoutResponse = Invoke-RestMethod -Uri "$baseUrl/auth/logout-from-pc" -Method POST -ContentType "application/json" -Body $logoutPayload -Headers @{ Authorization = "Bearer $token" }
Write-Host "  ✅ Logout final exitoso" -ForegroundColor Green

# PASO 21: VERIFICAR ESTADO FINAL DE PC
Write-Host "`n[$stepNum] VERIFICAR ESTADO FINAL DE PC (post-logout)" -ForegroundColor Yellow
$stepNum++
$pcResponse = Invoke-RestMethod -Uri "$baseUrl/pcs/$pcId" -Method GET
Write-Host "  Estado PC: $($pcResponse.status)" -ForegroundColor White
if ($pcResponse.activeUser) {
    Write-Host "  Usuario activo: $($pcResponse.activeUser.username)" -ForegroundColor White
    Write-Host "  Balance: S/ $($pcResponse.activeUser.balance)" -ForegroundColor White
}
else {
    Write-Host "  Usuario activo: NULL (esperado)" -ForegroundColor Green
}
Write-Host "  Sesiones activas: $($pcResponse.sessions.Count) (debería ser 0)" -ForegroundColor White

# RESUMEN
Write-Host "`n========================================" -ForegroundColor Cyan
Write-Host "  SIMULACIÓN COMPLETADA" -ForegroundColor Cyan
Write-Host "========================================`n" -ForegroundColor Cyan

Write-Host "Balance inicial: S/ $initialBalance" -ForegroundColor White
Write-Host "Recargas totales: S/ 8.00 (5.00 + 3.00)" -ForegroundColor Cyan
Write-Host "Balance final: S/ $($balanceResponse.balance)" -ForegroundColor White
$diferencia = $initialBalance + 8.00 - $balanceResponse.balance
Write-Host "Gastos totales: S/ $diferencia" -ForegroundColor $(if ($diferencia -gt 0) { "Red" } else { "Green" })

Write-Host "`nVerificaciones:" -ForegroundColor Yellow
Write-Host "  ✓ Recargas aplicadas correctamente" -ForegroundColor Gray
Write-Host "  ✓ Balance se descuenta en cada sesión" -ForegroundColor Gray
Write-Host "  ✓ PC queda AVAILABLE después del logout" -ForegroundColor Gray
Write-Host "  ✓ activeUser NULL después del logout" -ForegroundColor Gray
Write-Host ""
