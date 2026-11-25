-- ============================================================================
-- NOMBRE DEL EMPRENDIMIENTO EN EL MAPA (quién tiene un stand reservado)
-- SOLO LOCAL por ahora. No ejecutar en producción hasta que el usuario confirme.
-- ============================================================================
-- Un expositor no puede leer la reserva de otro (RLS), pero el nombre del
-- emprendimiento que eligió al reservar es información pública del mapa (se
-- ve en el stand, no hace falta ser admin). Esta función devuelve solo ese
-- nombre, nada más de la reserva.
create or replace function public.stand_occupant_name(p_stand_id uuid)
returns text
language sql
stable
security definer
set search_path = public
as $$
  select coalesce(nullif(btrim(r.stand_name), ''), nullif(btrim(p.business_name), ''), '')
  from public.reservations r
  left join public.profiles p on p.id = r.user_id
  where r.stand_id = p_stand_id
    and r.status in ('pending', 'deposit_paid', 'paid', 'reserved')
  order by r.created_at desc
  limit 1
$$;

revoke all on function public.stand_occupant_name(uuid) from public;
grant execute on function public.stand_occupant_name(uuid) to anon, authenticated;
