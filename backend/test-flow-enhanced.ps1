# Test de Flujo Completo - rojasloza (Version Mejorada con Error Handling)
# Fecha: 2026-01-10
# Configuración de producción

$baseUrl = "http://192.168.1.121:3001"
$pcId = "72f2b5d1-765d-4d00-ae20-f833b22471be"
$lanId = "724f11c3-b44c-46a1-80fb-8ba0ce6ceeec"
$apiKey = "8fc837e8-77a4-49e7-8274-f10bdfa0f78b"

$ErrorActionPreference = "Stop"
$stepsFailed = 0
$stepsSucceeded = 0

function Write-Step {
    param($num, $desc)
    Write-Host "`n[$num] $desc" -ForegroundColor Yellow
    Write-Host "-----------------------------------" -ForegroundColor Gray
}

function Write-Success {
    param($msg)
    Write-Host "  ✅ $msg" -ForegroundColor Green
    $script:stepsSucceeded++
}

function Write-Fail {
    param($msg)
    Write-Host "  ❌ $msg" -ForegroundColor Red
    $script:stepsFailed++
}

function Write-Info {
    param($label, $value)
    Write-Host "  $label`: $value" -ForegroundColor White
}

function Write-Debug {
    param($msg)
    Write-Host "  [DEBUG] $msg" -ForegroundColor DarkGray
}

function Invoke-SafeRequest {
    param(
        [string]$Uri,
        [string]$Method = "GET",
        [hashtable]$Headers = @{},
        [string]$Body = $null,
        [string]$Description = ""
    )
    
    try {
        $params = @{
            Uri         = $Uri
            Method      = $Method
            ContentType = "application/json"
            Headers     = $Headers
        }
        
        if ($Body) {
            $params.Body = $Body
        }
        
        Write-Debug "$Method $Uri"
        $response = Invoke-RestMethod @params
        return @{ Success = $true; Data = $response }
    }
    catch {
        $errorMsg = $_.Exception.Message
        Write-Debug "Error: $errorMsg"
        return @{ Success = $false; Error = $errorMsg; StatusCode = $_.Exception.Response.StatusCode.value__ }
    }
}

Write-Host "`n========================================" -ForegroundColor Cyan
Write-Host "  TEST DE FLUJO COMPLETO - MEJORADO" -ForegroundColor Cyan
Write-Host "  Servidor: $baseUrl" -ForegroundColor Cyan
Write-Host "========================================`n" -ForegroundColor Cyan

# PASO 0: Login cajero
Write-Step 0 "LOGIN CAJERO"
$result = Invoke-SafeRequest -Uri "$baseUrl/auth/login" -Method POST -Body '{"identifier":"test@test.com","password":"123456"}'
if ($result.Success) {
    $staffToken = $result.Data.token
    Write-Success "Cajero autenticado"
    Write-Debug "Token: $($staffToken.Substring(0,20))..."
}
else {
    Write-Fail "Login cajero falló: $($result.Error)"
    exit 1
}

# PASO 1: LOGIN rojasloza
Write-Step 1 "LOGIN USUARIO rojasloza"
$result = Invoke-SafeRequest -Uri "$baseUrl/auth/login-from-pc" -Method POST -Body "{`"identifier`":`"rojasloza`",`"password`":`"123456`",`"pcId`":`"$pcId`"}"
if ($result.Success) {
    $token = $result.Data.token
    $userId = $result.Data.user.id
    $initialBalance = $result.Data.user.balance
    Write-Success "Login exitoso"
    Write-Info "User ID" $userId
    Write-Info "Saldo inicial" "S/ $initialBalance"
    Write-Debug "Token: $($token.Substring(0,20))..."
}
else {
    Write-Fail "Login usuario falló: $($result.Error)"
    exit 1
}

# PASO 2: Verificar saldo
Write-Step 2 "VERIFICAR SALDO inicial"
$result = Invoke-SafeRequest -Uri "$baseUrl/agents/balance/$userId"
if ($result.Success) {
    Write-Info "Balance" "S/ $($result.Data.balance)"
    Write-Success "Saldo verificado"
}
else {
    Write-Fail "Error verificando saldo: $($result.Error)"
}

