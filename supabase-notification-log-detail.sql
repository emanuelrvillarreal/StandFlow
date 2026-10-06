-- ============================================================================
-- DETALLE DE LO QUE SE ENVIÓ EN CADA NOTIFICACIÓN (log de sysadmin)
-- Ejecutar en Supabase Dashboard > SQL Editor (se puede repetir sin problema).
-- ============================================================================
-- Guarda el asunto del mail y los datos relevantes (monto, stand, etc.) para
-- poder ver en el log qué fue exactamente lo que se mandó. No hace falta
-- tocar las policies: "admins manage requests"/las de notification_log ya
-- cubren escribir y leer esta columna nueva igual que el resto.
-- ============================================================================

alter table public.notification_log add column if not exists subject text;
alter table public.notification_log add column if not exists detail jsonb;
