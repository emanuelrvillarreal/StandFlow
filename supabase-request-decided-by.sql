-- ============================================================================
-- QUIÉN APROBÓ/RECHAZÓ CADA SOLICITUD DE STAND
-- Ejecutar en Supabase Dashboard > SQL Editor (se puede repetir sin problema).
-- ============================================================================
-- Guarda qué admin tomó la decisión (aprobar/rechazar) en cada solicitud,
-- para que cualquier admin pueda ver quién la resolvió. No hace falta tocar
-- las policies: la de "admins manage requests" (for all) ya cubre escribir
-- esta columna, y "users read own requests and admins read all" ya cubre
-- leerla.
-- ============================================================================

alter table public.event_requests add column if not exists decided_by uuid references auth.users(id) on delete set null;
