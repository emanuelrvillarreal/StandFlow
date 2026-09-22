-- ============================================================================
-- FIX URGENTE: fuga de reservas ajenas
-- Ejecutar en Supabase Dashboard > SQL Editor cuanto antes (se puede repetir
-- sin problema).
-- ============================================================================
-- Cualquier cuenta de expositor podía leer TODAS las reservas de TODOS los
-- demás (quién pagó, cuánto, el stand) además de las suyas propias. La
-- política correcta ("users can read own reservations...") sigue estando,
-- pero quedó otra política de lectura más permisiva en la tabla, probablemente
-- una plantilla de Supabase ("Enable read access for all users") creada antes
-- de este proyecto o al configurar la tabla desde el panel.
--
-- En Postgres las políticas de RLS se SUMAN: alcanza con que UNA lo permita
-- para que la fila se vea, sin importar cuántas otras la restrinjan. Por eso
-- esta corrección no agrega una política más: elimina TODAS las de lectura
-- (SELECT) de reservations, sea cual sea su nombre, y deja solo la correcta.
-- ============================================================================

do $$
declare pol record;
begin
  for pol in
    select policyname from pg_policies
    where schemaname = 'public' and tablename = 'reservations' and cmd = 'SELECT'
  loop
    execute format('drop policy if exists %I on public.reservations', pol.policyname);
  end loop;
end $$;

create policy "users can read own reservations and admins can read all"
on public.reservations
for select
to authenticated
using (
  user_id = auth.uid()
  or public.is_admin()
);
