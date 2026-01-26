-- =====================================================
-- MIGRACIÓN: Configurar Cron Job para Notificaciones
-- =====================================================
-- Descripción: Configura el cron job para ejecutar la verificación de cambios de estado
-- Listo para ejecutar - Ya incluye project reference y service_role_key
-- =====================================================

-- Habilitar extensión pg_cron si no está habilitada
CREATE EXTENSION IF NOT EXISTS pg_cron;

-- Habilitar extensión http si no está habilitada (para llamar a Edge Functions)
CREATE EXTENSION IF NOT EXISTS http;

-- Eliminar cron job existente si existe
SELECT cron.unschedule('check-status-changes') WHERE EXISTS (
  SELECT 1 FROM cron.job WHERE jobname = 'check-status-changes'
);

-- Crear cron job para verificar cambios de estado cada 5 minutos
SELECT cron.schedule(
  'check-status-changes',
  '*/5 * * * *', -- Cada 5 minutos
  $$
  SELECT net.http_post(
    url := 'https://yfhzjhlacnecpsjcyjgc.supabase.co/functions/v1/check-status-and-notify',
    headers := jsonb_build_object(
      'Authorization', 'Bearer sb_secret_Ww8xaHiyDPTO7MOF0J6Xrw_w693LS-3',
      'Content-Type', 'application/json'
    ),
    body := '{}'::jsonb
  );
  $$
);

-- Verificar que el cron job se creó correctamente
SELECT 
  jobid,
  schedule,
  command,
  nodename,
  nodeport,
  database,
  username,
  active
FROM cron.job 
WHERE jobname = 'check-status-changes';
