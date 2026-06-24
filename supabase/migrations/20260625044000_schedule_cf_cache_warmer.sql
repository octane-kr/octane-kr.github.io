create extension if not exists pg_cron;
create extension if not exists pg_net;

do $$
begin
  perform cron.unschedule('cf-cache-warmer-every-10-minutes');
exception
  when others then
    null;
end;
$$;

select cron.schedule(
  'cf-cache-warmer-every-10-minutes',
  '*/10 * * * *',
  $$
  select net.http_post(
    url := 'https://vmevutajjkkxwlfphahz.supabase.co/functions/v1/codeforces-cache-warmer',
    headers := '{"Content-Type": "application/json"}'::jsonb,
    body := jsonb_build_object(
      'source', 'supabase-cron',
      'batchSize', 20
    )
  ) as request_id;
  $$
);