# PASO 3: Recarga S/ 5
Write-Step 3 "RECARGA S/ 5.00"
$result = Invoke-SafeRequest -Uri "$baseUrl/users/$userId/recharge" -Method POST `
    -Headers @{Authorization = "Bearer $staffToken" } `
    -Body "{`"amount`":5,`"lanId`":`"$lanId`",`"paymentMethod`":`"CASH`"}"
if ($result.Success) {
    Write-Success "Recarga exitosa"
    Write-Info "Nuevo saldo" "S/ $($result.Data.newBalance)"
}
else {
    Write-Fail "Error en recarga: $($result.Error)"
}

# PASO 4: Verificar saldo post-recarga
Write-Step 4 "VERIFICAR SALDO después de recarga"
$result = Invoke-SafeRequest -Uri "$baseUrl/agents/balance/$userId"
if ($result.Success) {
    Write-Info "Balance" "S/ $($result.Data.balance)"
    Write-Success "Saldo verificado"
}
else {
    Write-Fail "Error: $($result.Error)"
}

# PASO 5: Iniciar OPEN
Write-Step 5 "INICIAR SESION TIEMPO LIBRE (OPEN)"
$result = Invoke-SafeRequest -Uri "$baseUrl/agents/purchase?pcId=$pcId" -Method POST `
    -Headers @{Authorization = "Bearer $token" } `
    -Body "{`"userId`":`"$userId`",`"type`":`"OPEN`",`"paymentMethod`":`"BALANCE`",`"pcId`":`"$pcId`"}"
if ($result.Success) {
    $sessionId = $result.Data.session.id
    Write-Success "Sesión OPEN iniciada"
    Write-Info "Session ID" $sessionId
    Write-Debug "Session guardada en variable sessionId"
}
else {
    Write-Fail "Error iniciando OPEN: $($result.Error)"
}

# PASO 6: Esperar 61 seg
Write-Step 6 "ESPERAR 61 segundos (simulando uso)"
Write-Host "  ⏱️  Esperando..." -ForegroundColor Cyan
for ($i = 61; $i -gt 0; $i--) {
    Write-Host "`r  Tiempo restante: $i seg  " -NoNewline
    Start-Sleep -Seconds 1
}
Write-Host ""
Write-Success "Espera completada"

# PASO 7: Finalizar OPEN
Write-Step 7 "FINALIZAR SESION OPEN"
Write-Debug "Finalizando sesión ID: $sessionId"
$result = Invoke-SafeRequest -Uri "$baseUrl/sessions/$sessionId/end" -Method POST `
    -Headers @{Authorization = "Bearer $token" } `
    -Body '{"paymentMethod":"BALANCE"}'
if ($result.Success) {
    Write-Success "Sesión finalizada"
    Write-Info "Costo" "S/ $($result.Data.session.totalCost)"
    Write-Info "Duración" "$($result.Data.session.durationSeconds) seg"
}
else {
    Write-Fail "Error finalizando OPEN: $($result.Error) (StatusCode: $($result.StatusCode))"
}

# PASO 8: Verificar saldo post-OPEN
Write-Step 8 "VERIFICAR SALDO después de OPEN"
Write-Debug "Consultando balance para userId: $userId"
$result = Invoke-SafeRequest -Uri "$baseUrl/agents/balance/$userId"
if ($result.Success) {
    Write-Info "Balance" "S/ $($result.Data.balance)"
    Write-Success "Saldo verificado"
}
else {
    Write-Fail "Error: $($result.Error)"
}

# PASO 9: Verificar PC
Write-Step 9 "VERIFICAR ESTADO DE PC"
$result = Invoke-SafeRequest -Uri "$baseUrl/pcs/$pcId"
if ($result.Success) {
    Write-Info "Estado PC" $result.Data.status
    $activeUserName = if ($result.Data.activeUser) { $result.Data.activeUser.username } else { "NULL" }
    Write-Info "Usuario activo" $activeUserName
    Write-Info "Sesiones activas" $result.Data.sessions.Count
    Write-Success "PC verificado"
}
else {
    Write-Fail "Error: $($result.Error)"
}

# PASO 10: Recarga S/ 3
Write-Step 10 "RECARGA S/ 3.00"
$result = Invoke-SafeRequest -Uri "$baseUrl/users/$userId/recharge" -Method POST `
    -Headers @{Authorization = "Bearer $staffToken" } `
    -Body "{`"amount`":3,`"lanId`":`"$lanId`",`"paymentMethod`":`"CASH`"}"
