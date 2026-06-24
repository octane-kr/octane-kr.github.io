create table if not exists public.cf_api_cache (
  cache_key text primary key,
  method text not null,
  params jsonb not null,
  payload jsonb not null,
  fetched_at timestamptz not null default now(),
  expires_at timestamptz not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists cf_api_cache_method_idx
  on public.cf_api_cache (method);

create index if not exists cf_api_cache_expires_at_idx
  on public.cf_api_cache (expires_at);

alter table public.cf_api_cache enable row level security;

revoke all on table public.cf_api_cache from anon;
revoke all on table public.cf_api_cache from authenticated;
grant select, insert, update, delete on table public.cf_api_cache to service_role;

comment on table public.cf_api_cache is
  'Server-side cache for public Codeforces API responses used by Codeforces Lab.';

create or replace function public.delete_expired_cf_api_cache()
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  deleted_count integer;
begin
  delete from public.cf_api_cache
  where expires_at < now() - interval '7 days';

  get diagnostics deleted_count = row_count;
  return deleted_count;
end;
$$;
