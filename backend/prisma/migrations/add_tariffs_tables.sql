-- Migración: Agregar tablas de tarifas (TEXT ID)
-- Fecha: 2025-12-23

-- Tabla de rate schedules
CREATE TABLE IF NOT EXISTS rate_schedules (
    id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
    zone_id TEXT NOT NULL REFERENCES zones(id) ON DELETE CASCADE,
    minutes INTEGER NOT NULL,
    price DECIMAL(10,2) NOT NULL,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW(),
    UNIQUE(zone_id, minutes)
);

-- Tabla de bundles
CREATE TABLE IF NOT EXISTS bundles (
    id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
    zone_id TEXT NOT NULL REFERENCES zones(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    minutes INTEGER NOT NULL,
    price DECIMAL(10,2) NOT NULL,
    is_saveable BOOLEAN DEFAULT false,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- Índices para mejorar performance
CREATE INDEX IF NOT EXISTS idx_rate_schedules_zone ON rate_schedules(zone_id);
CREATE INDEX IF NOT EXISTS idx_bundles_zone ON bundles(zone_id);
