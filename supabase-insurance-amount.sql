-- ============================================================================
-- MONTO A COBRAR POR SEGURO (titular/acompañante cargado a mano)
-- SOLO LOCAL por ahora. No ejecutar en producción hasta que el usuario confirme.
-- ============================================================================
-- Cuando el admin carga a mano un seguro que se olvidaron de registrar (o un
-- acompañante extra), puede anotar cuánto hay que cobrarle aparte (no forma
-- parte del precio del stand) y marcar cuándo se cobró, para tener la cuenta clara.
alter table public.reservation_insurance add column if not exists amount numeric;
alter table public.reservation_insurance add column if not exists paid boolean not null default false;
