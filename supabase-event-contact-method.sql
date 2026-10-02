-- ============================================================================
-- CONTACTO DEL ORGANIZADOR POR EVENTO (WhatsApp / Mail / Los dos)
-- Ejecutar en Supabase Dashboard > SQL Editor (se puede repetir sin problema).
-- ============================================================================
-- Hasta ahora "Escribir a los organizadores" (cuando se rechaza una solicitud)
-- siempre abría WhatsApp. Ahora cada evento elige si ese botón usa WhatsApp,
-- mail, o los dos.
-- ============================================================================

alter table public.events add column if not exists organizer_email text;
alter table public.events add column if not exists contact_method text not null default 'whatsapp'
  check (contact_method in ('whatsapp', 'email', 'both'));
