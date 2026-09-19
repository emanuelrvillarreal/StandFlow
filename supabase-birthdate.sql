-- ============================================================================
-- FECHA DE NACIMIENTO: expositores y Sponsors
-- Ejecutar en Supabase Dashboard > SQL Editor (se puede repetir sin problema).
-- Requiere haber ejecutado antes: supabase-sponsors.sql.
-- No cambia nada de lo que ven ni hacen hoy los expositores: solo agrega el dato.
-- ============================================================================

-- 1) Expositores: fecha de nacimiento en el perfil. Es opcional en la base (las
--    cuentas anteriores no la tienen); la pantalla de registro la exige y cada
--    expositor puede completarla desde "Mi perfil".
alter table public.profiles add column if not exists birth_date date;

-- Que la fecha sea razonable: no futura ni anterior a 1900.
create or replace function public.validate_birth_date()
returns trigger
language plpgsql
as $$
begin
  if new.birth_date is not null
     and (new.birth_date > current_date or new.birth_date < date '1900-01-01')
  then
    raise exception 'La fecha de nacimiento no es válida.';
  end if;
  return new;
end;
$$;

drop trigger if exists a5_validate_birth_date on public.profiles;
create trigger a5_validate_birth_date
before insert or update of birth_date on public.profiles
for each row execute function public.validate_birth_date();

-- 2) Sponsors: fecha de nacimiento de cada integrante (obligatoria al registrarse;
--    los registros anteriores quedan sin fecha).
alter table public.sponsor_members add column if not exists birth_date date;

-- El registro de Sponsor ahora exige y guarda la fecha de cada integrante.
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

revoke all on function public.register_sponsor(text, uuid, jsonb) from public;
grant execute on function public.register_sponsor(text, uuid, jsonb) to authenticated;
