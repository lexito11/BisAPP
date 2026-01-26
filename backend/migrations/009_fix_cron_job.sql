-- =====================================================
-- FIX: Corregir Cron Job con service_role_key completo
-- =====================================================
-- Eliminar el cron job existente
SELECT cron.unschedule('check-status-changes');

-- Crear cron job nuevamente con la clave completa
SELECT cron.schedule(
  'check-status-changes',
  '*/5 * * * *',
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

-- Verificar que se creó correctamente
SELECT 
  jobid,
  schedule,
  substring(command, 1, 200) as command_preview,
  active
FROM cron.job 
WHERE jobname = 'check-status-changes';
