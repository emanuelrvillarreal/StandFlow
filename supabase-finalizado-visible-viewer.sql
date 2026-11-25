-- ============================================================================
-- 1) Un evento "Finalizado" (status = 'past') bloquea reservas como si
--    estuviera pausado, sin tener que tocar el switch aparte.
-- 2) Switch de visibilidad del evento en la página pública de eventos.
-- 3) Rol "Visualizador": ve usuarios, stands, mapa, estado de pago — sin
--    poder crear/editar/borrar nada, y sin ver montos de dinero (lo de los
--    montos es una restricción de pantalla, no de la base: un visualizador
--    que supiera usar la API podría leer igual el importe. Si en algún
--    momento hace falta que ni la base se lo deje ver, avisame y lo hacemos
--    con una vista separada en vez de la tabla entera).
-- Ejecutar en Supabase Dashboard > SQL Editor. Probado antes en local.
-- ============================================================================

-- --- 1) Finalizado = reservas bloqueadas ------------------------------------
CREATE OR REPLACE FUNCTION public.protect_reservation_columns()
  RETURNS TRIGGER
  LANGUAGE plpgsql
  SECURITY DEFINER
  SET search_path TO 'public'
  AS $function$
declare
  stand_price numeric;
  stand_event uuid;
  stand_sponsor boolean;
  stand_deposit_pct integer;
  ev_date date;
  ev_end date;
  ev_deposit_pct integer;
  ev_reservations_paused boolean;
  ev_status text;
  effective_deposit_pct integer;
  deposit_amount numeric;
begin
  if public.is_admin() then
    return new;
  end if;

  if tg_op = 'INSERT' then
    if new.status is distinct from 'pending' then
      raise exception 'Una reserva nueva tiene que empezar en estado pendiente.';
    end if;

    select price, event_id, is_sponsor_stand, deposit_percent
      into stand_price, stand_event, stand_sponsor, stand_deposit_pct
    from public.stands where id = new.stand_id;

    select coalesce(deposit_percent, 50), coalesce(reservations_paused, false), status
      into ev_deposit_pct, ev_reservations_paused, ev_status
    from public.events where id = stand_event;

    if ev_reservations_paused then
      raise exception 'La organización pausó las reservas de este evento por ahora.';
    end if;

    if ev_status = 'past' then
      raise exception 'Este evento ya finalizó, no se pueden hacer reservas nuevas.';
    end if;

    effective_deposit_pct := coalesce(stand_deposit_pct, ev_deposit_pct, 50);
    deposit_amount := round(stand_price * effective_deposit_pct / 100.0);

    if stand_price is null
       or (new.amount is distinct from stand_price and new.amount is distinct from deposit_amount)
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

    if new.days is not null then
      if jsonb_typeof(new.days) <> 'array' or jsonb_array_length(new.days) = 0 then
        raise exception 'Elegí al menos un día para el stand.';
      end if;

      select date, coalesce(end_date, date) into ev_date, ev_end from public.events where id = new.event_id;

      if exists (
        select 1 from jsonb_array_elements_text(new.days) as d(day)
        where d.day !~ '^\d{4}-\d{2}-\d{2}$'
           or d.day::date < ev_date or d.day::date > ev_end
      ) then
        raise exception 'Hay un día elegido que no pertenece a las fechas del evento.';
      end if;
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
     or new.balance_paid_at is distinct from old.balance_paid_at
     or new.days is distinct from old.days
  then
    raise exception 'No tenés permiso para modificar esos campos de la reserva.';
  end if;

  return new;
end;
$function$;

-- --- 2) Visibilidad del evento en la página pública -------------------------
alter table public.events add column if not exists hidden_from_list boolean not null default false;

-- --- 3) Rol "Visualizador" ---------------------------------------------------
insert into public.roles (id, name) values (3, 'Visualizador')
  on conflict (id) do nothing;

create or replace function public.is_staff()
  returns boolean
  language sql
  security definer
  set search_path to 'public'
  as $$
  select exists (
    select 1 from public.profiles where id = auth.uid() and role_id in (1, 3)
  );
$$;

grant execute on function public.is_staff() to public, anon, authenticated;

-- Se agregan como políticas ADICIONALES (no reemplazan ninguna existente):
-- el admin ya podía leer todo, esto solo le suma el mismo permiso de lectura
-- al rol 3. No toca ningún permiso de escritura (esos siguen exigiendo
-- is_admin(), que sigue siendo solo rol 1).
drop policy if exists "staff can read profiles" on public.profiles;
create policy "staff can read profiles" on public.profiles
  for select to authenticated
  using (public.is_staff());

drop policy if exists "staff can read reservations" on public.reservations;
create policy "staff can read reservations" on public.reservations
  for select to authenticated
  using (public.is_staff());

drop policy if exists "staff can read attendance" on public.event_attendance;
create policy "staff can read attendance" on public.event_attendance
  for select to authenticated
  using (public.is_staff());

drop policy if exists "staff can read requests" on public.event_requests;
create policy "staff can read requests" on public.event_requests
  for select to authenticated
  using (public.is_staff());
