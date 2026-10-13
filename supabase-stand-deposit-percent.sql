-- ============================================================================
-- % DE SEÑA POR STAND INDIVIDUAL (pisa el % general del evento)
-- Ejecutar en Supabase Dashboard > SQL Editor (se puede repetir sin problema).
-- ============================================================================
-- Hoy el % de seña es uno solo por evento (events.deposit_percent). Esto
-- agrega un % opcional POR STAND: si un stand tiene este valor, se usa en
-- vez del general del evento (ej: la mayoría al 25%, pero un puñado de
-- stands puntuales al 50%, sin importar de qué categoría sean).
-- ============================================================================

alter table public.stands add column if not exists deposit_percent integer;
