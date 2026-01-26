-- =====================================================
-- RESTRINGIR GESTIÓN DE USUARIOS SOLO AL ADMINISTRADOR REAL
-- =====================================================
-- Solo el administrador real (is_real_admin = true) puede:
-- - Crear usuarios
-- - Actualizar usuarios (cambiar roles, activar/desactivar, etc.)
-- - Eliminar usuarios
-- 
-- Los administradores con permiso (role = 'admin' pero is_real_admin = false)
-- pueden hacer todo lo demás pero NO pueden gestionar usuarios.

-- =====================================================
-- CREAR COLUMNA is_real_admin SI NO EXISTE
-- =====================================================

ALTER TABLE users
ADD COLUMN IF NOT EXISTS is_real_admin BOOLEAN DEFAULT false;

-- Si la columna es nueva, establecer valores por defecto
UPDATE users SET is_real_admin = false WHERE is_real_admin IS NULL;

-- Asignar administrador real: el PRIMERO que inició sesión como admin por iglesia
UPDATE users u
SET is_real_admin = true
FROM (
  SELECT DISTINCT ON (church_id) id
  FROM users
  WHERE role = 'admin'
  ORDER BY church_id, created_at ASC
) first_admin
WHERE u.id = first_admin.id AND u.is_real_admin = false;

-- =====================================================
-- ELIMINAR POLÍTICAS ANTIGUAS DE USUARIOS
-- =====================================================

DROP POLICY IF EXISTS "Admins can create users" ON users;
DROP POLICY IF EXISTS "Admins can update users" ON users;
DROP POLICY IF EXISTS "Admins can delete users" ON users;

-- =====================================================
-- CREAR NUEVAS POLÍTICAS RESTRICTIVAS
-- =====================================================

-- Solo el administrador real puede crear usuarios (excepto durante signup)
CREATE POLICY "Only real admin can create users"
ON users FOR INSERT
WITH CHECK (
  -- Permitir creación durante signup (id = auth.uid())
  id = auth.uid()
  OR
  -- O si es el administrador real creando otros usuarios
  EXISTS (
    SELECT 1 FROM users u 
    WHERE u.id = auth.uid() 
    AND u.church_id = users.church_id 
    AND u.role = 'admin' 
    AND u.is_real_admin = true
  )
);

-- Solo el administrador real puede actualizar usuarios
-- (esto incluye cambiar roles, activar/desactivar, etc.)
CREATE POLICY "Only real admin can update users"
ON users FOR UPDATE
USING (
  -- Solo el administrador real puede actualizar usuarios
  EXISTS (
    SELECT 1 FROM users u 
    WHERE u.id = auth.uid() 
    AND u.church_id = users.church_id 
    AND u.role = 'admin' 
    AND u.is_real_admin = true
  )
);

-- Solo el administrador real puede eliminar usuarios
CREATE POLICY "Only real admin can delete users"
ON users FOR DELETE
USING (
  id != auth.uid() AND
  EXISTS (
    SELECT 1 FROM users u 
    WHERE u.id = auth.uid() 
    AND u.church_id = users.church_id 
    AND u.role = 'admin' 
    AND u.is_real_admin = true
  )
);

-- =====================================================
-- PERMITIR A TODOS LOS USUARIOS VER USUARIOS DE SU IGLESIA
-- =====================================================

-- Agregar política para que todos los usuarios puedan ver usuarios de su iglesia
-- (necesario para la página de Roles)
-- Nota: La política "Users can view their own profile" ya existe y permite ver el propio perfil
-- Esta nueva política permite ver todos los usuarios de la misma iglesia
CREATE POLICY "Users can view users from their church"
ON users FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM users u 
    WHERE u.id = auth.uid() 
    AND u.church_id = users.church_id
  )
);
