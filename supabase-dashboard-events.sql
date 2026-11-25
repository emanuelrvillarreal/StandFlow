-- ============================================================================
-- DASHBOARD POR EVENTO + MOVIMIENTOS MANUALES CON EVENTO
-- SOLO LOCAL por ahora. No ejecutar en producción hasta que el usuario confirme.
-- ============================================================================
-- Los movimientos manuales de Finanzas (ingresos/egresos cargados a mano) no
-- tenían evento. Para poder separar la plata del Dashboard por evento, cada
-- movimiento manual puede (opcionalmente) quedar ligado a uno. Si no se elige
-- ninguno, queda "general" (null) y se sigue contando en el total combinado.
alter table public.expenses add column if not exists event_id uuid references public.events(id) on delete set null;
create index if not exists expenses_event_idx on public.expenses(event_id);
