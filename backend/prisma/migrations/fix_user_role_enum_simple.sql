-- Migration: Fix UserRole Enum in PostgreSQL (Simple Version)
-- Fecha: 2025-12-24
-- Estrategia: Agregar valores uno por uno sin transaction

-- 1. Agregar STAFF al enum (si no existe)
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_enum 
        WHERE enumlabel = 'STAFF' 
        AND enumtypid = (SELECT oid FROM pg_type WHERE typname = 'UserRole')
    ) THEN
        ALTER TYPE "UserRole" ADD VALUE IF NOT EXISTS 'STAFF';
    END IF;
END$$;

-- 2. Agregar LAN_ADMIN al enum (si no existe)
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_enum 
        WHERE enumlabel = 'LAN_ADMIN' 
        AND enumtypid = (SELECT oid FROM pg_type WHERE typname = 'UserRole')
    ) THEN
        ALTER TYPE "UserRole" ADD VALUE IF NOT EXISTS 'LAN_ADMIN';
    END IF;
END$$;

-- 3. Migrar datos de MANAGER a SUPER_ADMIN
UPDATE users SET role = 'SUPER_ADMIN' WHERE role = 'MANAGER';

-- 4. Migrar datos de CASHIER a STAFF
UPDATE users SET role = 'STAFF' WHERE role = 'CASHIER';

-- Nota: Los valores antiguos (MANAGER, CASHIER) quedarán en el enum pero no se usarán
-- Esto es aceptable para desarrollo. En producción se haría una limpieza completa.
