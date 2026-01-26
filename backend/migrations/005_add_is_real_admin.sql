-- Diferenciar administrador real vs. administrador con permiso otorgado.
-- Solo el administrador real puede: crear usuario, desactivar usuario, otorgar/quitar permiso de admin.
ALTER TABLE users
ADD COLUMN IF NOT EXISTS is_real_admin BOOLEAN DEFAULT false;

-- Por defecto, ningún admin es "real" hasta asignarlo.
UPDATE users SET is_real_admin = false WHERE role = 'admin';

-- El administrador real es el PRIMERO que inició sesión como admin por iglesia (created_at más antiguo).
UPDATE users u
SET is_real_admin = true
FROM (
  SELECT DISTINCT ON (church_id) id
  FROM users
  WHERE role = 'admin'
  ORDER BY church_id, created_at ASC
) first_admin
WHERE u.id = first_admin.id;
