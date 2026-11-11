-- ============================================================================
-- PONER EN $0 EL IMPORTE DE LAS RESERVAS DE N07, N08 Y N09a (Deckaria)
-- Ejecutar en Supabase Dashboard > SQL Editor.
-- ============================================================================

alter table public.reservations disable trigger protect_reservation_columns;

update public.reservations r
set amount = 0
from public.stands s, public.events e
where r.stand_id = s.id
  and r.event_id = e.id
  and e.name = 'Deckaria'
  and s.number in ('N07', 'N08', 'N09a')
  and r.status = 'pending';

alter table public.reservations enable trigger protect_reservation_columns;
