-- ============================================================================
-- EVENTOS CON CONFIRMACIÓN: solicitudes de participación
-- Ejecutar en Supabase Dashboard > SQL Editor (una sola vez).
-- ============================================================================
-- Cada evento puede ser "libre" (como hasta ahora: cualquier expositor
-- registrado elige su stand) o "con confirmación": el expositor primero
-- solicita participar y el organizador aprueba o rechaza. Solo los aprobados
-- pueden reservar stands de ese evento.
--
-- La regla se aplica en la base de datos (no solo en la pantalla), así no se
-- puede saltear pegándole directo a la API.
-- ============================================================================

-- 1) Marca del evento (false = libre; los eventos existentes quedan libres).
alter table public.events add column if not exists requires_approval boolean not null default false;

-- 2) Solicitudes de participación.
create table if not exists public.event_requests (
  id uuid primary key default gen_random_uuid(),
  event_id uuid not null references public.events(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  status text not null default 'pending' check (status in ('pending', 'approved', 'rejected')),
  message text,
  created_at timestamptz not null default now(),
  decided_at timestamptz,
  unique (event_id, user_id)
);

create index if not exists event_requests_event_idx on public.event_requests(event_id);
create index if not exists event_requests_user_idx on public.event_requests(user_id);

alter table public.event_requests enable row level security;

drop policy if exists "users read own requests and admins read all" on public.event_requests;
create policy "users read own requests and admins read all"
on public.event_requests
for select
to authenticated
using (user_id = auth.uid() or public.is_admin());

-- Un expositor solo puede crear su propia solicitud, y siempre "pendiente":
-- aprobar/rechazar es exclusivo del admin.
drop policy if exists "users create own pending requests" on public.event_requests;
create policy "users create own pending requests"
on public.event_requests
for insert
to authenticated
with check (user_id = auth.uid() and status = 'pending');

drop policy if exists "admins manage requests" on public.event_requests;
create policy "admins manage requests"
on public.event_requests
for all
to authenticated
using (public.is_admin())
with check (public.is_admin());

-- 3) ¿Puede este usuario participar (reservar) en este evento?
--    - evento libre                          -> sí
--    - solicitud aprobada                    -> sí
--    - ya tenía una reserva activa en el evento y NO lo rechazaron (así, al
--      pasar un evento a "con confirmación", quienes ya reservaron no quedan
--      afuera) -> sí
--    - si el admin lo rechazó/revocó, el rechazo gana aunque tenga reservas
--      (sus reservas se mantienen, pero no puede tomar más stands)
create or replace function public.can_participate(p_event_id uuid, p_user_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select
    not coalesce((select e.requires_approval from public.events e where e.id = p_event_id), false)
    or exists (
      select 1 from public.event_requests r
      where r.event_id = p_event_id and r.user_id = p_user_id and r.status = 'approved'
    )
    or (
      not exists (
        select 1 from public.event_requests r
        where r.event_id = p_event_id and r.user_id = p_user_id and r.status = 'rejected'
      )
      and exists (
        select 1 from public.reservations x
        where x.event_id = p_event_id and x.user_id = p_user_id
          and x.status in ('pending', 'deposit_paid', 'paid', 'reserved')
      )
    );
$$;

-- 4) RESERVAS: además de lo que ya validaba (estado pendiente, importe = precio
--    del stand), ahora el stand tiene que pertenecer al evento indicado y el
--    usuario tiene que poder participar en ese evento.
create or replace function public.protect_reservation_columns()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  stand_price numeric;
  stand_event uuid;
begin
  if public.is_admin() then
    return new;
  end if;

  if tg_op = 'INSERT' then
    if new.status is distinct from 'pending' then
      raise exception 'Una reserva nueva tiene que empezar en estado pendiente.';
    end if;

    select price, event_id into stand_price, stand_event from public.stands where id = new.stand_id;
    if stand_price is null
       or (new.amount is distinct from stand_price and new.amount is distinct from stand_price / 2)
    then
      raise exception 'El importe no coincide con el precio del stand.';
    end if;

    if new.event_id is distinct from stand_event then
      raise exception 'El stand no pertenece a ese evento.';
    end if;

    if not public.can_participate(new.event_id, auth.uid()) then
      raise exception 'Este evento es con confirmación: el organizador tiene que aprobar tu solicitud antes de que puedas reservar.';
    end if;

    return new;
  end if;

  -- UPDATE: un usuario no-admin no puede cambiar estado, importe, tipo de
  -- pago, ni a quién/qué stand pertenece la reserva.
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

-- 5) STANDS: además de no poder tocar precio/posición, un usuario sin
--    aprobación no puede ni siquiera "tomar" (available -> pending) un stand
--    de un evento con confirmación.
create or replace function public.protect_stand_columns()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if public.is_admin() then
    return new;
  end if;

  if new.price is distinct from old.price
     or new.number is distinct from old.number
     or new.x is distinct from old.x
     or new.y is distinct from old.y
     or new.event_id is distinct from old.event_id
     or new.sector is distinct from old.sector
  then
    raise exception 'No tenés permiso para modificar esos campos del stand.';
  end if;

  if old.status = 'available' and new.status = 'pending' then
    if not public.can_participate(old.event_id, auth.uid()) then
      raise exception 'Este evento es con confirmación: el organizador tiene que aprobar tu solicitud antes de que puedas reservar.';
    end if;
  end if;

  return new;
end;
$$;

-- 6) Tiempo real: el admin ve llegar las solicitudes al instante, y el
--    expositor ve cuándo se la aprueban.
alter publication supabase_realtime add table public.event_requests;
