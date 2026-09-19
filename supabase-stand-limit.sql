-- ============================================================================
-- LÍMITE DE STANDS POR EXPOSITOR
-- Ejecutar en Supabase Dashboard > SQL Editor (se puede repetir sin problema).
-- Requiere haber ejecutado antes: supabase-security-fixes.sql.
-- ============================================================================
-- Regla: un expositor puede tener UN solo stand por evento. Solo el admin puede
-- darle a una cuenta un cupo mayor (perfil > max_stands). Los admins no tienen
-- límite.
--
-- Se aplica en la base (no solo en pantalla): no se puede saltear pegándole
-- directo a la API.
-- ============================================================================

-- 1) Cupo por usuario (1 por defecto). Lo cambia el admin desde Usuarios.
alter table public.profiles add column if not exists max_stands integer not null default 1;

do $$
begin
  if not exists (
    select 1 from pg_constraint where conname = 'profiles_max_stands_check'
  ) then
    alter table public.profiles add constraint profiles_max_stands_check check (max_stands >= 1);
  end if;
end $$;

-- 2) Quienes ya tenían más de un stand en un mismo evento conservan su cupo
--    actual, para no quedar "pasados" de golpe. Después el admin lo ajusta.
update public.profiles p
set max_stands = greatest(p.max_stands, c.n)
from (
  select user_id, max(n) as n
  from (
    select user_id, event_id, count(*) as n
    from public.reservations
    where status in ('pending', 'deposit_paid', 'paid', 'reserved')
    group by user_id, event_id
  ) t
  group by user_id
) c
where p.id = c.user_id and p.max_stands < c.n;

-- 3) Nadie salvo el admin puede cambiar su propio cupo.
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
     or new.max_stands is distinct from old.max_stands
  then
    raise exception 'No tenés permiso para modificar esos campos del perfil.';
  end if;

  return new;
end;
$$;

-- 4) Chequeo del cupo. Se usa al tomar el stand y al crear la reserva.
create or replace function public.assert_stand_quota(p_user_id uuid, p_event_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  quota integer;
  used integer;
begin
  -- Serializa los pedidos del mismo usuario en el mismo evento: así dos
  -- reservas simultáneas no se cuelan por encima del límite.
  perform pg_advisory_xact_lock(hashtext(p_user_id::text || ':' || p_event_id::text));

  select coalesce(max_stands, 1) into quota from public.profiles where id = p_user_id;
  quota := coalesce(quota, 1);

  select count(*) into used
  from public.reservations r
  where r.user_id = p_user_id
    and r.event_id = p_event_id
    and r.status in ('pending', 'deposit_paid', 'paid', 'reserved');

  if used >= quota then
    raise exception 'Ya tenés % en este evento. Cada expositor puede reservar % (si necesitás más, pedíselo a la organización).',
      case when used = 1 then 'tu stand' else used || ' stands' end,
      case when quota = 1 then 'un solo stand' else quota || ' stands' end;
  end if;
end;
$$;

-- Al tomar un stand libre (paso previo a crear la reserva).
create or replace function public.limit_stands_on_take()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if public.is_admin() or current_setting('app.sponsor_flow', true) = 'on' then
    return new;
  end if;
  if old.status = 'available' and new.status = 'pending' then
    perform public.assert_stand_quota(auth.uid(), old.event_id);
  end if;
  return new;
end;
$$;

drop trigger if exists a3_limit_stands_on_take on public.stands;
create trigger a3_limit_stands_on_take
before update on public.stands
for each row execute function public.limit_stands_on_take();

-- Al crear la reserva (por si alguien la inserta sin pasar por el stand).
create or replace function public.limit_stands_on_reserve()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if public.is_admin() then
    return new;
  end if;
  perform public.assert_stand_quota(new.user_id, new.event_id);
  return new;
end;
$$;

drop trigger if exists a3_limit_stands_on_reserve on public.reservations;
create trigger a3_limit_stands_on_reserve
before insert on public.reservations
for each row execute function public.limit_stands_on_reserve();
