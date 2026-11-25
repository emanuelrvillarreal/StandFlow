-- ============================================================================
-- SEGURO DE STAND: titular + acompañante(s)
-- SOLO LOCAL por ahora. No ejecutar en producción hasta que el usuario confirme.
-- Requiere haber ejecutado antes: supabase-rls-policies.sql,
-- supabase-security-fixes.sql, supabase-finalizado-visible-viewer.sql (is_staff()).
-- ============================================================================
-- Al reservar un stand, el expositor tiene que cargar los datos de seguro del
-- titular y, si corresponde, de UN acompañante. Si tiene más de un
-- acompañante, el resto los carga el administrador a mano (y los cobra aparte).

create table if not exists public.reservation_insurance (
  id uuid primary key default gen_random_uuid(),
  reservation_id uuid not null references public.reservations(id) on delete cascade,
  role text not null check (role in ('titular', 'acompanante')),
  first_name text not null,
  last_name text not null,
  dni text not null,
  birth_date date not null,
  added_by_admin boolean not null default false,
  position int not null default 0,
  created_at timestamptz not null default now()
);

create index if not exists reservation_insurance_reservation_idx on public.reservation_insurance(reservation_id);

alter table public.reservation_insurance enable row level security;

-- Lectura: el dueño de la reserva ve la suya; admin y visualizador ven todas.
drop policy if exists "owner reads own insurance, staff all" on public.reservation_insurance;
create policy "owner reads own insurance, staff all"
on public.reservation_insurance
for select
to authenticated
using (
  public.is_staff()
  or exists (select 1 from public.reservations r where r.id = reservation_id and r.user_id = auth.uid())
);

-- Escritura directa (insert/update/delete): solo admin (para agregar
-- acompañantes extra, corregir datos, etc). El expositor escribe a través de
-- la función de abajo, que corre con permisos propios (SECURITY DEFINER).
drop policy if exists "admins manage insurance" on public.reservation_insurance;
create policy "admins manage insurance"
on public.reservation_insurance
for all
to authenticated
using (public.is_admin())
with check (public.is_admin());

-- El expositor carga el titular + (como máximo) un acompañante al reservar.
-- p_people: [{role, first_name, last_name, dni, birth_date}, ...]
create or replace function public.submit_reservation_insurance(p_reservation_id uuid, p_people jsonb)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  res public.reservations;
  p jsonb;
  bd date;
  i int := 0;
  titular_count int := 0;
begin
  select * into res from public.reservations where id = p_reservation_id;
  if not found then
    raise exception 'La reserva no existe.';
  end if;
  if res.user_id <> auth.uid() and not public.is_admin() then
    raise exception 'No tenés permiso para cargar el seguro de esta reserva.';
  end if;

  if p_people is null or jsonb_typeof(p_people) <> 'array' or jsonb_array_length(p_people) = 0 then
    raise exception 'Cargá al menos los datos del titular.';
  end if;
  if jsonb_array_length(p_people) > 2 and not public.is_admin() then
    raise exception 'Como máximo podés cargar el titular y un acompañante. Para más acompañantes, hablá con la organización.';
  end if;

  for p in select * from jsonb_array_elements(p_people) loop
    if coalesce(p->>'role', '') not in ('titular', 'acompanante') then
      raise exception 'Rol inválido.';
    end if;
    if p->>'role' = 'titular' then
      titular_count := titular_count + 1;
    end if;
    if btrim(coalesce(p->>'first_name', '')) = ''
       or btrim(coalesce(p->>'last_name', '')) = ''
       or btrim(coalesce(p->>'dni', '')) = ''
    then
      raise exception 'Completá nombre, apellido y DNI de todos.';
    end if;
    if btrim(coalesce(p->>'birth_date', '')) = '' then
      raise exception 'Completá la fecha de nacimiento de todos.';
    end if;
    begin
      bd := (p->>'birth_date')::date;
    exception when others then
      raise exception 'Hay una fecha de nacimiento que no es válida.';
    end;
    if bd > current_date or bd < date '1900-01-01' then
      raise exception 'Hay una fecha de nacimiento que no es válida.';
    end if;
  end loop;

  if titular_count <> 1 then
    raise exception 'Tiene que haber exactamente un titular.';
  end if;

  -- Reemplaza lo que haya cargado el expositor; no toca lo que agregó el admin a mano.
  delete from public.reservation_insurance where reservation_id = p_reservation_id and not added_by_admin;

  for p in select * from jsonb_array_elements(p_people) loop
    insert into public.reservation_insurance (reservation_id, role, first_name, last_name, dni, birth_date, added_by_admin, position)
    values (
      p_reservation_id, p->>'role', btrim(p->>'first_name'), btrim(p->>'last_name'), btrim(p->>'dni'),
      (p->>'birth_date')::date, public.is_admin(), i
    );
    i := i + 1;
  end loop;
end;
$$;

revoke all on function public.submit_reservation_insurance(uuid, jsonb) from public;
grant execute on function public.submit_reservation_insurance(uuid, jsonb) to authenticated;
