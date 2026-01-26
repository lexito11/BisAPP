# 🔔 Configuración del Sistema de Notificaciones Automáticas

Este documento explica cómo configurar el sistema de notificaciones push automáticas que detecta cambios de estado de simpatizantes y envía notificaciones en tiempo real.

## 📋 Características

✅ **Detección automática de cambios de estado**: Cuando un simpatizante cambia de verde → amarillo → rojo automáticamente  
✅ **Notificaciones en tiempo real**: Se envían incluso si no hay nadie usando la aplicación  
✅ **Notificaciones push en navegador**: Notificaciones nativas del navegador  
✅ **Registro de auditoría**: Todas las notificaciones se registran en la base de datos  

## 🚀 Instalación

### 1. Ejecutar Migración de Base de Datos

Ejecuta la migración en Supabase SQL Editor:

```sql
-- Ejecutar: backend/migrations/008_add_push_notifications.sql
```

Esta migración crea:
- `push_tokens`: Almacena tokens de dispositivos para notificaciones
- `status_changes`: Registra cambios de estado de simpatizantes
- `notifications_log`: Log de todas las notificaciones enviadas

### 2. Configurar Supabase Edge Function (Opcional pero Recomendado)

Para que las notificaciones funcionen automáticamente sin usuarios activos, necesitas configurar un cron job que ejecute la Edge Function periódicamente.

#### 2.1. Desplegar Edge Function

```bash
# Instalar Supabase CLI si no lo tienes
npm install -g supabase

# Login en Supabase
supabase login

# Link tu proyecto
supabase link --project-ref tu-project-ref

# Desplegar la función
supabase functions deploy check-status-and-notify
```

#### 2.2. Configurar Cron Job en Supabase

En el Dashboard de Supabase, ve a **Database > Cron Jobs** y crea un nuevo cron job:

- **Nombre**: `check_status_changes`
- **Schedule**: `*/5 * * * *` (cada 5 minutos)
- **SQL**: 
```sql
SELECT net.http_post(
  url := 'https://tu-project-ref.supabase.co/functions/v1/check-status-and-notify',
  headers := '{"Authorization": "Bearer ' || current_setting('app.settings.service_role_key') || '", "Content-Type": "application/json"}'::jsonb,
  body := '{}'::jsonb
);
```

O usa el **pg_cron** extension de Supabase:

```sql
-- Habilitar pg_cron si no está habilitado
CREATE EXTENSION IF NOT EXISTS pg_cron;

-- Crear cron job
SELECT cron.schedule(
  'check-status-changes',
  '*/5 * * * *', -- Cada 5 minutos
  $$
  SELECT net.http_post(
    url := 'https://tu-project-ref.supabase.co/functions/v1/check-status-and-notify',
    headers := jsonb_build_object(
      'Authorization', 'Bearer ' || current_setting('app.settings.service_role_key'),
      'Content-Type', 'application/json'
    ),
    body := '{}'::jsonb
  );
  $$
);
```

### 3. Variables de Entorno

Asegúrate de tener estas variables en tu `.env.local`:

```env
NEXT_PUBLIC_SUPABASE_URL=tu_url_de_supabase
NEXT_PUBLIC_SUPABASE_ANON_KEY=tu_anon_key
SUPABASE_SERVICE_ROLE_KEY=tu_service_role_key  # Solo para el servidor
```

## 🔧 Cómo Funciona

### Flujo Automático

1. **Detección de Cambios**: 
   - El cron job ejecuta la Edge Function cada 5 minutos
   - La función calcula el estado actual de cada simpatizante
   - Compara con el último estado registrado
   - Detecta cambios (verde → amarillo → rojo)

2. **Registro de Cambios**:
   - Los cambios se registran en `status_changes`
   - Se marca `notification_sent = false` inicialmente

3. **Envío de Notificaciones**:
   - La función obtiene todos los tokens de push de usuarios activos
   - Envía notificaciones push a cada dispositivo
   - Registra en `notifications_log`
   - Marca `notification_sent = true`

