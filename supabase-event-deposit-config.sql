-- ============================================================================
-- SEÑA CONFIGURABLE POR EVENTO + OBSERVACIÓN AL RESERVAR
-- Ejecutar en Supabase Dashboard > SQL Editor (se puede repetir sin problema).
-- ============================================================================
-- Hasta ahora la seña era siempre el 50% del precio del stand, fijo en el
-- código. Ahora cada evento define su propio porcentaje (ej: 10%, 25%, 30%).
-- También se suma un campo de observación que ve el expositor al reservar.
-- ============================================================================

alter table public.events add column if not exists deposit_percent integer not null default 50
  check (deposit_percent > 0 and deposit_percent < 100);
alter table public.events add column if not exists reservation_note text;

-- El trigger que valida el importe al crear una reserva tenía el 50% fijo
-- (stand_price / 2). Ahora usa el porcentaje de seña del evento.
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
  ev_date date;
  ev_end date;
  ev_deposit_pct integer;
  deposit_amount numeric;
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

    select coalesce(deposit_percent, 50) into ev_deposit_pct from public.events where id = stand_event;
    deposit_amount := round(stand_price * ev_deposit_pct / 100.0);

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
$$;
