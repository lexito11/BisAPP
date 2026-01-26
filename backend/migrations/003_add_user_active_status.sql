-- Agregar columna is_active a la tabla users
ALTER TABLE users
ADD COLUMN IF NOT EXISTS is_active BOOLEAN DEFAULT true;

-- Actualizar usuarios existentes para que estén activos por defecto
UPDATE users
SET is_active = true
WHERE is_active IS NULL;
