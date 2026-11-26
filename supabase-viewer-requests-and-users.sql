-- ============================================================================
-- EL VISUALIZADOR TAMBIÉN PUEDE ACEPTAR/RECHAZAR SOLICITUDES Y CREAR/EDITAR
-- USUARIOS (expositores y otros visualizadores) — nunca administradores.
-- Ejecutar en Supabase Dashboard > SQL Editor (se puede repetir sin problema).
-- ============================================================================

-- 1) Solicitudes de stand: aprobar/rechazar/revocar/eliminar.
drop policy if exists "staff can manage requests" on public.event_requests;
create policy "staff can manage requests"
on public.event_requests
for update
to authenticated
using (public.is_staff())
with check (public.is_staff());

drop policy if exists "staff can delete requests" on public.event_requests;
create policy "staff can delete requests"
on public.event_requests
for delete
to authenticated
using (public.is_staff());

-- 2) Usuarios: el visualizador puede crear y editar perfiles, pero el
-- trigger de abajo le bloquea tocar o crear administradores (role_id = 1).
drop policy if exists "staff can insert profiles" on public.profiles;
create policy "staff can insert profiles"
on public.profiles
for insert
to authenticated
with check (public.is_staff());

drop policy if exists "staff can update profiles" on public.profiles;
create policy "staff can update profiles"
on public.profiles
for update
to authenticated
using (public.is_staff())
with check (public.is_staff());

-- El trigger que protege role_id/role/is_blocked/email/max_stands al EDITAR
-- un perfil existente solo dejaba pasar al admin; ahora también al
-- visualizador, salvo que la fila sea (o pase a ser) un administrador.
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

  if public.is_staff() then
    if old.role_id = 1 or new.role_id = 1 then
      raise exception 'El Visualizador no puede crear ni modificar administradores.';
    end if;
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

-- Mismo criterio al CREAR un perfil nuevo (no había trigger de protección acá:
-- la policy de insert solo dejaba crear la propia fila o al admin cualquiera).
create or replace function public.protect_profile_insert()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if public.is_admin() then
    return new;
  end if;

  if public.is_staff() then
    if new.role_id = 1 then
      raise exception 'El Visualizador no puede crear administradores.';
    end if;
    return new;
  end if;

  -- Alguien autenticándose por su cuenta (no admin, no visualizador) solo
  -- puede crear su propia fila como expositor común.
  if new.role_id is distinct from 2 then
    raise exception 'No tenés permiso para crear ese tipo de cuenta.';
  end if;

  return new;
end;
$$;

drop trigger if exists a1_protect_profile_insert on public.profiles;
create trigger a1_protect_profile_insert
before insert on public.profiles
for each row execute function public.protect_profile_insert();
