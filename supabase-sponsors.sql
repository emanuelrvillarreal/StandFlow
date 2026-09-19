-- ============================================================================
-- SPONSORS DENTRO DE LOS EVENTOS
-- Ejecutar en Supabase Dashboard > SQL Editor (una sola vez).
-- Requiere haber ejecutado antes: supabase-rls-policies.sql,
-- supabase-security-fixes.sql y supabase-approval-flow.sql.
-- ============================================================================
-- Cada evento tiene su propia configuración de Sponsors (habilitado Sí/No,
-- código, imagen y qué stands se reservan para Sponsors). Nada es global: el
-- código identifica al evento.
--
-- Los Sponsors NO usan la tabla reservations: su stand es gratis, no tiene
-- importe ni pago, así que quedan en tablas propias y no afectan finanzas,
-- reservas ni el flujo de Expositores.
--
-- El código es secreto: vive en una tabla que solo lee el admin. La validación
-- y el registro pasan por funciones (RPC) que corren en el servidor.
-- ============================================================================

-- 1) Configuración de Sponsors por evento (solo admin).
create table if not exists public.event_sponsor_settings (
  event_id uuid primary key references public.events(id) on delete cascade,
  enabled boolean not null default false,
  code text,
  image text,
  updated_at timestamptz not null default now()
);

-- El código identifica al evento, así que no puede repetirse entre eventos
-- (sin distinguir mayúsculas ni espacios de los costados).
create unique index if not exists event_sponsor_settings_code_uidx
  on public.event_sponsor_settings (upper(btrim(code)))
  where code is not null and btrim(code) <> '';

alter table public.event_sponsor_settings enable row level security;

drop policy if exists "admins manage sponsor settings" on public.event_sponsor_settings;
create policy "admins manage sponsor settings"
on public.event_sponsor_settings
for all
to authenticated
using (public.is_admin())
with check (public.is_admin());

-- 2) Qué stands están reservados para Sponsors.
alter table public.stands add column if not exists is_sponsor_stand boolean not null default false;

-- El sector "sponsor" es un mapa más del evento (como salón y galería, con su
-- propia imagen en events.map_image->'sponsor'). Los stands que el admin coloca
-- en ese sector son los de Sponsors: la marca is_sponsor_stand se deriva sola.
create or replace function public.set_sponsor_stand_flag()
returns trigger
language plpgsql
as $$
begin
  new.is_sponsor_stand := (new.sector = 'sponsor');
  return new;
end;
$$;

drop trigger if exists a_set_sponsor_stand_flag on public.stands;
create trigger a_set_sponsor_stand_flag
before insert or update of sector on public.stands
for each row execute function public.set_sponsor_stand_flag();

update public.stands set is_sponsor_stand = (sector = 'sponsor') where is_sponsor_stand is distinct from (sector = 'sponsor');

-- 3) Registros de Sponsors y sus integrantes.
create table if not exists public.sponsor_registrations (
  id uuid primary key default gen_random_uuid(),
  event_id uuid not null references public.events(id) on delete cascade,
  stand_id uuid not null references public.stands(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  created_at timestamptz not null default now(),
  unique (stand_id)
);

create table if not exists public.sponsor_members (
  id uuid primary key default gen_random_uuid(),
  registration_id uuid not null references public.sponsor_registrations(id) on delete cascade,
  first_name text not null,
  last_name text not null,
  dni text not null,
  phone text not null,
  email text not null,
  position int not null default 0
);

-- Fecha de nacimiento de cada integrante (los registros anteriores quedan sin fecha).
alter table public.sponsor_members add column if not exists birth_date date;

create index if not exists sponsor_registrations_event_idx on public.sponsor_registrations(event_id);
create index if not exists sponsor_registrations_user_idx on public.sponsor_registrations(user_id);
create index if not exists sponsor_members_registration_idx on public.sponsor_members(registration_id);

alter table public.sponsor_registrations enable row level security;
alter table public.sponsor_members enable row level security;

-- Se crean solo con register_sponsor() (no hay policy de INSERT para usuarios).
drop policy if exists "sponsors read own registrations, admins all" on public.sponsor_registrations;
create policy "sponsors read own registrations, admins all"
on public.sponsor_registrations
for select
to authenticated
using (user_id = auth.uid() or public.is_admin());

drop policy if exists "admins manage sponsor registrations" on public.sponsor_registrations;
create policy "admins manage sponsor registrations"
on public.sponsor_registrations
for all
to authenticated
using (public.is_admin())
with check (public.is_admin());

drop policy if exists "sponsors read own members, admins all" on public.sponsor_members;
create policy "sponsors read own members, admins all"
on public.sponsor_members
for select
to authenticated
using (
  public.is_admin()
  or exists (
    select 1 from public.sponsor_registrations r
    where r.id = registration_id and r.user_id = auth.uid()
  )
);

drop policy if exists "admins manage sponsor members" on public.sponsor_members;
create policy "admins manage sponsor members"
on public.sponsor_members
for all
to authenticated
using (public.is_admin())
with check (public.is_admin());

-- 4) STANDS: los stands de Sponsors no los puede tomar un expositor, y nadie
--    que no sea admin puede marcar/desmarcar un stand como de Sponsors.
--    La función register_sponsor() levanta la marca 'app.sponsor_flow' solo
--    durante su transacción para poder tomar el stand.
create or replace function public.protect_stand_columns()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if public.is_admin() or current_setting('app.sponsor_flow', true) = 'on' then
    return new;
  end if;

  if new.price is distinct from old.price
     or new.number is distinct from old.number
     or new.x is distinct from old.x
     or new.y is distinct from old.y
     or new.event_id is distinct from old.event_id
     or new.sector is distinct from old.sector
     or new.is_sponsor_stand is distinct from old.is_sponsor_stand
  then
    raise exception 'No tenés permiso para modificar esos campos del stand.';
  end if;

  if old.status = 'available' and new.status = 'pending' then
    if old.is_sponsor_stand then
      raise exception 'Este stand está reservado para Sponsors.';
    end if;
    if not public.can_participate(old.event_id, auth.uid()) then
      raise exception 'Este evento es con confirmación: el organizador tiene que aprobar tu solicitud antes de que puedas reservar.';
    end if;
  end if;

  return new;
