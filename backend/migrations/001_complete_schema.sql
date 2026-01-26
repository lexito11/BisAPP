-- =====================================================
-- ESQUEMA COMPLETO DE BISAPP
-- =====================================================

-- 1. Tabla de Iglesias
CREATE TABLE churches (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 2. Tabla de Usuarios (perfil extendido de auth.users)
CREATE TABLE users (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  name TEXT NOT NULL,
  phone TEXT,
  church_id UUID NOT NULL REFERENCES churches(id) ON DELETE CASCADE,
  role TEXT NOT NULL CHECK (role IN ('admin', 'leader')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 3. Tabla de Configuración de Colores
CREATE TABLE color_configuration (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  church_id UUID NOT NULL REFERENCES churches(id) ON DELETE CASCADE UNIQUE,
  green_days INTEGER DEFAULT 7,
  yellow_days INTEGER DEFAULT 14,
  red_days INTEGER DEFAULT 21,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 4. Tabla de Simpatizantes
CREATE TABLE sympathizers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  church_id UUID NOT NULL REFERENCES churches(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  phone TEXT,
  email TEXT,
  city TEXT,
  last_contact_date DATE NOT NULL DEFAULT CURRENT_DATE,
  responsible_user_id UUID REFERENCES users(id) ON DELETE SET NULL,
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 5. Tabla de Contactos (historial)
CREATE TABLE contacts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  sympathizer_id UUID NOT NULL REFERENCES sympathizers(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  contact_type TEXT NOT NULL CHECK (contact_type IN ('phone', 'whatsapp', 'visit', 'email')),
  notes TEXT NOT NULL,
  contact_date TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 6. Tabla de Visitas Programadas
CREATE TABLE visits (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  sympathizer_id UUID NOT NULL REFERENCES sympathizers(id) ON DELETE CASCADE,
  responsible_user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  visit_date DATE NOT NULL,
  visit_time TIME NOT NULL,
  notes TEXT,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'completed', 'cancelled')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 7. Tabla de Configuración de Notificaciones
CREATE TABLE notifications_config (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  church_id UUID NOT NULL REFERENCES churches(id) ON DELETE CASCADE UNIQUE,
  yellow_enabled BOOLEAN DEFAULT true,
  yellow_time TIME DEFAULT '09:00',
  yellow_email BOOLEAN DEFAULT true,
  red_enabled BOOLEAN DEFAULT true,
  red_time1 TIME DEFAULT '08:00',
  red_time2 TIME DEFAULT '13:00',
  red_time3 TIME DEFAULT '17:00',
  red_email BOOLEAN DEFAULT true,
  red_push BOOLEAN DEFAULT true,
  visits_enabled BOOLEAN DEFAULT true,
  visits_reminder_1day BOOLEAN DEFAULT true,
  visits_reminder_2hours BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Índices para mejorar rendimiento
CREATE INDEX idx_users_church_id ON users(church_id);
CREATE INDEX idx_sympathizers_church_id ON sympathizers(church_id);
CREATE INDEX idx_sympathizers_responsible ON sympathizers(responsible_user_id);
CREATE INDEX idx_contacts_sympathizer_id ON contacts(sympathizer_id);
CREATE INDEX idx_contacts_user_id ON contacts(user_id);
CREATE INDEX idx_visits_sympathizer_id ON visits(sympathizer_id);
CREATE INDEX idx_visits_responsible_user_id ON visits(responsible_user_id);
CREATE INDEX idx_color_configuration_church_id ON color_configuration(church_id);
CREATE INDEX idx_notifications_config_church_id ON notifications_config(church_id);

-- Habilitar Row Level Security (RLS)
ALTER TABLE churches ENABLE ROW LEVEL SECURITY;
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE sympathizers ENABLE ROW LEVEL SECURITY;
ALTER TABLE color_configuration ENABLE ROW LEVEL SECURITY;
ALTER TABLE contacts ENABLE ROW LEVEL SECURITY;
ALTER TABLE visits ENABLE ROW LEVEL SECURITY;
ALTER TABLE notifications_config ENABLE ROW LEVEL SECURITY;
