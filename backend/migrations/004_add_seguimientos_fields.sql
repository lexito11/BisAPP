-- =====================================================
-- MIGRACIÓN: Agregar campos para Ventana de Seguimientos
-- =====================================================
-- Descripción: Agrega campos para "No Volvió" y "Bautizado" en la tabla sympathizers
-- Fecha: 2025-01-XX
-- =====================================================

-- Agregar campos para "No Volvió" (cada columna en su propia sentencia para mayor seguridad)
ALTER TABLE sympathizers
ADD COLUMN IF NOT EXISTS did_not_return BOOLEAN DEFAULT FALSE;

ALTER TABLE sympathizers
ADD COLUMN IF NOT EXISTS did_not_return_date DATE;

ALTER TABLE sympathizers
ADD COLUMN IF NOT EXISTS no_return_reason TEXT;

-- Agregar campos para "Bautizado"
ALTER TABLE sympathizers
ADD COLUMN IF NOT EXISTS baptized BOOLEAN DEFAULT FALSE;

ALTER TABLE sympathizers
ADD COLUMN IF NOT EXISTS baptism_date DATE;

-- Crear índices para mejorar rendimiento en consultas
CREATE INDEX IF NOT EXISTS idx_sympathizers_did_not_return ON sympathizers(did_not_return) WHERE did_not_return = TRUE;
CREATE INDEX IF NOT EXISTS idx_sympathizers_baptized ON sympathizers(baptized) WHERE baptized = TRUE;
CREATE INDEX IF NOT EXISTS idx_sympathizers_did_not_return_date ON sympathizers(did_not_return_date);
CREATE INDEX IF NOT EXISTS idx_sympathizers_baptism_date ON sympathizers(baptism_date);

-- Agregar comentarios a las columnas para documentación
COMMENT ON COLUMN sympathizers.did_not_return IS 'Indica si el simpatizante decidió no continuar (No Volvió)';
COMMENT ON COLUMN sympathizers.did_not_return_date IS 'Fecha en que se marcó como "No Volvió"';
COMMENT ON COLUMN sympathizers.no_return_reason IS 'Motivo por el cual no volvió (opcional)';
COMMENT ON COLUMN sympathizers.baptized IS 'Indica si el simpatizante ha sido bautizado';
COMMENT ON COLUMN sympathizers.baptism_date IS 'Fecha del bautismo';