end;
$$;

-- 5) RESERVAS: igual que antes, más: no se puede reservar (ni pegándole a la
--    API directo) un stand reservado para Sponsors.
create or replace function public.protect_reservation_columns()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  stand_price numeric;
  stand_event uuid;
  stand_sponsor boolean;
begin
  if public.is_admin() then
    return new;
  end if;

  if tg_op = 'INSERT' then
    if new.status is distinct from 'pending' then
      raise exception 'Una reserva nueva tiene que empezar en estado pendiente.';
    end if;

    select price, event_id, is_sponsor_stand into stand_price, stand_event, stand_sponsor
    from public.stands where id = new.stand_id;
    if stand_price is null
       or (new.amount is distinct from stand_price and new.amount is distinct from stand_price / 2)
    then
      raise exception 'El importe no coincide con el precio del stand.';
    end if;

    if stand_sponsor then
      raise exception 'Este stand está reservado para Sponsors.';
    end if;

    if new.event_id is distinct from stand_event then
      raise exception 'El stand no pertenece a ese evento.';
    end if;

    if not public.can_participate(new.event_id, auth.uid()) then
      raise exception 'Este evento es con confirmación: el organizador tiene que aprobar tu solicitud antes de que puedas reservar.';
    end if;

    return new;
  end if;

  if new.status is distinct from old.status
     or new.amount is distinct from old.amount
     or new.payment_type is distinct from old.payment_type
     or new.user_id is distinct from old.user_id
     or new.stand_id is distinct from old.stand_id
     or new.event_id is distinct from old.event_id
     or new.paid_at is distinct from old.paid_at
  then
    raise exception 'No tenés permiso para modificar esos campos de la reserva.';
  end if;

  return new;
end;
$$;

-- 6) Si el admin elimina el registro de un Sponsor, el stand vuelve a quedar libre.
create or replace function public.free_sponsor_stand()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  perform set_config('app.sponsor_flow', 'on', true);
  update public.stands set status = 'available', category_id = null where id = old.stand_id;
  return old;
end;
$$;

drop trigger if exists free_sponsor_stand_trg on public.sponsor_registrations;
create trigger free_sponsor_stand_trg
after delete on public.sponsor_registrations
for each row execute function public.free_sponsor_stand();

-- 7) Validar un código (lo puede llamar cualquiera, incluso sin cuenta).
--    Devuelve el evento y sus stands de Sponsors, o falla con un mensaje claro.
create or replace function public.sponsor_lookup(p_code text)
returns jsonb
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  cfg public.event_sponsor_settings;
  ev public.events;
