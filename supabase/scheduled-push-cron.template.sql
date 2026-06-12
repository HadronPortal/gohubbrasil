-- GoHub automatic push scheduler.
-- Paste this in Supabase SQL Editor after replacing __SERVICE_ROLE_KEY__.
-- The daily schedule runs at 08:05 America/Sao_Paulo, which is 11:05 UTC.

CREATE EXTENSION IF NOT EXISTS pg_cron WITH SCHEMA extensions;
CREATE EXTENSION IF NOT EXISTS pg_net WITH SCHEMA extensions;

SELECT cron.unschedule(jobid)
FROM cron.job
WHERE jobname IN (
  'gohub-process-push-queue-every-minute',
  'gohub-daily-push-reminders-0805-br',
  'gohub-retry-failed-push-every-10-minutes'
);

SELECT cron.schedule(
  'gohub-process-push-queue-every-minute',
  '* * * * *',
  $$
  SELECT net.http_post(
    url := 'https://uypvfkpbkmcbkjgadspf.supabase.co/functions/v1/send-push',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer __SERVICE_ROLE_KEY__'
    ),
    body := jsonb_build_object(
      'process_queue', true,
      'limit', 50
    )
  );
  $$
);

SELECT cron.schedule(
  'gohub-daily-push-reminders-0805-br',
  '5 11 * * *',
  $$
  SELECT net.http_post(
    url := 'https://uypvfkpbkmcbkjgadspf.supabase.co/functions/v1/send-push',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer __SERVICE_ROLE_KEY__'
    ),
    body := jsonb_build_object(
      'job', 'daily',
      'limit', 50
    )
  );
  $$
);

SELECT cron.schedule(
  'gohub-retry-failed-push-every-10-minutes',
  '*/10 * * * *',
  $$
  SELECT public.retry_failed_push_notifications();
  $$
);

SELECT jobid, jobname, schedule, active
FROM cron.job
WHERE jobname LIKE 'gohub-%'
ORDER BY jobname;
