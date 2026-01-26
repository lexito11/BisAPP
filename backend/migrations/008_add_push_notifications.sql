-- =====================================================
-- MIGRACIÓN: Sistema de Notificaciones Push Automáticas
-- =====================================================
-- Descripción: Agrega tablas para push tokens y registro de cambios de estado
-- Fecha: 2025-01-XX
-- =====================================================

-- 1. Tabla para almacenar tokens de notificaciones push de dispositivos
CREATE TABLE IF NOT EXISTS push_tokens (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  token TEXT NOT NULL,
  device_type TEXT CHECK (device_type IN ('web', 'ios', 'android')),
  device_info JSONB,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(user_id, token)
);

-- 2. Tabla para registrar cambios de estado de simpatizantes
CREATE TABLE IF NOT EXISTS status_changes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  sympathizer_id UUID NOT NULL REFERENCES sympathizers(id) ON DELETE CASCADE,
  church_id UUID NOT NULL REFERENCES churches(id) ON DELETE CASCADE,
  previous_status TEXT CHECK (previous_status IN ('green', 'yellow', 'red')),
  new_status TEXT NOT NULL CHECK (new_status IN ('green', 'yellow', 'red')),
  change_date TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  days_since_contact INTEGER NOT NULL,
  notification_sent BOOLEAN DEFAULT false,
  notification_sent_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 3. Tabla para registrar notificaciones enviadas (auditoría)
CREATE TABLE IF NOT EXISTS notifications_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  church_id UUID NOT NULL REFERENCES churches(id) ON DELETE CASCADE,
  user_id UUID REFERENCES users(id) ON DELETE SET NULL,
  notification_type TEXT NOT NULL CHECK (notification_type IN ('status_change', 'yellow_reminder', 'red_reminder', 'visit_reminder')),
  sympathizer_id UUID REFERENCES sympathizers(id) ON DELETE SET NULL,
  visit_id UUID REFERENCES visits(id) ON DELETE SET NULL,
  title TEXT NOT NULL,
  body TEXT NOT NULL,
  sent_via TEXT[] DEFAULT ARRAY[]::TEXT[], -- ['push', 'email', 'sms']
  success BOOLEAN DEFAULT true,
  error_message TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Índices para mejorar rendimiento
CREATE INDEX IF NOT EXISTS idx_push_tokens_user_id ON push_tokens(user_id);
CREATE INDEX IF NOT EXISTS idx_push_tokens_token ON push_tokens(token);
CREATE INDEX IF NOT EXISTS idx_status_changes_sympathizer_id ON status_changes(sympathizer_id);
CREATE INDEX IF NOT EXISTS idx_status_changes_church_id ON status_changes(church_id);
CREATE INDEX IF NOT EXISTS idx_status_changes_notification_sent ON status_changes(notification_sent) WHERE notification_sent = false;
CREATE INDEX IF NOT EXISTS idx_status_changes_change_date ON status_changes(change_date);
CREATE INDEX IF NOT EXISTS idx_notifications_log_church_id ON notifications_log(church_id);
CREATE INDEX IF NOT EXISTS idx_notifications_log_user_id ON notifications_log(user_id);
CREATE INDEX IF NOT EXISTS idx_notifications_log_created_at ON notifications_log(created_at);

-- Habilitar RLS
ALTER TABLE push_tokens ENABLE ROW LEVEL SECURITY;
ALTER TABLE status_changes ENABLE ROW LEVEL SECURITY;
ALTER TABLE notifications_log ENABLE ROW LEVEL SECURITY;

-- Políticas RLS para push_tokens
CREATE POLICY "Users can manage their own push tokens"
ON push_tokens FOR ALL
USING (user_id = auth.uid())
WITH CHECK (user_id = auth.uid());

-- Políticas RLS para status_changes (solo lectura para usuarios de la misma iglesia)
CREATE POLICY "Users can view status changes from their church"
ON status_changes FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM users 
    WHERE users.id = auth.uid() 
    AND users.church_id = status_changes.church_id
  )
);

-- Políticas RLS para notifications_log (solo lectura para usuarios de la misma iglesia)
CREATE POLICY "Users can view notifications log from their church"
ON notifications_log FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM users 
    WHERE users.id = auth.uid() 
    AND users.church_id = notifications_log.church_id
  )
);

-- Función para actualizar updated_at automáticamente
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger para actualizar updated_at en push_tokens
CREATE TRIGGER update_push_tokens_updated_at
BEFORE UPDATE ON push_tokens
FOR EACH ROW
EXECUTE FUNCTION update_updated_at_column();
