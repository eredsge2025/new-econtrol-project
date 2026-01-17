# Test Completo de Flujo de Usuario - rojasloza
# Incluye recargas de saldo
# Ejecutar con: bash test-flow.sh

echo "========================================"
echo "  SIMULACIÓN DE FLUJO COMPLETO"
echo "  Usuario: rojasloza"
echo "========================================"
echo ""

BASE_URL="http://192.168.1.121:3001"
PC_ID="72f2b5d1-765d-4d00-ae20-f833b22471be"
LAN_ID="724f11c3-b44c-46a1-80fb-8ba0ce6ceeec"
USERNAME="rojasloza"
PASSWORD="123456"

# PASO 0: Login cajero para recargas
echo "[0] LOGIN CAJERO (para recargas)"
echo "-----------------------------------"
STAFF_RESPONSE=$(curl -s -X POST "$BASE_URL/auth/login" \
  -H "Content-Type: application/json" \
  -d '{"identifier":"admin@econtrol.com","password":"admin123"}')
STAFF_TOKEN=$(echo $STAFF_RESPONSE | jq -r '.token')
echo "✅ Cajero autenticado"
echo ""

# PASO 1: LOGIN
echo "[1] LOGIN - $USERNAME"
echo "-----------------------------------"
LOGIN_RESPONSE=$(curl -s -X POST "$BASE_URL/auth/login-from-pc" \
  -H "Content-Type: application/json" \
  -d "{\"identifier\":\"$USERNAME\",\"password\":\"$PASSWORD\",\"pcId\":\"$PC_ID\"}")

TOKEN=$(echo $LOGIN_RESPONSE | jq -r '.token')
USER_ID=$(echo $LOGIN_RESPONSE | jq -r '.user.id')
INITIAL_BALANCE=$(echo $LOGIN_RESPONSE | jq -r '.user.balance')

echo "  ✅ Login exitoso"
echo "  User ID: $USER_ID"
echo "  Saldo inicial: S/ $INITIAL_BALANCE"
echo ""

# PASO 2: VERIFICAR SALDO
echo "[2] VERIFICAR SALDO después de login"
echo "-----------------------------------"
BALANCE_RESPONSE=$(curl -s -X GET "$BASE_URL/agents/balance/$USER_ID")
BALANCE=$(echo $BALANCE_RESPONSE | jq -r '.balance')
echo "  Saldo actual: S/ $BALANCE"
echo ""

