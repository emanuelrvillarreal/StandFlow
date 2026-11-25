-- ============================================================================
-- EL VISUALIZADOR TAMBIÉN PUEDE GESTIONAR STANDS (crear/editar/borrar/mover)
-- SOLO LOCAL por ahora. No ejecutar en producción hasta que el usuario confirme.
-- ============================================================================
-- Sigue sin poder ver montos de dinero (Dashboard los sigue ocultando,
-- Finanzas sigue sin aparecerle en el menú) ni tocar usuarios/eventos: esto
-- solo le suma permiso de escritura sobre los stands y los textos del mapa.
-- Se agrega como política ADICIONAL (no se toca "admins can manage stands").

drop policy if exists "staff can manage stands" on public.stands;
create policy "staff can manage stands"
on public.stands
for all
to authenticated
using (public.is_staff())
with check (public.is_staff());

drop policy if exists "staff can manage map labels" on public.map_labels;
create policy "staff can manage map labels"
on public.map_labels
for all
to authenticated
using (public.is_staff())
with check (public.is_staff());

-- El trigger que protege precio/número/posición/sector al EDITAR un stand
-- existente solo dejaba pasar al admin; ahora también al visualizador.
create or replace function public.protect_stand_columns()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if public.is_admin() or public.is_staff() or current_setting('app.sponsor_flow', true) = 'on' then
    return new;
  end if;

  if new.price is distinct from old.price
     or new.number is distinct from old.number
     or new.x is distinct from old.x
     or new.y is distinct from old.y
     or new.event_id is distinct from old.event_id
     or new.sector is distinct from old.sector
     or new.is_sponsor_stand is distinct from old.is_sponsor_stand
  then
    raise exception 'No tenés permiso para modificar esos campos del stand.';
  end if;

  if old.status = 'available' and new.status = 'pending' then
    if old.is_sponsor_stand then
      raise exception 'Este stand está reservado para Sponsors.';
    end if;
    if not public.can_participate(old.event_id, auth.uid()) then
      raise exception 'Este evento es con confirmación: el organizador tiene que aprobar tu solicitud antes de que puedas reservar.';
    end if;
  end if;

  return new;
end;
$$;
