-- ============================================================================
-- LOG DE NOTIFICACIONES ENVIADAS (mail de solicitud aprobada)
-- Ejecutar en Supabase Dashboard > SQL Editor (se puede repetir sin problema).
-- ============================================================================
-- Registra cada vez que se manda (o se intenta mandar) el mail de "solicitud
-- aprobada", para poder ver quién lo recibió y reenviarlo si hace falta. Solo
-- lo puede VER un sysadmin; cualquier admin puede generar un envío (que crea
-- su propia fila en el log), pero no consultar el historial completo.
-- ============================================================================

create table if not exists public.notification_log (
  id uuid primary key default gen_random_uuid(),
  event_request_id uuid references public.event_requests(id) on delete set null,
  event_id uuid references public.events(id) on delete set null,
  user_id uuid references auth.users(id) on delete set null,
  to_email text not null,
  kind text not null default 'approval',
  status text not null check (status in ('sent', 'error')),
  error_message text,
  sent_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now()
);

create index if not exists notification_log_request_idx on public.notification_log(event_request_id);
create index if not exists notification_log_created_idx on public.notification_log(created_at desc);

alter table public.notification_log enable row level security;

do $$
declare pol record;
begin
  for pol in select policyname from pg_policies where schemaname = 'public' and tablename = 'notification_log' loop
    execute format('drop policy if exists %I on public.notification_log', pol.policyname);
  end loop;
end $$;

-- Solo un sysadmin puede ver el historial completo.
create policy "sysadmins read notification log"
on public.notification_log
for select
to authenticated
using (public.is_sysadmin(auth.uid()));

-- Cualquier admin puede generar un envío (lo inserta la Edge Function, usando
-- el token del admin que aprobó o reenvió).
create policy "admins insert notification log"
on public.notification_log
for insert
to authenticated
with check (public.is_admin());

do $$
begin
  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'notification_log'
  ) then
    alter publication supabase_realtime add table public.notification_log;
  end if;
end $$;