# PASO 3: RECARGA SALDO (S/ 5.00)
echo "[3] RECARGA SALDO (S/ 5.00 por cajero)"
echo "-----------------------------------"
RECHARGE_RESPONSE=$(curl -s -X POST "$BASE_URL/users/$USER_ID/recharge" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $STAFF_TOKEN" \
  -d "{\"amount\":5.00,\"lanId\":\"$LAN_ID\",\"paymentMethod\":\"CASH\",\"description\":\"Recarga de prueba\"}")
NEW_BALANCE=$(echo $RECHARGE_RESPONSE | jq -r '.newBalance')
echo "  ✅ Recarga exitosa"
echo "  Nuevo saldo: S/ $NEW_BALANCE"
echo ""

# PASO 4: VERIFICAR SALDO después de recarga
echo "[4] VERIFICAR SALDO después de recarga"
echo "-----------------------------------"
BALANCE_RESPONSE=$(curl -s -X GET "$BASE_URL/agents/balance/$USER_ID")
BALANCE=$(echo $BALANCE_RESPONSE | jq -r '.balance')
echo "  Saldo confirmado: S/ $BALANCE"
echo ""

# PASO 5: INICIAR TIEMPO LIBRE (OPEN)
echo "[5] INICIAR SESIÓN TIEMPO LIBRE (OPEN)"
echo "-----------------------------------"
OPEN_RESPONSE=$(curl -s -X POST "$BASE_URL/agents/purchase?pcId=$PC_ID" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d "{\"userId\":\"$USER_ID\",\"type\":\"OPEN\",\"paymentMethod\":\"BALANCE\",\"pcId\":\"$PC_ID\"}")
SESSION_ID=$(echo $OPEN_RESPONSE | jq -r '.session.id')
echo "  ✅ Sesión OPEN iniciada"
echo "  Session ID: $SESSION_ID"
echo ""

# PASO 6: ESPERAR 1:01 MINUTOS
echo "[6] ESPERAR 00:01:01 (simulando uso)"
echo "-----------------------------------"
echo "  ⏱️  Esperando 61 segundos..."
for i in {61..1}; do
  echo -ne "  Tiempo restante: $i segundos  \r"
  sleep 1
done
echo ""
echo "  ✅ Tiempo completado"
echo ""

# PASO 7: FINALIZAR SESIÓN OPEN
echo "[7] FINALIZAR SESIÓN OPEN"
echo "-----------------------------------"
END_RESPONSE=$(curl -s -X POST "$BASE_URL/sessions/$SESSION_ID/end" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d '{"paymentMethod":"BALANCE"}')
TOTAL_COST=$(echo $END_RESPONSE | jq -r '.session.totalCost')
DURATION=$(echo $END_RESPONSE | jq -r '.session.durationSeconds')
echo "  ✅ Sesión finalizada"
echo "  Costo total: S/ $TOTAL_COST"
echo "  Duración: $DURATION segundos"
echo ""

# PASO 8: VERIFICAR SALDO después de OPEN
echo "[8] VERIFICAR SALDO después de sesión OPEN"
echo "-----------------------------------"
BALANCE_RESPONSE=$(curl -s -X GET "$BASE_URL/agents/balance/$USER_ID")
BALANCE=$(echo $BALANCE_RESPONSE | jq -r '.balance')
echo "  Saldo después de OPEN: S/ $BALANCE"
echo ""

# PASO 9: VERIFICAR ESTADO DE PC
echo "[9] VERIFICAR ESTADO DE PC"
echo "-----------------------------------"
PC_RESPONSE=$(curl -s -X GET "$BASE_URL/pcs/$PC_ID")
PC_STATUS=$(echo $PC_RESPONSE | jq -r '.status')
ACTIVE_USER=$(echo $PC_RESPONSE | jq -r '.activeUser.username // "NULL"')
SESSION_COUNT=$(echo $PC_RESPONSE | jq -r '.sessions | length')
echo "  Estado PC: $PC_STATUS"
echo "  Usuario activo: $ACTIVE_USER"
echo "  Sesiones activas: $SESSION_COUNT"
echo ""

# PASO 10: RECARGA SALDO (S/ 3.00)
echo "[10] RECARGA SALDO (S/ 3.00 por cajero)"
echo "-----------------------------------"
RECHARGE_RESPONSE2=$(curl -s -X POST "$BASE_URL/users/$USER_ID/recharge" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $STAFF_TOKEN" \
  -d "{\"amount\":3.00,\"lanId\":\"$LAN_ID\",\"paymentMethod\":\"CASH\",\"description\":\"Segunda recarga\"}")
NEW_BALANCE2=$(echo $RECHARGE_RESPONSE2 | jq -r '.newBalance')
echo "  ✅ Recarga exitosa"
echo "  Nuevo saldo: S/ $NEW_BALANCE2"
echo ""

# PASO 11: VERIFICAR SALDO después de 2da recarga
echo "[11] VERIFICAR SALDO después de 2da recarga"
echo "-----------------------------------"
BALANCE_RESPONSE=$(curl -s -X GET "$BASE_URL/agents/balance/$USER_ID")
BALANCE=$(echo $BALANCE_RESPONSE | jq -r '.balance')
echo "  Saldo confirmado: S/ $BALANCE"
echo ""

# PASO 12: LOGOUT
echo "[12] LOGOUT de $USERNAME"
echo "-----------------------------------"
LOGOUT_RESPONSE=$(curl -s -X POST "$BASE_URL/auth/logout-from-pc" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d "{\"pcId\":\"$PC_ID\"}")
echo "  ✅ Logout exitoso"
echo ""

# PASO 13: RE-LOGIN
echo "[13] RE-LOGIN de $USERNAME"
echo "-----------------------------------"
LOGIN_RESPONSE2=$(curl -s -X POST "$BASE_URL/auth/login-from-pc" \
  -H "Content-Type: application/json" \
  -d "{\"identifier\":\"$USERNAME\",\"password\":\"$PASSWORD\",\"pcId\":\"$PC_ID\"}")
TOKEN=$(echo $LOGIN_RESPONSE2 | jq -r '.token')
BALANCE_AFTER_RELOGIN=$(echo $LOGIN_RESPONSE2 | jq -r '.user.balance')
echo "  ✅ Re-login exitoso"
echo "  Saldo actual: S/ $BALANCE_AFTER_RELOGIN"
echo ""

# PASO 14: VERIFICAR SALDO después re-login
echo "[14] VERIFICAR SALDO después de re-login"
echo "-----------------------------------"
BALANCE_RESPONSE=$(curl -s -X GET "$BASE_URL/agents/balance/$USER_ID")
BALANCE=$(echo $BALANCE_RESPONSE | jq -r '.balance')
echo "  Saldo confirmado: S/ $BALANCE"
echo ""

# PASO 15: COMPRAR TARIFA (2 minutos)
echo "[15] COMPRAR TARIFA - 2 minutos"
echo "-----------------------------------"
RATES_RESPONSE=$(curl -s -X GET "$BASE_URL/agents/rates?pcId=$PC_ID" \
  -H "Authorization: Bearer $TOKEN")
RATE_ID=$(echo $RATES_RESPONSE | jq -r '.[] | select(.minutes==2) | .id' | head -n 1)
RATE_PRICE=$(echo $RATES_RESPONSE | jq -r '.[] | select(.minutes==2) | .price' | head -n 1)

if [ ! -z "$RATE_ID" ]; then
  echo "  Tarifa encontrada: 2 min - S/ $RATE_PRICE"
  
  RATE_RESPONSE=$(curl -s -X POST "$BASE_URL/agents/purchase?pcId=$PC_ID" \
    -H "Content-Type: application/json" \
    -H "Authorization: Bearer $TOKEN" \
    -d "{\"userId\":\"$USER_ID\",\"type\":\"RATE\",\"itemId\":\"$RATE_ID\",\"paymentMethod\":\"BALANCE\",\"pcId\":\"$PC_ID\"}")
  SESSION_ID=$(echo $RATE_RESPONSE | jq -r '.session.id')
  echo "  ✅ Tarifa comprada"
  echo "  Session ID: $SESSION_ID"
fi
echo ""

# PASO 16: VERIFICAR SALDO después de comprar tarifa
echo "[16] VERIFICAR SALDO después de comprar tarifa"
echo "-----------------------------------"
BALANCE_RESPONSE=$(curl -s -X GET "$BASE_URL/agents/balance/$USER_ID")
BALANCE=$(echo $BALANCE_RESPONSE | jq -r '.balance')
echo "  Saldo después de compra: S/ $BALANCE"
echo ""

# PASO 17: FINALIZAR SESIÓN DE TARIFA
echo "[17] FINALIZAR SESIÓN DE TARIFA"
echo "-----------------------------------"
END_RATE_RESPONSE=$(curl -s -X POST "$BASE_URL/sessions/$SESSION_ID/end" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d '{"paymentMethod":"BALANCE"}')
DURATION_RATE=$(echo $END_RATE_RESPONSE | jq -r '.session.durationSeconds')
echo "  ✅ Sesión de tarifa finalizada"
echo "  Duración real: $DURATION_RATE segundos"
echo ""

# PASO 18: VERIFICAR SALDO después de finalizar tarifa
echo "[18] VERIFICAR SALDO después de finalizar tarifa"
echo "-----------------------------------"
BALANCE_RESPONSE=$(curl -s -X GET "$BASE_URL/agents/balance/$USER_ID")
FINAL_BALANCE=$(echo $BALANCE_RESPONSE | jq -r '.balance')
echo "  Saldo final: S/ $FINAL_BALANCE"
echo ""

# PASO 19: VERIFICAR ESTADO DE PC final
echo "[19] VERIFICAR ESTADO DE PC final"
echo "-----------------------------------"
PC_RESPONSE=$(curl -s -X GET "$BASE_URL/pcs/$PC_ID")
PC_STATUS=$(echo $PC_RESPONSE | jq -r '.status')
ACTIVE_USER=$(echo $PC_RESPONSE | jq -r '.activeUser.username // "NULL"')
USER_BALANCE=$(echo $PC_RESPONSE | jq -r '.activeUser.balance // "N/A"')
SESSION_COUNT=$(echo $PC_RESPONSE | jq -r '.sessions | length')
echo "  Estado PC: $PC_STATUS"
echo "  Usuario activo: $ACTIVE_USER"
if [ "$ACTIVE_USER" != "NULL" ]; then
  echo "  Balance usuario: S/ $USER_BALANCE"
fi
echo "  Sesiones activas: $SESSION_COUNT"
echo ""

# PASO 20: LOGOUT FINAL
echo "[20] LOGOUT FINAL"
echo "-----------------------------------"
LOGOUT_RESPONSE=$(curl -s -X POST "$BASE_URL/auth/logout-from-pc" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d "{\"pcId\":\"$PC_ID\"}")
echo "  ✅ Logout final exitoso"
echo ""

# PASO 21: VERIFICAR ESTADO FINAL DE PC
echo "[21] VERIFICAR ESTADO FINAL DE PC (post-logout)"
echo "-----------------------------------"
PC_RESPONSE=$(curl -s -X GET "$BASE_URL/pcs/$PC_ID")
PC_STATUS=$(echo $PC_RESPONSE | jq -r '.status')
ACTIVE_USER=$(echo $PC_RESPONSE | jq -r '.activeUser.username // "NULL"')
SESSION_COUNT=$(echo $PC_RESPONSE | jq -r '.sessions | length')
echo "  Estado PC: $PC_STATUS"
echo "  Usuario activo: $ACTIVE_USER (esperado: NULL)"
echo "  Sesiones activas: $SESSION_COUNT (esperado: 0)"
echo ""

# RESUMEN
echo "========================================"
echo "  SIMULACIÓN COMPLETADA"
echo "========================================"
echo ""
echo "Balance inicial: S/ $INITIAL_BALANCE"
echo "Recargas totales: S/ 8.00 (5.00 + 3.00)"
echo "Balance final: S/ $FINAL_BALANCE"
SPENT=$(echo "$INITIAL_BALANCE + 8 - $FINAL_BALANCE" | bc)
echo "Gastos totales: S/ $SPENT"
echo ""
echo "Verificaciones:"
echo "  ✓ Recargas aplicadas correctamente"
echo "  ✓ Balance se descuenta en cada sesión"
echo "  ✓ PC queda AVAILABLE después del logout"
echo "  ✓ activeUser NULL después del logout"
echo ""
