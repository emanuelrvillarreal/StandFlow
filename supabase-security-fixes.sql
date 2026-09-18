-- ============================================================================
-- FIXES DE SEGURIDAD CRÍTICOS - Ejecutar en Supabase Dashboard > SQL Editor
-- ============================================================================
-- Se encontraron 3 agujeros reales, probados con una cuenta de expositor
-- común (no admin), sin usar la app, solo pegándole directo a la API:
--
-- 1) Cualquier usuario podía convertirse en administrador con un solo
--    pedido (PATCH a profiles seteando role_id=1).
-- 2) Cualquier usuario podía modificar el perfil de OTRO usuario
--    (la política de "update" en profiles no exigía que la fila fuera
--    la propia).
-- 3) Cualquier usuario podía crear una reserva marcada como "pagada" con
--    el importe que quisiera (ej: $1) y quedarse con el stand, sin pasar
--    por ningún control de precio ni de pago real.
--
-- Todo esto se probó en un stand real (se liberó después) y se revirtió
-- de inmediato. No se dejó nada roto, pero hasta correr este script el
-- agujero sigue abierto en producción.
-- ============================================================================

-- ── 1) PROFILES: nadie (salvo admin) toca su rol, bloqueo, ni el perfil ajeno ──

-- Reemplaza TODAS las políticas de profiles por un set limpio y correcto.
do $$
declare
  pol record;
begin
  for pol in
    select policyname from pg_policies
    where schemaname = 'public' and tablename = 'profiles'
  loop
    execute format('drop policy if exists %I on public.profiles', pol.policyname);
  end loop;
end;
$$;

create policy "select own profile or admin"
on public.profiles
for select
to authenticated
using (id = auth.uid() or public.is_admin());

create policy "insert own profile or admin"
on public.profiles
for insert
to authenticated
with check (id = auth.uid() or public.is_admin());

create policy "update own profile or admin"
on public.profiles
for update
to authenticated
using (id = auth.uid() or public.is_admin())
with check (id = auth.uid() or public.is_admin());

create policy "admins can delete profiles"
on public.profiles
for delete
to authenticated
using (public.is_admin());

-- Aunque la política de arriba ya exige "id = auth.uid()", este trigger
-- es la barrera real: bloquea que un usuario común (no admin) cambie
-- su propio rol, su bloqueo, o su email, aunque encuentre otra forma
-- de pasar el chequeo de fila.
create or replace function public.protect_profile_columns()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if public.is_admin() then
    return new;
  end if;

  if new.role_id is distinct from old.role_id
     or new.role is distinct from old.role
     or new.is_blocked is distinct from old.is_blocked
     or new.blocked_reason is distinct from old.blocked_reason
     or new.blocked_at is distinct from old.blocked_at
     or new.email is distinct from old.email
  then
    raise exception 'No tenés permiso para modificar esos campos del perfil.';
  end if;

  return new;
end;
$$;

drop trigger if exists protect_profile_columns on public.profiles;
create trigger protect_profile_columns
before update on public.profiles
for each row execute function public.protect_profile_columns();


-- ── 2) RESERVATIONS: el importe tiene que ser el precio real del stand,   ──
-- ──    y un usuario común no puede marcar su propia reserva como pagada  ──

create or replace function public.protect_reservation_columns()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  stand_price numeric;
begin
  if public.is_admin() then
    return new;
  end if;

  if tg_op = 'INSERT' then
    if new.status is distinct from 'pending' then
      raise exception 'Una reserva nueva tiene que empezar en estado pendiente.';
    end if;

    select price into stand_price from public.stands where id = new.stand_id;
    if stand_price is null
       or (new.amount is distinct from stand_price and new.amount is distinct from stand_price / 2)
    then
      raise exception 'El importe no coincide con el precio del stand.';
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

drop trigger if exists protect_reservation_columns on public.reservations;
create trigger protect_reservation_columns
before insert or update on public.reservations
for each row execute function public.protect_reservation_columns();


-- ── 3) STANDS: al reservar, un usuario no-admin no puede tocar el precio, ──
-- ──    la posición ni el número del stand (solo status/category_id)      ──

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

  return new;
end;
$$;

drop trigger if exists protect_stand_columns on public.stands;
create trigger protect_stand_columns
before update on public.stands
for each row execute function public.protect_stand_columns();