begin
  if p_code is null or btrim(p_code) = '' then
    raise exception 'Ingresá el código de Sponsor.';
  end if;

  select * into cfg
  from public.event_sponsor_settings
  where enabled and upper(btrim(code)) = upper(btrim(p_code));

  if not found then
    raise exception 'El código de Sponsor no es válido.';
  end if;

  select * into ev from public.events where id = cfg.event_id;
  if not found or ev.status = 'past' then
    raise exception 'El código de Sponsor no es válido.';
  end if;

  return jsonb_build_object(
    'event_id', ev.id,
    'event_name', ev.name,
    'date', ev.date,
    'end_date', ev.end_date,
    'location', ev.location,
    'sponsor_image', coalesce(ev.map_image->>'sponsor', cfg.image),
    'stands', coalesce((
      select jsonb_agg(
        jsonb_build_object('id', s.id, 'number', s.number, 'sector', s.sector, 'status', s.status, 'x', s.x, 'y', s.y)
        order by s.number
      )
      from public.stands s
      where s.event_id = ev.id and s.is_sponsor_stand
    ), '[]'::jsonb)
  );
end;
$$;

-- 8) Registrar al Sponsor: valida el código, toma el stand de forma atómica
--    (dos Sponsors no pueden quedarse con el mismo) y guarda los integrantes.
--    Sin importe ni pago: el stand es gratis.
create or replace function public.register_sponsor(p_code text, p_stand_id uuid, p_members jsonb)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  cfg public.event_sponsor_settings;
  ev public.events;
  m jsonb;
  reg_id uuid;
  taken uuid;
  bd date;
  i int := 0;
begin
  if auth.uid() is null then
    raise exception 'Tenés que iniciar sesión para registrarte como Sponsor.';
  end if;

  select * into cfg
  from public.event_sponsor_settings
  where enabled and upper(btrim(code)) = upper(btrim(p_code));
  if not found then
    raise exception 'El código de Sponsor no es válido.';
  end if;

  select * into ev from public.events where id = cfg.event_id;
  if not found or ev.status = 'past' then
    raise exception 'El código de Sponsor no es válido.';
  end if;

  if p_members is null or jsonb_typeof(p_members) <> 'array' or jsonb_array_length(p_members) = 0 then
    raise exception 'Cargá al menos un integrante.';
  end if;

  for m in select * from jsonb_array_elements(p_members) loop
    if btrim(coalesce(m->>'first_name', '')) = ''
       or btrim(coalesce(m->>'last_name', '')) = ''
       or btrim(coalesce(m->>'dni', '')) = ''
       or btrim(coalesce(m->>'phone', '')) = ''
       or btrim(coalesce(m->>'email', '')) = ''
    then
      raise exception 'Completá nombre, apellido, DNI, teléfono y mail de todos los integrantes.';
    end if;
    if position('@' in m->>'email') = 0 then
      raise exception 'Hay un mail de integrante que no es válido.';
    end if;

    -- Fecha de nacimiento: obligatoria, con formato válido, no futura.
    if btrim(coalesce(m->>'birth_date', '')) = '' then
      raise exception 'Completá la fecha de nacimiento de todos los integrantes.';
    end if;
    begin
      bd := (m->>'birth_date')::date;
    exception when others then
      raise exception 'Hay una fecha de nacimiento que no es válida.';
    end;
    if bd > current_date or bd < date '1900-01-01' then
      raise exception 'Hay una fecha de nacimiento que no es válida.';
    end if;
  end loop;

  perform set_config('app.sponsor_flow', 'on', true);

  -- Toma condicionada: solo si el stand es de Sponsors, es de este evento y
  -- sigue libre. Si otro se lo llevó antes, no toca ninguna fila.
  update public.stands
  set status = 'reserved'
  where id = p_stand_id and event_id = ev.id and is_sponsor_stand and status = 'available'
  returning id into taken;

  if taken is null then
    raise exception 'Ese stand ya no está disponible. Elegí otro.';
  end if;

  insert into public.sponsor_registrations (event_id, stand_id, user_id)
  values (ev.id, p_stand_id, auth.uid())
  returning id into reg_id;

  for m in select * from jsonb_array_elements(p_members) loop
    insert into public.sponsor_members (registration_id, first_name, last_name, dni, phone, email, birth_date, position)
    values (
      reg_id,
      btrim(m->>'first_name'), btrim(m->>'last_name'), btrim(m->>'dni'),
      btrim(m->>'phone'), btrim(m->>'email'), (m->>'birth_date')::date, i
    );
    i := i + 1;
  end loop;

  return jsonb_build_object('registration_id', reg_id, 'event_id', ev.id, 'event_name', ev.name, 'stand_id', p_stand_id);
end;
$$;

revoke all on function public.sponsor_lookup(text) from public;
revoke all on function public.register_sponsor(text, uuid, jsonb) from public;
grant execute on function public.sponsor_lookup(text) to anon, authenticated;
grant execute on function public.register_sponsor(text, uuid, jsonb) to authenticated;

