# Test de Flujo Extendido - rojasloza (BASADO EN test-flow-fixed.ps1)
$baseUrl = "http://192.168.1.121:3001"
$pcId = "72f2b5d1-765d-4d00-ae20-f833b22471be"
$lanId = "724f11c3-b44c-46a1-80fb-8ba0ce6ceeec"
$apiKey = "8fc837e8-77a4-49e7-8274-f10bdfa0f78b"

Write-Host "`n=== SIMULACION DE FLUJO EXTENDIDO ===" -ForegroundColor Cyan
Write-Host "Servidor: $baseUrl`n" -ForegroundColor Cyan

# PASO 0: Login cajero (Necesario para recargas)
Write-Host "[0] LOGIN CAJERO" -ForegroundColor Yellow
$body0 = @{ identifier = "test@test.com"; password = "123456" } | ConvertTo-Json
$staffResp = Invoke-RestMethod -Uri "$baseUrl/auth/login" -Method POST -ContentType "application/json" -Body $body0
$staffToken = $staffResp.access_token
Write-Host "OK Cajero autenticado`n" -ForegroundColor Green

# 1. usuario -> login
Write-Host "[1] LOGIN rojasloza" -ForegroundColor Yellow
$body1 = @{ identifier = "rojasloza"; password = "123456"; pcId = $pcId } | ConvertTo-Json
$loginResp = Invoke-RestMethod -Uri "$baseUrl/auth/login" -Method POST -ContentType "application/json" -Body $body1
$token = $loginResp.access_token
$userId = $loginResp.user.id
$initialBalance = $loginResp.user.balance
Write-Host "OK User: $userId, Saldo inicial: S/ $initialBalance`n" -ForegroundColor Green

# 2. Verifica Saldo
Write-Host "[2] VERIFICA SALDO" -ForegroundColor Yellow
$user = Invoke-RestMethod -Uri "$baseUrl/users/$userId" -Headers @{Authorization = "Bearer $token" }
Write-Host "Saldo: S/ $($user.balance)`n" -ForegroundColor White

# 3. Recarga saldo (Agregamos S/ 5.00)
Write-Host "[3] RECARGA SALDO (S/ 5.00)" -ForegroundColor Yellow
$body3 = @{ amount = 5; lanId = $lanId; paymentMethod = "CASH" } | ConvertTo-Json
$recharge1 = Invoke-RestMethod -Uri "$baseUrl/users/$userId/recharge" -Method POST -ContentType "application/json" -Headers @{Authorization = "Bearer $staffToken" } -Body $body3
Write-Host "OK Nuevo saldo: S/ $($recharge1.newBalance)`n" -ForegroundColor Green

# 4. Verifica saldo
Write-Host "[4] VERIFICA SALDO" -ForegroundColor Yellow
$user = Invoke-RestMethod -Uri "$baseUrl/users/$userId" -Headers @{Authorization = "Bearer $token" }
Write-Host "Saldo: S/ $($user.balance)`n" -ForegroundColor White

# 5. Inicia tiempo libre "OPEN"
Write-Host "[5] INICIA TIEMPO LIBRE 'OPEN'" -ForegroundColor Yellow
$body5 = @{ userId = $userId; type = "OPEN"; paymentMethod = "BALANCE"; pcId = $pcId } | ConvertTo-Json
$open = Invoke-RestMethod -Uri "$baseUrl/agents/purchase?pcId=$pcId" -Method POST -ContentType "application/json" -Headers @{Authorization = "Bearer $token"; "x-api-key" = $apiKey } -Body $body5
$sessionId = $open.session.id
Write-Host "OK Session: $sessionId`n" -ForegroundColor Green

# 6. transcurre al menos 00:01:01 min
Write-Host "[6] ESPERAR 61 segundos (00:01:01)" -ForegroundColor Yellow
for ($i = 61; $i -gt 0; $i--) {
    Write-Host "`r  Tiempo: $i seg  " -NoNewline
    Start-Sleep -Seconds 1
}
Write-Host "`nOK Tiempo transcurrido`n" -ForegroundColor Green

