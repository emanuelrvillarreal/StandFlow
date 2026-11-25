-- ============================================================================
-- VINCULAR SEGURO COBRADO CON UN INGRESO EN FINANZAS
-- SOLO LOCAL por ahora. No ejecutar en producción hasta que el usuario confirme.
-- ============================================================================
-- Al marcar un seguro como cobrado, se crea un ingreso manual en Finanzas
-- (ligado al mismo evento). Si se destilda, se borra ese ingreso. Esta columna
-- guarda cuál es, para poder encontrarlo y borrarlo.
alter table public.reservation_insurance add column if not exists expense_id uuid references public.expenses(id) on delete set null;