### Notificaciones en Tiempo Real (Frontend)

El componente `NotificationManager` también:
- Escucha cambios en tiempo real usando Supabase Realtime
- Muestra notificaciones locales del navegador cuando detecta cambios
- Solicita permisos de notificación automáticamente
- Registra tokens de dispositivos

## 📱 Permisos del Navegador

Los usuarios deben permitir notificaciones en su navegador. El sistema solicita permisos automáticamente cuando:
- El usuario inicia sesión por primera vez
- El componente `NotificationManager` se monta

## 🧪 Pruebas

### Probar Manualmente

1. **Verificar cambios de estado**:
```bash
# Desde el frontend, puedes llamar a la API manualmente
POST /api/check-status-changes
```

2. **Ver notificaciones en tiempo real**:
   - Abre la aplicación en dos navegadores diferentes
   - En uno, actualiza la fecha de último contacto de un simpatizante
   - Deberías ver la notificación en el otro navegador

### Ver Logs

Consulta las notificaciones enviadas:

```sql
SELECT * FROM notifications_log 
ORDER BY created_at DESC 
LIMIT 50;
```

Ver cambios de estado:

```sql
SELECT 
  sc.*,
  s.name as sympathizer_name,
  c.name as church_name
FROM status_changes sc
JOIN sympathizers s ON s.id = sc.sympathizer_id
JOIN churches c ON c.id = sc.church_id
ORDER BY sc.change_date DESC
LIMIT 50;
```

## 🔔 Tipos de Notificaciones

### 1. Cambio de Estado Automático
- **Cuándo**: Cuando un simpatizante cambia de verde → amarillo → rojo
- **Título**: "🔄 Cambio de Estado: [Atención/Urgente]"
- **Cuerpo**: "[Nombre] cambió a estado [Estado] ([X] días sin contacto)"

### 2. Recordatorios Programados (Futuro)
- **Amarillo**: Recordatorio diario según configuración
- **Rojo**: Múltiples recordatorios diarios (3 horarios)
- **Visitas**: Recordatorio 1 hora antes de la visita

## 🛠️ Solución de Problemas

### Las notificaciones no se envían

1. **Verificar permisos del navegador**:
   - Chrome: Configuración > Privacidad y seguridad > Notificaciones
   - Firefox: Configuración > Privacidad y seguridad > Permisos

2. **Verificar que el cron job esté funcionando**:
```sql
SELECT * FROM cron.job_run_details 
WHERE jobname = 'check-status-changes' 
ORDER BY start_time DESC 
LIMIT 10;
```

3. **Verificar logs de la Edge Function**:
   - Ve a Supabase Dashboard > Edge Functions > check-status-and-notify > Logs

### Los cambios no se detectan

1. **Verificar que la migración se ejecutó correctamente**:
```sql
SELECT EXISTS (
  SELECT FROM information_schema.tables 
  WHERE table_name = 'status_changes'
);
```

2. **Verificar configuración de colores**:
```sql
SELECT * FROM color_configuration;
```

## 📝 Notas Importantes

- ⚠️ **El cron job es esencial**: Sin él, las notificaciones solo funcionarán cuando haya usuarios activos
- 🔒 **Seguridad**: La Edge Function usa `SUPABASE_SERVICE_ROLE_KEY` - nunca la expongas en el frontend
- 📊 **Rendimiento**: El sistema está optimizado para procesar múltiples iglesias eficientemente
- 🔄 **Frecuencia**: El cron job se ejecuta cada 5 minutos por defecto (puedes ajustarlo)

## 🚀 Próximos Pasos

1. Integrar con Firebase Cloud Messaging para notificaciones móviles
2. Agregar notificaciones por email usando Supabase Edge Functions
3. Implementar notificaciones SMS (Twilio, etc.)
4. Dashboard de estadísticas de notificaciones
