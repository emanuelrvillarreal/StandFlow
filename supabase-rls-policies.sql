-- StandFlow RLS policies
-- Ejecutar en Supabase Dashboard > SQL Editor.
-- Requiere que profiles.id sea el auth.uid() del usuario y profiles.role_id = 1 para administradores.

create or replace function public.is_admin()
returns boolean
language sql
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.profiles
    where id = auth.uid()
      and role_id = 1
  );
$$;

create table if not exists public.app_settings (
  id text primary key,
  value jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now()
);

-- Poster/flyer del evento, visible en la lista de eventos.
alter table public.events add column if not exists poster_image text;

-- Fecha de fin, para eventos de varios días (null = evento de un solo día).
alter table public.events add column if not exists end_date date;

-- Si la reserva fue por seña (50%) o por el total, para que el admin lo vea.
alter table public.reservations add column if not exists payment_type text default 'full';

-- Fecha en que se marcó la reserva como pagada/seña, para el libro de caja de Finanzas.
alter table public.reservations add column if not exists paid_at timestamptz;

-- 'income' o 'expense', para poder cargar ingresos manuales además de egresos.
alter table public.expenses add column if not exists type text default 'expense';

-- Nombre del emprendimiento del expositor, cargado al registrarse.
alter table public.profiles add column if not exists business_name text;

-- Bloqueo de usuarios: el motivo solo lo carga/ve el admin. Al usuario
-- bloqueado se lo desloguea automáticamente sin mostrarle el motivo.
alter table public.profiles add column if not exists is_blocked boolean not null default false;
alter table public.profiles add column if not exists blocked_reason text;
alter table public.profiles add column if not exists blocked_at timestamptz;

-- Perfil público del expositor: instagram y foto del emprendimiento,
-- para mostrar en el mapa quién está en cada stand.
alter table public.profiles add column if not exists instagram text;
alter table public.profiles add column if not exists business_photo text;

alter table public.events enable row level security;
alter table public.stands enable row level security;
alter table public.reservations enable row level security;
alter table public.profiles enable row level security;
alter table public.app_settings enable row level security;

-- Cascada de borrado:
-- Si se elimina un evento, se eliminan automaticamente sus stands y reservas.
-- Si se elimina un stand, se eliminan sus reservas asociadas.
do $$
declare
  constraint_name text;
begin
  select tc.constraint_name
  into constraint_name
  from information_schema.table_constraints tc
  join information_schema.key_column_usage kcu
    on tc.constraint_name = kcu.constraint_name
   and tc.table_schema = kcu.table_schema
  where tc.table_schema = 'public'
    and tc.table_name = 'reservations'
    and tc.constraint_type = 'FOREIGN KEY'
    and kcu.column_name = 'event_id'
  limit 1;

  if constraint_name is not null then
    execute format('alter table public.reservations drop constraint %I', constraint_name);
  end if;

  alter table public.reservations
    add constraint reservations_event_id_fkey
    foreign key (event_id)
    references public.events(id)
    on delete cascade;
end;
$$;

do $$
declare
  constraint_name text;
begin
  select tc.constraint_name
  into constraint_name
  from information_schema.table_constraints tc
  join information_schema.key_column_usage kcu
    on tc.constraint_name = kcu.constraint_name
   and tc.table_schema = kcu.table_schema
  where tc.table_schema = 'public'
    and tc.table_name = 'stands'
    and tc.constraint_type = 'FOREIGN KEY'
    and kcu.column_name = 'event_id'
  limit 1;

  if constraint_name is not null then
    execute format('alter table public.stands drop constraint %I', constraint_name);
  end if;

  alter table public.stands
    add constraint stands_event_id_fkey
    foreign key (event_id)
    references public.events(id)
    on delete cascade;
end;
$$;

do $$
declare
  constraint_name text;
begin
  select tc.constraint_name
  into constraint_name
  from information_schema.table_constraints tc
  join information_schema.key_column_usage kcu
    on tc.constraint_name = kcu.constraint_name
   and tc.table_schema = kcu.table_schema
  where tc.table_schema = 'public'
    and tc.table_name = 'reservations'
    and tc.constraint_type = 'FOREIGN KEY'
    and kcu.column_name = 'stand_id'
  limit 1;

  if constraint_name is not null then
    execute format('alter table public.reservations drop constraint %I', constraint_name);
  end if;

  alter table public.reservations
    add constraint reservations_stand_id_fkey
    foreign key (stand_id)
    references public.stands(id)
    on delete cascade;
end;
$$;

drop policy if exists "authenticated users can read app settings" on public.app_settings;
create policy "authenticated users can read app settings"
on public.app_settings
for select
to authenticated
using (true);

drop policy if exists "admins can manage app settings" on public.app_settings;
create policy "admins can manage app settings"
on public.app_settings
for all
to authenticated
using (public.is_admin())
with check (public.is_admin());

drop policy if exists "users can read own profile and admins can read all" on public.profiles;
create policy "users can read own profile and admins can read all"
on public.profiles
for select
to authenticated
using (
  id = auth.uid()
  or public.is_admin()
);

drop policy if exists "admins can manage profiles" on public.profiles;
create policy "admins can manage profiles"
on public.profiles
for all
to authenticated
using (public.is_admin())
with check (
  id = auth.uid()
  or public.is_admin()
);

drop policy if exists "authenticated users can read events" on public.events;
create policy "authenticated users can read events"
on public.events
for select
to authenticated
using (true);

