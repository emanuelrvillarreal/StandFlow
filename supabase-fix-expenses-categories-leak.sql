-- ============================================================================
-- FIX URGENTE: expenses y categories sin protección
-- Ejecutar en Supabase Dashboard > SQL Editor cuanto antes (se puede repetir
-- sin problema).
-- ============================================================================
-- Ninguna de estas dos tablas tenía reglas de seguridad por fila (RLS)
-- habilitadas por este proyecto: probablemente se crearon desde el panel de
-- Supabase antes de que existiera este código, y quedaron sin protección
-- desde siempre (no es algo que se haya roto ahora).
--
-- expenses (Finanzas > "Registrar movimiento manual"): CUALQUIERA, incluso
-- sin iniciar sesión, podía leer todos los movimientos financieros, y
-- cualquier cuenta con sesión podía crear o borrar registros. Es una tabla
-- exclusiva del administrador: nadie más tiene que tocarla.
--
-- categories: se lee públicamente a propósito (nombre y color, se ven en el
-- mapa), pero cualquier cuenta con sesión podía crear o borrar categorías,
-- algo que solo el administrador debería poder hacer.
-- ============================================================================

-- 1) expenses: solo el administrador, para todo (leer, crear, modificar, borrar).
alter table public.expenses enable row level security;

do $$
declare pol record;
begin
  for pol in select policyname from pg_policies where schemaname = 'public' and tablename = 'expenses'
  loop
    execute format('drop policy if exists %I on public.expenses', pol.policyname);
  end loop;
end $$;

create policy "admins manage expenses"
on public.expenses
for all
to authenticated
using (public.is_admin())
with check (public.is_admin());

-- 2) categories: cualquiera puede leerlas (públicas a propósito); crear,
--    modificar o borrar queda solo para el administrador.
alter table public.categories enable row level security;

do $$
declare pol record;
begin
  for pol in select policyname from pg_policies where schemaname = 'public' and tablename = 'categories'
  loop
    execute format('drop policy if exists %I on public.categories', pol.policyname);
  end loop;
end $$;

create policy "anyone can read categories"
on public.categories
for select
to anon, authenticated
using (true);

create policy "admins manage categories"
on public.categories
for all
to authenticated
using (public.is_admin())
with check (public.is_admin());
