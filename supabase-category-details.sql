-- ============================================================================
-- DETALLES DEL STAND POR CATEGORÍA (medidas, qué incluye/no incluye)
-- Ejecutar en Supabase Dashboard > SQL Editor (se puede repetir sin problema).
-- ============================================================================
-- Texto libre configurable por categoría (ej: "1,80 x 73, incluye 2 sillas
-- por mesa. No incluye corriente eléctrica. No incluye mantel."). Se muestra
-- al expositor cuando elige el stand, y además queda guardado tal cual en la
-- reserva (category_details) para que no cambie retroactivamente si después
-- se edita el texto de la categoría.
-- ============================================================================

alter table public.categories add column if not exists details text;
alter table public.reservations add column if not exists category_details text;