# 7. Finaliza sesion
Write-Host "[7] FINALIZA SESION" -ForegroundColor Yellow
$body7 = @{ paymentMethod = "BALANCE" } | ConvertTo-Json
$end = Invoke-RestMethod -Uri "$baseUrl/sessions/$sessionId/end" -Method POST -ContentType "application/json" -Headers @{Authorization = "Bearer $token" } -Body $body7
Write-Host "OK Costo: S/ $($end.session.totalCost), Duracion: $($end.session.durationSeconds) seg`n" -ForegroundColor Green

# 8. Verifica saldo
Write-Host "[8] VERIFICA SALDO" -ForegroundColor Yellow
$user = Invoke-RestMethod -Uri "$baseUrl/users/$userId" -Headers @{Authorization = "Bearer $token" }
Write-Host "Saldo: S/ $($user.balance)`n" -ForegroundColor White

# 9. Verifica estado de la pc
Write-Host "[9] VERIFICA ESTADO DE LA PC" -ForegroundColor Yellow
$pc = Invoke-RestMethod -Uri "$baseUrl/pcs/$pcId" -Headers @{Authorization = "Bearer $token" }
Write-Host "PC: $($pc.name), Estado: $($pc.status), Usuario: $($pc.activeUser.username)`n" -ForegroundColor White

# 10. Recarga saldo (Agregamos S/ 3.00)
Write-Host "[10] RECARGA SALDO (S/ 3.00)" -ForegroundColor Yellow
$body10 = @{ amount = 3; lanId = $lanId; paymentMethod = "CASH" } | ConvertTo-Json
$recharge2 = Invoke-RestMethod -Uri "$baseUrl/users/$userId/recharge" -Method POST -ContentType "application/json" -Headers @{Authorization = "Bearer $staffToken" } -Body $body10
Write-Host "OK Nuevo saldo: S/ $($recharge2.newBalance)`n" -ForegroundColor Green

# 11. Verifica saldo
Write-Host "[11] VERIFICA SALDO" -ForegroundColor Yellow
$user = Invoke-RestMethod -Uri "$baseUrl/users/$userId" -Headers @{Authorization = "Bearer $token" }
Write-Host "Saldo: S/ $($user.balance)`n" -ForegroundColor White

# 12. logout
Write-Host "[12] LOGOUT" -ForegroundColor Yellow
Invoke-RestMethod -Uri "$baseUrl/auth/logout" -Method POST -ContentType "application/json" -Headers @{Authorization = "Bearer $token" } | Out-Null
Write-Host "OK Logout exitoso`n" -ForegroundColor Green

# 13. login
Write-Host "[13] LOGIN" -ForegroundColor Yellow
$body13 = @{ identifier = "rojasloza"; password = "123456"; pcId = $pcId } | ConvertTo-Json
$login2 = Invoke-RestMethod -Uri "$baseUrl/auth/login" -Method POST -ContentType "application/json" -Body $body13
$token = $login2.access_token
Write-Host "OK Login exitoso`n" -ForegroundColor Green

# 14. verifica saldo
Write-Host "[14] VERIFICA SALDO" -ForegroundColor Yellow
$user = Invoke-RestMethod -Uri "$baseUrl/users/$userId" -Headers @{Authorization = "Bearer $token" }
Write-Host "Saldo: S/ $($user.balance)`n" -ForegroundColor White

# 15. Compra tarifa (2 min)
Write-Host "[15] COMPRA TARIFA (2 min)" -ForegroundColor Yellow
$rates = Invoke-RestMethod -Uri "$baseUrl/agents/rates?pcId=$pcId" -Headers @{Authorization = "Bearer $token"; "x-api-key" = $apiKey }
$rate = $rates | Where-Object { $_.minutes -eq 2 } | Select-Object -First 1
if ($rate) {
    $body15 = @{ userId = $userId; type = "RATE"; itemId = $rate.id; paymentMethod = "BALANCE"; pcId = $pcId } | ConvertTo-Json
    $ratePurch = Invoke-RestMethod -Uri "$baseUrl/agents/purchase?pcId=$pcId" -Method POST -ContentType "application/json" -Headers @{Authorization = "Bearer $token"; "x-api-key" = $apiKey } -Body $body15
    $sessionId = $ratePurch.session.id
    Write-Host "OK Tarifa comprada, Session: $sessionId`n" -ForegroundColor Green
}

