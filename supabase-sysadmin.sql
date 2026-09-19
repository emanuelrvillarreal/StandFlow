-- ============================================================================
-- SYSADMIN: eliminación definitiva de cuentas
-- Ejecutar en Supabase Dashboard > SQL Editor (se puede repetir sin problema).
-- Requiere haber ejecutado antes: supabase-security-fixes.sql y supabase-stand-limit.sql.
-- ============================================================================
-- Hay dos niveles:
--   1) Borrado LÓGICO (lo puede hacer cualquier admin): la cuenta se da de baja
--      (role_id = -1). No puede ingresar y deja de verse, pero sigue existiendo.
--   2) Borrado DEFINITIVO (solo un sysadmin): elimina la cuenta de la base,
--      incluido el sistema de usuarios, así el mail queda libre. Solo se puede
--      hacer sobre cuentas que ya estén dadas de baja.
--
-- Un sysadmin es un administrador con la marca is_sysadmin. Solo otro sysadmin
-- (o el SQL Editor) puede otorgar o quitar esa marca.
--
-- IMPORTANTE - dar de alta al primer sysadmin (una sola vez, desde el SQL Editor):
--   update public.profiles set is_sysadmin = true where email = 'TU-MAIL-DE-ADMIN';
-- ============================================================================

alter table public.profiles add column if not exists is_sysadmin boolean not null default false;

-- ¿Es sysadmin? (tiene que seguir siendo administrador)
create or replace function public.is_sysadmin(p_user_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.profiles
    where id = p_user_id and role_id = 1 and is_sysadmin
  );
$$;

-- Protección de perfiles: además de lo que ya bloqueaba, nadie puede darse o
-- quitar la marca de sysadmin (ni modificar/bloquear/dar de baja a un sysadmin)
-- salvo otro sysadmin. auth.uid() nulo = SQL Editor.
create or replace function public.protect_profile_columns()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.is_sysadmin is distinct from old.is_sysadmin
     and auth.uid() is not null
     and not public.is_sysadmin(auth.uid())
  then
    raise exception 'Solo un sysadmin puede otorgar o quitar el rol de sysadmin.';
  end if;

  if old.is_sysadmin
     and auth.uid() is not null
     and auth.uid() <> old.id
     and not public.is_sysadmin(auth.uid())
     and (new.role_id is distinct from old.role_id
          or new.role is distinct from old.role
          or new.is_blocked is distinct from old.is_blocked)
  then
    raise exception 'No podés modificar la cuenta de un sysadmin.';
  end if;

  if public.is_admin() then
    return new;
  end if;

  if new.role_id is distinct from old.role_id
     or new.role is distinct from old.role
     or new.is_blocked is distinct from old.is_blocked
     or new.blocked_reason is distinct from old.blocked_reason
     or new.blocked_at is distinct from old.blocked_at
     or new.email is distinct from old.email
     or new.max_stands is distinct from old.max_stands
  then
    raise exception 'No tenés permiso para modificar esos campos del perfil.';
  end if;

  return new;
end;
$$;

-- Eliminación definitiva de una cuenta.
create or replace function public.purge_user_account(p_user_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  prof public.profiles;
  n_sponsor integer := 0;
  n_res integer := 0;
  n_req integer := 0;
begin
  if auth.uid() is null or not public.is_sysadmin(auth.uid()) then
    raise exception 'Solo un sysadmin puede eliminar cuentas definitivamente.';
  end if;

  if p_user_id = auth.uid() then
    raise exception 'No podés eliminar tu propia cuenta.';
  end if;

  select * into prof from public.profiles where id = p_user_id;
  if not found then
    raise exception 'La cuenta no existe.';
  end if;

  if prof.is_sysadmin then
    raise exception 'No se puede eliminar la cuenta de un sysadmin.';
  end if;

  if prof.role_id is distinct from -1 then
    raise exception 'Primero hay que dar de baja la cuenta (borrado lógico); recién después se puede eliminar definitivamente.';
  end if;

  -- Resguardo de finanzas: una cuenta con pagos registrados no se borra.
  if exists (
    select 1 from public.reservations
    where user_id = p_user_id and status in ('paid', 'deposit_paid')
  ) then
    raise exception 'Esta cuenta tiene reservas pagadas o con seña: no se puede eliminar definitivamente para no perder el registro de los pagos.';
  end if;

  -- Los stands que tenía vuelven a quedar libres (los triggers se encargan).
  delete from public.sponsor_registrations where user_id = p_user_id;
  get diagnostics n_sponsor = row_count;

  delete from public.reservations where user_id = p_user_id;
  get diagnostics n_res = row_count;

  delete from public.event_requests where user_id = p_user_id;
  get diagnostics n_req = row_count;

  delete from public.profiles where id = p_user_id;
  delete from auth.users where id = p_user_id;

  return jsonb_build_object(
    'user_id', p_user_id,
    'email', prof.email,
    'reservas_eliminadas', n_res,
    'solicitudes_eliminadas', n_req,
    'registros_sponsor_eliminados', n_sponsor
  );
end;
$$;

revoke all on function public.purge_user_account(uuid) from public;
revoke all on function public.purge_user_account(uuid) from anon;
grant execute on function public.purge_user_account(uuid) to authenticated;
