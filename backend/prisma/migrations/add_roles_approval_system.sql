-- Migration: Sistema de Jerarquía de Roles y Aprobación
-- Fecha: 2025-12-23

-- 1. Crear nuevo enum ApprovalStatus
CREATE TYPE "ApprovalStatus" AS ENUM ('PENDING', 'APPROVED', 'REJECTED');

-- 2. Agregar campos de aprobación a users
ALTER TABLE users
  ADD COLUMN approval_status "ApprovalStatus" DEFAULT 'APPROVED',
  ADD COLUMN approved_by TEXT,
  ADD COLUMN approved_at TIMESTAMP,
  ADD COLUMN rejected_at TIMESTAMP,
  ADD COLUMN rejection_reason TEXT,
  ADD COLUMN managed_lan_id TEXT;

-- 3. Agregar constraint para managed_lan_id
ALTER TABLE users
  ADD CONSTRAINT users_managed_lan_id_fkey 
  FOREIGN KEY (managed_lan_id) REFERENCES lan_centers(id) ON DELETE SET NULL;

-- 4. Agregar constraint para approved_by
ALTER TABLE users
  ADD CONSTRAINT users_approved_by_fkey 
  FOREIGN KEY (approved_by) REFERENCES users(id) ON DELETE SET NULL;

-- 5. Actualizar rol MANAGER a SUPER_ADMIN (si existe)
UPDATE users 
SET role = 'SUPER_ADMIN' 
WHERE role = 'MANAGER';

-- 6. Actualizar rol CASHIER a STAFF (si existe)
UPDATE users 
SET role = 'STAFF' 
WHERE role = 'CASHIER';

-- 7. Renombrar columna en lan_centers
ALTER TABLE lan_centers
  RENAME COLUMN owner_id TO created_by;

-- 8. Actualizar enum UserRole (OJO: Esto puede fallar si hay datos incompatibles)
-- PostgreSQL no permite ALTER TYPE ENUM fácilmente, así que creamos uno nuevo

-- Primero, convertir columna a text temporalmente
ALTER TABLE users ALTER COLUMN role TYPE TEXT;

-- Eliminar el enum viejo
DROP TYPE "UserRole";

-- Crear el nuevo enum
CREATE TYPE "UserRole" AS ENUM ('CLIENT', 'STAFF', 'LAN_ADMIN', 'SUPER_ADMIN');

-- Restaurar columna con el nuevo enum
ALTER TABLE users ALTER COLUMN role TYPE "UserRole" USING role::"UserRole";

-- 9. Asegurar que usuarios existentes estén aprobados
UPDATE users 
SET approval_status = 'APPROVED' 
WHERE role IN ('SUPER_ADMIN', 'CLIENT', 'STAFF');

-- 10. Índices para optimización
CREATE INDEX IF NOT EXISTS idx_users_approval_status ON users(approval_status);
CREATE INDEX IF NOT EXISTS idx_users_managed_lan ON users(managed_lan_id);
CREATE INDEX IF NOT EXISTS idx_lan_centers_created_by ON lan_centers(created_by);