-- Permite navegar los eventos sin iniciar sesión (solo lectura,
-- sin datos sensibles). El login se pide recién al reservar.
drop policy if exists "anyone can read events" on public.events;
create policy "anyone can read events"
on public.events
for select
to anon
using (true);

drop policy if exists "admins can manage events" on public.events;
create policy "admins can manage events"
on public.events
for all
to authenticated
using (public.is_admin())
with check (public.is_admin());

drop policy if exists "authenticated users can read stands" on public.stands;
create policy "authenticated users can read stands"
on public.stands
for select
to authenticated
using (true);

-- Idem para stands: se puede ver el mapa y la disponibilidad sin login.
drop policy if exists "anyone can read stands" on public.stands;
create policy "anyone can read stands"
on public.stands
for select
to anon
using (true);

drop policy if exists "admins can manage stands" on public.stands;
create policy "admins can manage stands"
on public.stands
for all
to authenticated
using (public.is_admin())
with check (public.is_admin());

drop policy if exists "users can read own reservations and admins can read all" on public.reservations;
create policy "users can read own reservations and admins can read all"
on public.reservations
for select
to authenticated
using (
  user_id = auth.uid()
  or public.is_admin()
);

drop policy if exists "admins can manage reservations" on public.reservations;
create policy "admins can manage reservations"
on public.reservations
for all
to authenticated
using (public.is_admin())
with check (public.is_admin());

drop policy if exists "users can create own reservations" on public.reservations;
create policy "users can create own reservations"
on public.reservations
for insert
to authenticated
with check (user_id = auth.uid());

drop policy if exists "users can update own pending reservations" on public.reservations;
create policy "users can update own pending reservations"
on public.reservations
for update
to authenticated
using (user_id = auth.uid() and status = 'pending')
with check (user_id = auth.uid());

drop policy if exists "authenticated users can reserve available stands" on public.stands;
create policy "authenticated users can reserve available stands"
on public.stands
for update
to authenticated
using (status = 'available')
with check (status = 'pending');

-- Permite revertir un stand a 'available' si el insert de la reserva falló
-- (evita stands huérfanos en 'pending' sin reserva). Solo libera stands
-- que NO tienen ninguna reserva activa, así no se puede pisar la reserva
-- de otra persona.
drop policy if exists "users can rollback failed reservation stands" on public.stands;
create policy "users can rollback failed reservation stands"
on public.stands
for update
to authenticated
using (
  status = 'pending'
  and not exists (
    select 1 from public.reservations r
    where r.stand_id = stands.id
      and r.status in ('pending', 'deposit_paid', 'paid', 'reserved')
  )
)
with check (status = 'available');

-- Limpieza puntual de stands huérfanos (los que quedaron en 'pending'/
-- 'reserved' por el error de payment_type sin fila en reservations).
-- Ejecutalo una vez para liberar esos 2 stands:
-- update public.stands s
-- set status = 'available', category_id = null
-- where s.status in ('pending', 'reserved')
--   and not exists (
--     select 1 from public.reservations r
--     where r.stand_id = s.id
--       and r.status in ('pending', 'deposit_paid', 'paid', 'reserved')
--   );
-- Para ver cuáles son antes de liberarlos:
-- select s.id, s.event_id, s.status
-- from public.stands s
-- left join public.reservations r
--   on r.stand_id = s.id
--   and r.status in ('pending', 'deposit_paid', 'paid', 'reserved')
-- where s.status in ('pending', 'reserved')
--   and r.id is null;

create or replace function public.sync_stand_status_from_reservations(target_stand_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  active_reservation record;
begin
  select status, category_id
  into active_reservation
  from public.reservations
  where stand_id = target_stand_id
    and status in ('pending', 'paid', 'reserved')
  order by
    case
      when status in ('paid', 'reserved') then 1
      when status = 'pending' then 2
      else 3
    end,
    created_at desc
  limit 1;

  if active_reservation is null then
    update public.stands
    set status = 'available',
        category_id = null
    where id = target_stand_id
      and status in ('pending', 'reserved');
  else
    update public.stands
    set status = case
          when active_reservation.status in ('paid', 'reserved') then 'reserved'
          else 'pending'
        end,
        category_id = active_reservation.category_id
    where id = target_stand_id;
  end if;
end;
$$;

create or replace function public.handle_reservation_stand_sync()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if tg_op in ('INSERT', 'UPDATE') then
    perform public.sync_stand_status_from_reservations(new.stand_id);
  end if;

  if tg_op in ('UPDATE', 'DELETE') then
    perform public.sync_stand_status_from_reservations(old.stand_id);
  end if;

  return coalesce(new, old);
end;
$$;

drop trigger if exists sync_reservation_stand_status on public.reservations;
create trigger sync_reservation_stand_status
after insert or update or delete on public.reservations
for each row execute function public.handle_reservation_stand_sync();

-- One-time sync para reservas que ya existen.
do $$
declare
  stand_row record;
begin
  for stand_row in select id from public.stands loop
    perform public.sync_stand_status_from_reservations(stand_row.id);
  end loop;
end;
$$;

-- Habilitar Realtime en stands/reservations para que el mapa se actualice
-- en vivo cuando otro usuario reserva un stand (sin tener que recargar).
alter publication supabase_realtime add table public.stands;
alter publication supabase_realtime add table public.reservations;
