-- ============================================================================
-- DÍAS DE ASISTENCIA POR RESERVA (eventos de varios días)
-- Ejecutar en Supabase Dashboard > SQL Editor (se puede repetir sin problema).
-- Requiere haber ejecutado antes: supabase-security-fixes.sql.
-- No cambia nada de lo que ven o hacen los expositores en eventos de un solo día.
-- ============================================================================
-- Cuando un evento dura varios días, el expositor ahora puede elegir en cuáles
-- va a estar con su stand (por ejemplo, solo el primer día de dos). Se guarda
-- como una lista de fechas ("YYYY-MM-DD") en reservations.days.
--
-- days = null significa "todos los días del evento" (así quedan las reservas
-- de antes de este cambio, y las de eventos de un solo día).
-- ============================================================================

alter table public.reservations add column if not exists days jsonb;

-- Por evento: si el organizador NO habilita esto, todos los expositores se
-- asumen presentes todos los días (como hasta ahora) y ni se les pregunta.
-- Por defecto queda apagado, así los eventos ya creados (y los nuevos) no
-- cambian de comportamiento solos.
alter table public.events add column if not exists allow_partial_days boolean not null default false;

-- Solo el admin puede tocar esta columna después de creada la reserva (el
-- expositor la fija al reservar y no hay pantalla para cambiarla sola; si
-- necesita corregirla, lo hace el organizador).
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

    -- Días elegidos: tienen que ser fechas reales del evento.
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

  -- UPDATE: un usuario no-admin no puede cambiar estado, importe, tipo de
  -- pago, ni a quién/qué stand pertenece la reserva, ni los días elegidos.
  if new.status is distinct from old.status
     or new.amount is distinct from old.amount
     or new.payment_type is distinct from old.payment_type
     or new.user_id is distinct from old.user_id
     or new.stand_id is distinct from old.stand_id
     or new.event_id is distinct from old.event_id
     or new.paid_at is distinct from old.paid_at
     or new.days is distinct from old.days
  then
    raise exception 'No tenés permiso para modificar esos campos de la reserva.';
  end if;

  return new;
end;
$$;
