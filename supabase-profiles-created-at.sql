-- ============================================================================
-- FECHA DE REGISTRO DE CADA USUARIO
-- Ejecutar en Supabase Dashboard > SQL Editor (se puede repetir sin problema,
-- siempre vuelve a tomar la fecha real de auth.users).
-- ============================================================================
-- profiles no tenía fecha de alta. Se agrega la columna (sin default todavía,
-- para que el UPDATE la pueda completar con la fecha real) y se completa con
-- la fecha real de creación de la cuenta (auth.users.created_at). Recién al
-- final se le pone el default now(), para que las cuentas nuevas se
-- completen solas de ahí en adelante.
-- ============================================================================

alter table public.profiles add column if not exists created_at timestamptz;

update public.profiles p
set created_at = u.created_at
from auth.users u
where p.id = u.id;

alter table public.profiles alter column created_at set default now();
