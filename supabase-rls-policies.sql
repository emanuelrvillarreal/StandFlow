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
