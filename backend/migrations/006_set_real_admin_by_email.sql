-- Asignar administrador real (todo el control) a un usuario por correo.
-- Cambia el email si aplica y ejecuta en Supabase → SQL Editor.

-- 1. Todos los admins pasan a "permiso otorgado" (solo ver en Roles).
UPDATE users SET is_real_admin = false WHERE role = 'admin';

-- 2. Este correo es el administrador con login (todo el control).
UPDATE users SET is_real_admin = true
WHERE email = 'javiera.peream@uqvirtual.edu.co' AND role = 'admin';