if ($result.Success) {
    Write-Success "Recarga exitosa"
    Write-Info "Nuevo saldo" "S/ $($result.Data.newBalance)"
}
else {
    Write-Fail "Error: $($result.Error)"
}

# PASO 11: Verificar saldo
Write-Step 11 "VERIFICAR SALDO después de 2da recarga"
$result = Invoke-SafeRequest -Uri "$baseUrl/agents/balance/$userId"
if ($result.Success) {
    Write-Info "Balance" "S/ $($result.Data.balance)"
    Write-Success "Saldo verificado"
}
else {
    Write-Fail "Error: $($result.Error)"
}

# PASO 12: Logout
Write-Step 12 "LOGOUT"
$result = Invoke-SafeRequest -Uri "$baseUrl/auth/logout-from-pc" -Method POST `
    -Headers @{Authorization = "Bearer $token" } `
    -Body "{`"pcId`":`"$pcId`"}"
if ($result.Success) {
    Write-Success "Logout exitoso"
}
else {
    Write-Fail "Error: $($result.Error)"
}

# PASO 13: Re-login
Write-Step 13 "RE-LOGIN"
$result = Invoke-SafeRequest -Uri "$baseUrl/auth/login-from-pc" -Method POST `
    -Body "{`"identifier`":`"rojasloza`",`"password`":`"123456`",`"pcId`":`"$pcId`"}"
if ($result.Success) {
    $token = $result.Data.token
    Write-Success "Re-login exitoso"
    Write-Info "Saldo actual" "S/ $($result.Data.user.balance)"
    Write-Debug "Nuevo token obtenido: $($token.Substring(0,20))..."
    Write-Debug "userId mantenido: $userId"
}
else {
    Write-Fail "Error: $($result.Error)"
}

# PASO 14: Verificar saldo
Write-Step 14 "VERIFICAR SALDO después de re-login"
$result = Invoke-SafeRequest -Uri "$baseUrl/agents/balance/$userId"
if ($result.Success) {
    Write-Info "Balance" "S/ $($result.Data.balance)"
    Write-Success "Saldo verificado"
}
else {
    Write-Fail "Error: $($result.Error)"
}

# PASO 15: Comprar tarifa
Write-Step 15 "COMPRAR TARIFA 2 minutos"
$result = Invoke-SafeRequest -Uri "$baseUrl/agents/rates?pcId=$pcId" `
    -Headers @{Authorization = "Bearer $token" }
