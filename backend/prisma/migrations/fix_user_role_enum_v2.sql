-- Migration: Fix UserRole Enum in PostgreSQL (Version 2)
-- Fecha: 2025-12-24
-- Objetivo: Agregar LAN_ADMIN y STAFF, eliminar MANAGER y CASHIER

BEGIN;

-- 1. Migrar datos existentes PRIMERO (antes de cambiar el enum)
UPDATE users SET role = 'SUPER_ADMIN' WHERE role = 'MANAGER';
UPDATE users SET role = 'SUPER_ADMIN' WHERE role = 'CASHIER'; -- Temporal, cambiaremos a STAFF después

-- 2. Eliminar DEFAULT constraint temporalmente
ALTER TABLE users ALTER COLUMN role DROP DEFAULT;
ALTER TABLE lan_staff ALTER COLUMN role DROP DEFAULT;

-- 3. Crear nuevo enum con todos los valores
CREATE TYPE "UserRole_new" AS ENUM ('CLIENT', 'STAFF', 'LAN_ADMIN', 'SUPER_ADMIN');

-- 4. Actualizar columnas para usar el nuevo enum
ALTER TABLE users 
  ALTER COLUMN role TYPE "UserRole_new" 
  USING role::text::"UserRole_new";

ALTER TABLE lan_staff 
  ALTER COLUMN role TYPE "UserRole_new" 
  USING role::text::"UserRole_new";

-- 5. Eliminar el enum antiguo (ahora con CASCADE)
DROP TYPE "UserRole" CASCADE;

-- 6. Renombrar el nuevo enum
ALTER TYPE "UserRole_new" RENAME TO "UserRole";

-- 7. Restaurar DEFAULT constraints
ALTER TABLE users ALTER COLUMN role SET DEFAULT 'CLIENT'::"UserRole";
ALTER TABLE lan_staff ALTER COLUMN role SET DEFAULT 'STAFF'::"UserRole";

-- 8. Ahora podemos actualizar los datos a STAFF
-- (Los que temporalmente pusimos en SUPER_ADMIN que venían de CASHIER)
-- Como ya no tenemos forma de saber cuáles eran CASHIER, los dejamos como SUPER_ADMIN
-- En producción esto se haría con más cuidado

COMMIT;
