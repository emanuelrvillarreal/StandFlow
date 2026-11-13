-- ============================================================================
-- PERMITIR PORCENTAJES DE SEÑA CON DECIMALES (ej: 12.5%)
-- Ejecutar en Supabase Dashboard > SQL Editor. Probado antes en local.
-- ============================================================================
-- Las columnas estaban en "integer", por eso no se podía guardar un 12,5%
-- aunque se escribiera en el formulario. Se pasan a "numeric" (sin tocar los
-- valores existentes, solo cambia el tipo) para que admitan decimales.
-- ============================================================================

alter table public.events
  alter column deposit_percent type numeric using deposit_percent::numeric;

alter table public.stands
  alter column deposit_percent type numeric using deposit_percent::numeric;
