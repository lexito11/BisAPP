# BisAPP - Sistema de Seguimiento para Iglesias

Sistema de gestión y seguimiento de simpatizantes para iglesias, con sistema de colores automático basado en tiempo desde el último contacto.

## 🚀 Inicio Rápido

### Prerrequisitos
- Node.js 18+ instalado
- Cuenta en Supabase

### 1. Configurar Base de Datos

1. Ve a tu proyecto en Supabase
2. En el SQL Editor, ejecuta en orden:
   - `backend/migrations/001_initial_schema.sql`
   - `backend/migrations/002_rls_policies.sql`
   - `backend/migrations/003_add_user_active_status.sql`
   - `backend/migrations/004_add_seguimientos_fields.sql`
   - `backend/migrations/005_add_is_real_admin.sql`
   - `backend/migrations/006_set_real_admin_by_email.sql`
   - `backend/migrations/007_restrict_user_management_to_real_admin.sql`
   - `backend/migrations/008_add_push_notifications.sql` (Nuevo: Sistema de notificaciones)
   - `backend/migrations/009_setup_cron_job.sql` (Opcional: Configurar cron job automático)

### 2. Configurar Variables de Entorno

Crea el archivo `frontend/.env.local`:

```env
NEXT_PUBLIC_SUPABASE_URL=tu_url_de_supabase
NEXT_PUBLIC_SUPABASE_ANON_KEY=tu_anon_key_de_supabase
SUPABASE_SERVICE_ROLE_KEY=tu_service_role_key  # Solo para el servidor (no exponer en frontend)
```

### 3. Instalar y Correr

```bash
cd frontend
npm install
npm run dev
```

La aplicación estará en: `http://localhost:3000`

## 📋 Estructura del Proyecto

```
BisAPP/
├── backend/
│   └── migrations/          # Migraciones SQL para Supabase
│       ├── 001_initial_schema.sql
│       └── 002_rls_policies.sql
└── frontend/                # Aplicación Next.js
    ├── app/
    │   ├── auth/           # Callback de autenticación OAuth
    │   ├── dashboard/      # Dashboard principal
    │   ├── completar-perfil/  # Completar perfil (legacy)
    │   └── page.tsx        # Página de login
    ├── lib/
    │   └── supabase.ts     # Cliente de Supabase
    ├── types/
    │   └── database.types.ts  # Tipos TypeScript
    └── middleware.ts       # Protección de rutas
```

## 🗄️ Esquema de Base de Datos

### Tablas Principales (en inglés)

- **churches**: Iglesias registradas
- **users**: Usuarios del sistema (admins y líderes)
- **sympathizers**: Simpatizantes a seguir
- **color_configuration**: Configuración de días para sistema de colores

## 🎨 Sistema de Colores

- 🟢 **Verde**: Contactado recientemente (≤ 7 días por defecto)
- 🟡 **Amarillo**: Requiere atención (8-14 días por defecto)
- 🔴 **Rojo**: Urgente (> 14 días por defecto)

Los días son configurables por iglesia.

## 🔐 Autenticación

Soporta:
- Email/Password
- Google OAuth

## 📝 Flujo de Usuario

1. **Login/Registro** → Autenticación con Supabase Auth
2. **Primera vez** → Modal para crear iglesia
3. **Dashboard** → Ver y gestionar simpatizantes

## 🛠️ Tecnologías

- **Frontend**: Next.js 14, React, TypeScript
- **Backend**: Supabase (PostgreSQL + Auth)
- **Estilos**: CSS inline (sin frameworks)

## 🔔 Sistema de Notificaciones Automáticas

El sistema incluye notificaciones push automáticas que detectan cambios de estado de simpatizantes (verde → amarillo → rojo) y envían notificaciones en tiempo real, incluso si no hay usuarios activos.

**Ver documentación completa**: [NOTIFICACIONES_SETUP.md](./NOTIFICACIONES_SETUP.md)

### Características:
- ✅ Detección automática de cambios de estado
- ✅ Notificaciones push en navegador
- ✅ Funciona sin usuarios activos (cron job)
- ✅ Registro completo de notificaciones

## ⚠️ Notas Importantes

- Todo el código (variables, funciones, nombres de tablas) está en **inglés**
- Los comentarios y textos de UI están en **español**
- Asegúrate de ejecutar las migraciones en orden
- El servidor debe correrse desde `frontend/` no desde la raíz
- Para notificaciones automáticas, configura el cron job (ver NOTIFICACIONES_SETUP.md)