if ($result.Success) {
    $rate = $result.Data | Where-Object { $_.minutes -eq 2 } | Select-Object -First 1
    if ($rate) {
        Write-Info "Tarifa encontrada" "$($rate.minutes) min - S/ $($rate.price)"
        
        $purchaseResult = Invoke-SafeRequest -Uri "$baseUrl/agents/purchase?pcId=$pcId" -Method POST `
            -Headers @{Authorization = "Bearer $token" } `
            -Body "{`"userId`":`"$userId`",`"type`":`"RATE`",`"itemId`":`"$($rate.id)`",`"paymentMethod`":`"BALANCE`",`"pcId`":`"$pcId`"}"
        
        if ($purchaseResult.Success) {
            $sessionId = $purchaseResult.Data.session.id
            Write-Success "Tarifa comprada"
            Write-Info "Session ID" $sessionId
            Write-Debug "Nueva sesión guardada en sessionId"
        }
        else {
            Write-Fail "Error comprando tarifa: $($purchaseResult.Error)"
        }
    }
    else {
        Write-Fail "No se encontró tarifa de 2 minutos"
    }
}
else {
    Write-Fail "Error obteniendo tarifas: $($result.Error)"
}

# PASO 16: Verificar saldo
Write-Step 16 "VERIFICAR SALDO después de compra"
$result = Invoke-SafeRequest -Uri "$baseUrl/agents/balance/$userId"
if ($result.Success) {
    Write-Info "Balance" "S/ $($result.Data.balance)"
    Write-Success "Saldo verificado"
}
else {
    Write-Fail "Error: $($result.Error)"
}

# PASO 17: Finalizar tarifa
Write-Step 17 "FINALIZAR SESION DE TARIFA"
Write-Debug "Finalizando sesión ID: $sessionId con token: $($token.Substring(0,20))..."
$result = Invoke-SafeRequest -Uri "$baseUrl/sessions/$sessionId/end" -Method POST `
    -Headers @{Authorization = "Bearer $token" } `
    -Body '{"paymentMethod":"BALANCE"}'
if ($result.Success) {
    Write-Success "Sesión de tarifa finalizada"
    Write-Info "Duración" "$($result.Data.session.durationSeconds) seg"
}
else {
    Write-Fail "Error finalizando tarifa: $($result.Error) (StatusCode: $($result.StatusCode))"
}

# PASO 18: Verificar saldo final
Write-Step 18 "VERIFICAR SALDO FINAL"
Write-Debug "Consultando balance para userId: $userId"
$result = Invoke-SafeRequest -Uri "$baseUrl/agents/balance/$userId"
if ($result.Success) {
    $finalBalance = $result.Data.balance
    Write-Info "Balance final" "S/ $finalBalance"
    Write-Success "Saldo verificado"
}
else {
    Write-Fail "Error: $($result.Error)"
    $finalBalance = 0
}

# PASO 19: Verificar PC
Write-Step 19 "VERIFICAR ESTADO PC (pre-logout)"
$result = Invoke-SafeRequest -Uri "$baseUrl/pcs/$pcId"
if ($result.Success) {
    Write-Info "Estado PC" $result.Data.status
    $activeUserName = if ($result.Data.activeUser) { $result.Data.activeUser.username } else { "NULL" }
    Write-Info "Usuario activo" $activeUserName
    Write-Info "Balance usuario" "S/ $($result.Data.activeUser.balance)"
    Write-Info "Sesiones activas" $result.Data.sessions.Count
    Write-Success "PC verificado"
}
else {
    Write-Fail "Error: $($result.Error) (StatusCode: $($result.StatusCode))"
}

# PASO 20: Logout final
Write-Step 20 "LOGOUT FINAL"
$result = Invoke-SafeRequest -Uri "$baseUrl/auth/logout-from-pc" -Method POST `
    -Headers @{Authorization = "Bearer $token" } `
    -Body "{`"pcId`":`"$pcId`"}"
if ($result.Success) {
    Write-Success "Logout final exitoso"
}
else {
    Write-Fail "Error: $($result.Error)"
}

# PASO 21: Verificar PC post-logout
Write-Step 21 "VERIFICAR PC POST-LOGOUT"
$result = Invoke-SafeRequest -Uri "$baseUrl/pcs/$pcId"
if ($result.Success) {
    Write-Info "Estado PC" $result.Data.status
    if ($result.Data.activeUser) {
        Write-Info "Usuario activo" "$($result.Data.activeUser.username) [ERROR]"
        Write-Fail "PC deberia estar sin usuario activo"
    }
    else {
        Write-Info "Usuario activo" "NULL [OK]"
        Write-Success "PC limpio correctamente"
    }
    Write-Info "Sesiones activas" "$($result.Data.sessions.Count) (esperado: 0)"
}
else {
    Write-Fail "Error: $($result.Error)"
}

# RESUMEN FINAL
Write-Host "`n========================================" -ForegroundColor Cyan
Write-Host "  RESUMEN DEL TEST" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "Balance inicial:    S/ $initialBalance" -ForegroundColor White
Write-Host "Recargas totales:   S/ 8.00 (5 + 3)" -ForegroundColor Cyan
Write-Host "Balance final:      S/ $finalBalance" -ForegroundColor White
$gastado = $initialBalance + 8 - $finalBalance
Write-Host "Gastado en total:   S/ $gastado" -ForegroundColor $(if ($gastado -gt 0) { "Red" } else { "Green" })
Write-Host ""
Write-Host "Pasos exitosos:     $stepsSucceeded" -ForegroundColor Green
Write-Host "Pasos fallidos:     $stepsFailed" -ForegroundColor $(if ($stepsFailed -gt 0) { "Red" } else { "Green" })
Write-Host ""

if ($stepsFailed -eq 0) {
    Write-Host "TEST COMPLETADO EXITOSAMENTE" -ForegroundColor Green
}
else {
    Write-Host "TEST COMPLETADO CON $stepsFailed ERRORES" -ForegroundColor Yellow
}
Write-Host ""
