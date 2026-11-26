-- ============================================================================
-- EL VISUALIZADOR TAMBIÉN PUEDE HACER "CARGA RÁPIDA" DE RESERVAS Y AGREGAR
-- DATOS DE SEGURO (titular/acompañante) — siempre queda registrado quién lo
-- cargó (created_by), para poder diferenciarlo de lo que carga un admin.
-- Ejecutar en Supabase Dashboard > SQL Editor (se puede repetir sin problema).
-- ============================================================================

-- 1) Quién cargó la reserva/el seguro (null = lo hizo el propio expositor).
alter table public.reservations add column if not exists created_by uuid references public.profiles(id);
alter table public.reservation_insurance add column if not exists created_by uuid references public.profiles(id);

-- 2) Insertar reservation_insurance ya estaba limitado a "admins manage
-- insurance" (ALL, solo is_admin()). Se suma una policy adicional de INSERT
-- para que el visualizador también pueda cargar seguros — pero no pisar,
-- borrar ni marcar cobrado lo que ya cargó otro (eso sigue siendo solo admin).
drop policy if exists "staff can add insurance" on public.reservation_insurance;
create policy "staff can add insurance"
on public.reservation_insurance
for insert
to authenticated
with check (public.is_staff());

-- Nota: "reservations" (INSERT), "stands" (UPDATE) y "profiles" (INSERT) ya
-- permiten al visualizador cargar una reserva rápida completa gracias a las
-- policies de supabase-viewer-manage-stands.sql y
-- supabase-viewer-requests-and-users.sql corridas antes.