-- 9) Tiempo real: el admin ve llegar los Sponsors sin recargar.
do $$
begin
  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'sponsor_registrations'
  ) then
    alter publication supabase_realtime add table public.sponsor_registrations;
  end if;
end $$;

-- ============================================================================
-- 10) SEPARACIÓN ENTRE EXPOSITORES Y SPONSORS
-- ============================================================================
-- Una cuenta de Sponsor solo ve/usa lo de Sponsors, y una de expositor no ve
-- ni puede tomar nada de Sponsors. Se aplica en la base, no solo en pantalla.

-- ¿Esta cuenta es de un Sponsor? (tiene un registro de Sponsor)
create or replace function public.is_sponsor_account(p_user_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (select 1 from public.sponsor_registrations r where r.user_id = p_user_id);
$$;

-- La imagen del mapa de Sponsors vive en event_sponsor_settings.image (solo la
-- lee el admin); si quedó guardada en events.map_image se pasa para allá y se
-- saca de ahí, porque events es de lectura pública.
update public.event_sponsor_settings s
set image = coalesce(s.image, e.map_image->>'sponsor')
from public.events e
where e.id = s.event_id and e.map_image ? 'sponsor';

update public.events set map_image = map_image - 'sponsor' where map_image ? 'sponsor';

-- Stands: los de Sponsors no los ve nadie salvo el admin y el Sponsor dueño;
-- y a una cuenta de Sponsor no se le muestran los stands de expositores.
-- Las políticas se SUMAN entre sí: si quedara cualquier otra política de lectura
-- de stands más permisiva, ignoraría estas reglas. Por eso se eliminan todas las
-- de lectura (SELECT) de stands antes de crear las nuevas.
do $$
declare pol record;
begin
  for pol in
    select policyname from pg_policies
    where schemaname = 'public' and tablename = 'stands' and cmd = 'SELECT'
  loop
    execute format('drop policy if exists %I on public.stands', pol.policyname);
  end loop;
end $$;

create policy "anyone can read stands"
on public.stands
for select
to anon
using (sector <> 'sponsor');

create policy "authenticated users can read stands"
on public.stands
for select
to authenticated
using (
  public.is_admin()
  or (sector <> 'sponsor' and not (select public.is_sponsor_account(auth.uid())))
  or (
    sector = 'sponsor'
    and exists (
      select 1 from public.sponsor_registrations r
      where r.stand_id = stands.id and r.user_id = auth.uid()
    )
  )
);

-- Una cuenta de Sponsor no puede tomar stands ni reservar (aunque le peguen
-- directo a la API). register_sponsor() levanta 'app.sponsor_flow'.
create or replace function public.block_sponsor_taking_stand()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if public.is_admin() or current_setting('app.sponsor_flow', true) = 'on' then
    return new;
  end if;
  if old.status = 'available' and new.status = 'pending' and public.is_sponsor_account(auth.uid()) then
    raise exception 'Las cuentas de Sponsor no pueden reservar stands de expositores.';
  end if;
  return new;
end;
$$;

drop trigger if exists a2_block_sponsor_taking_stand on public.stands;
create trigger a2_block_sponsor_taking_stand
before update on public.stands
for each row execute function public.block_sponsor_taking_stand();

create or replace function public.block_sponsor_reservation()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if not public.is_admin() and public.is_sponsor_account(auth.uid()) then
    raise exception 'Las cuentas de Sponsor no pueden reservar stands de expositores.';
  end if;
  return new;
end;
$$;

drop trigger if exists a2_block_sponsor_reservation on public.reservations;
create trigger a2_block_sponsor_reservation
before insert on public.reservations
for each row execute function public.block_sponsor_reservation();

-- Y al revés: una cuenta de expositor (o admin) no puede registrarse como Sponsor.
create or replace function public.block_exhibitor_as_sponsor()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if public.is_admin() then
    raise exception 'Una cuenta de administrador no puede registrarse como Sponsor.';
  end if;
  if exists (select 1 from public.reservations x where x.user_id = new.user_id)
     or exists (select 1 from public.event_requests q where q.user_id = new.user_id) then
    raise exception 'Esta cuenta ya es de expositor. Para registrarte como Sponsor usá otra cuenta (otro mail).';
  end if;
  return new;
end;
$$;

drop trigger if exists a2_block_exhibitor_as_sponsor on public.sponsor_registrations;
create trigger a2_block_exhibitor_as_sponsor
before insert on public.sponsor_registrations
for each row execute function public.block_exhibitor_as_sponsor();
