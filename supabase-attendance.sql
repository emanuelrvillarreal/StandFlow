-- ============================================================================
-- ASISTENCIA + FECHA/HORA DE ALTA
-- Ejecutar en Supabase Dashboard > SQL Editor (se puede repetir sin problema).
-- Requiere haber ejecutado antes: supabase-sponsors.sql.
-- No cambia nada de lo que ven ni hacen los expositores.
-- ============================================================================

-- 1) La fecha y hora del alta la pone el servidor (no el celular del usuario),
--    así no se puede falsear. Aplica a reservas y a solicitudes de participación.
--    (Los registros de Sponsors ya usan la hora del servidor.)
create or replace function public.force_created_at()
returns trigger
language plpgsql
as $$
begin
  new.created_at := now();
  return new;
end;
$$;

drop trigger if exists a4_force_created_at on public.reservations;
create trigger a4_force_created_at
before insert on public.reservations
for each row execute function public.force_created_at();

drop trigger if exists a4_force_created_at on public.event_requests;
create trigger a4_force_created_at
before insert on public.event_requests
for each row execute function public.force_created_at();

-- 2) Asistencia: quién vino, en qué día del evento y a qué hora se marcó.
--    Un evento puede durar varios días, por eso la presencia es por día.
--    "Presente" = existe la fila; para marcar ausente se borra.
--    Sirve tanto para expositores (por reserva) como para Sponsors (por integrante).
create table if not exists public.event_attendance (
  id uuid primary key default gen_random_uuid(),
  event_id uuid not null references public.events(id) on delete cascade,
  day date not null,
  reservation_id uuid references public.reservations(id) on delete cascade,
  sponsor_member_id uuid references public.sponsor_members(id) on delete cascade,
  checked_at timestamptz not null default now(),
  checked_by uuid references auth.users(id) on delete set null default auth.uid(),
  constraint event_attendance_one_subject
    check (((reservation_id is not null)::int + (sponsor_member_id is not null)::int) = 1)
);

create unique index if not exists event_attendance_reservation_day_uidx
  on public.event_attendance (reservation_id, day) where reservation_id is not null;
create unique index if not exists event_attendance_member_day_uidx
  on public.event_attendance (sponsor_member_id, day) where sponsor_member_id is not null;
create index if not exists event_attendance_event_idx on public.event_attendance (event_id, day);

alter table public.event_attendance enable row level security;

-- Solo los administradores ven y marcan la asistencia.
drop policy if exists "admins manage attendance" on public.event_attendance;
create policy "admins manage attendance"
on public.event_attendance
for all
to authenticated
using (public.is_admin())
with check (public.is_admin());

-- 3) Tiempo real: si hay dos administradores en la puerta, se ven los cambios entre sí.
do $$
begin
  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'event_attendance'
  ) then
    alter publication supabase_realtime add table public.event_attendance;
  end if;
end $$;
