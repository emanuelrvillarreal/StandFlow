-- ============================================================================
-- PAUSAR SOLICITUDES NUEVAS POR EVENTO
-- Ejecutar en Supabase Dashboard > SQL Editor (se puede repetir sin problema).
-- ============================================================================
-- Permite al organizador frenar la entrada de solicitudes nuevas en un evento
-- "con confirmación" (por ejemplo si entraron muchas y necesita ponerse al día
-- procesándolas). No afecta a las solicitudes que ya existen: el admin las
-- sigue pudiendo aprobar o rechazar normalmente, solo se bloquean las nuevas.
-- ============================================================================

alter table public.events add column if not exists requests_paused boolean not null default false;

-- El insert de una solicitud nueva lo hace el propio expositor (ver
-- supabase-approval-flow.sql: "users create own pending requests"). Se agrega
-- la condición de que el evento no esté pausado.
drop policy if exists "users create own pending requests" on public.event_requests;
create policy "users create own pending requests"
on public.event_requests
for insert
to authenticated
with check (
  user_id = auth.uid()
  and status = 'pending'
  and not exists (
    select 1 from public.events e where e.id = event_id and e.requests_paused
  )
);
