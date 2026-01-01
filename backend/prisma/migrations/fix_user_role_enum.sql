-- Migration: Fix UserRole Enum in PostgreSQL
-- Fecha: 2025-12-24
-- Objetivo: Agregar LAN_ADMIN y STAFF, eliminar MANAGER y CASHIER

-- 1. Agregar nuevos valores al enum UserRole (si no existen)
DO $$
BEGIN
    -- Agregar STAFF si no existe
    IF NOT EXISTS (SELECT 1 FROM pg_enum WHERE enumlabel = 'STAFF' AND enumtypid = (SELECT oid FROM pg_type WHERE typname = 'UserRole')) THEN
        ALTER TYPE "UserRole" ADD VALUE 'STAFF';
    END IF;

    -- Agregar LAN_ADMIN si no existe
    IF NOT EXISTS (SELECT 1 FROM pg_enum WHERE enumlabel = 'LAN_ADMIN' AND enumtypid = (SELECT oid FROM pg_type WHERE typname = 'UserRole')) THEN
        ALTER TYPE "UserRole" ADD VALUE 'LAN_ADMIN';
    END IF;
END$$;

-- 2. Migrar datos existentes
-- MANAGER -> SUPER_ADMIN (ya existe)
UPDATE users SET role = 'SUPER_ADMIN' WHERE role = 'MANAGER';

-- CASHIER -> STAFF
UPDATE users SET role = 'STAFF' WHERE role = 'CASHIER';

-- 3. Como PostgreSQL no permite eliminar valores del enum directamente si están en uso,
--    vamos a crear un nuevo enum y reemplazar el antiguo

-- Crear nuevo enum temporal
CREATE TYPE "UserRole_new" AS ENUM ('CLIENT', 'STAFF', 'LAN_ADMIN', 'SUPER_ADMIN');

-- Actualizar la columna para usar el nuevo enum
ALTER TABLE users ALTER COLUMN role TYPE "UserRole_new" USING role::text::"UserRole_new";

-- Eliminar el enum antiguo
DROP TYPE "UserRole";

-- Renombrar el nuevo enum
ALTER TYPE "UserRole_new" RENAME TO "UserRole";