# 16. Verifica saldo
Write-Host "[16] VERIFICA SALDO" -ForegroundColor Yellow
$user = Invoke-RestMethod -Uri "$baseUrl/users/$userId" -Headers @{Authorization = "Bearer $token" }
Write-Host "Saldo: S/ $($user.balance)`n" -ForegroundColor White

# 17. finaliza sesion de tarifa
Write-Host "[17] FINALIZA SESION DE TARIFA" -ForegroundColor Yellow
$body17 = @{ paymentMethod = "BALANCE" } | ConvertTo-Json
$endRate = Invoke-RestMethod -Uri "$baseUrl/sessions/$sessionId/end" -Method POST -ContentType "application/json" -Headers @{Authorization = "Bearer $token" } -Body $body17
Write-Host "OK Tarifa finalizada`n" -ForegroundColor Green

# 18. verifica saldo
Write-Host "[18] VERIFICA SALDO" -ForegroundColor Yellow
$user = Invoke-RestMethod -Uri "$baseUrl/users/$userId" -Headers @{Authorization = "Bearer $token" }
Write-Host "Saldo final: S/ $($user.balance)`n" -ForegroundColor White

# 19. verifica estado de pc
Write-Host "[19] VERIFICA ESTADO DE PC" -ForegroundColor Yellow
$pc = Invoke-RestMethod -Uri "$baseUrl/pcs/$pcId" -Headers @{Authorization = "Bearer $token" }
Write-Host "PC Status: $($pc.status), User: $($pc.activeUser.username)`n" -ForegroundColor White

# 20. logout
Write-Host "[20] LOGOUT" -ForegroundColor Yellow
Invoke-RestMethod -Uri "$baseUrl/auth/logout" -Method POST -ContentType "application/json" -Headers @{Authorization = "Bearer $token" } | Out-Null
Write-Host "OK Logout exitoso`n" -ForegroundColor Green

# 21. verifica estado de pc (post-logout)
Write-Host "[21] VERIFICA ESTADO DE PC (POST-LOGOUT)" -ForegroundColor Yellow
$pc = Invoke-RestMethod -Uri "$baseUrl/pcs/$pcId" -Headers @{Authorization = "Bearer $staffToken" }
Write-Host "PC Status: $($pc.status)" -ForegroundColor White
if ($pc.activeUser) { Write-Host "OJO: Usuario activo detectado: $($pc.activeUser.username)" -ForegroundColor Red }
else { Write-Host "OK: PC liberada (NULL user)" -ForegroundColor Green }
Write-Host ""

# 22. login
Write-Host "[22] LOGIN" -ForegroundColor Yellow
$body22 = @{ identifier = "rojasloza"; password = "123456"; pcId = $pcId } | ConvertTo-Json
$login3 = Invoke-RestMethod -Uri "$baseUrl/auth/login" -Method POST -ContentType "application/json" -Body $body22
$token = $login3.access_token
Write-Host "OK Login exitoso`n" -ForegroundColor Green

# 23. verifica estado de pc
Write-Host "[23] VERIFICA ESTADO DE PC" -ForegroundColor Yellow
$pc = Invoke-RestMethod -Uri "$baseUrl/pcs/$pcId" -Headers @{Authorization = "Bearer $token" }
Write-Host "PC Status: $($pc.status), User: $($pc.activeUser.username)`n" -ForegroundColor White

# 24. logout
Write-Host "[24] LOGOUT" -ForegroundColor Yellow
Invoke-RestMethod -Uri "$baseUrl/auth/logout" -Method POST -ContentType "application/json" -Headers @{Authorization = "Bearer $token" } | Out-Null
Write-Host "OK Logout exitoso`n" -ForegroundColor Green

# 25. verifica estado de pc (final)
Write-Host "[25] VERIFICA ESTADO DE PC (FINAL)" -ForegroundColor Yellow
$pc = Invoke-RestMethod -Uri "$baseUrl/pcs/$pcId" -Headers @{Authorization = "Bearer $staffToken" }
Write-Host "PC Status: $($pc.status)" -ForegroundColor White
if ($pc.activeUser) { Write-Host "ERROR: PC no quedó liberada" -ForegroundColor Red }
else { Write-Host "OK: PC libre para siguiente cliente" -ForegroundColor Green }
Write-Host ""

Write-Host "=== FIN DE SIMULACION EXTENDIDA ===" -ForegroundColor Cyan
