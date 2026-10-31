-- ============================================================================
-- VOLVER A UNIR S09a+S09b -> S09 y S10a+S10b -> S10
-- Ejecutar en Supabase Dashboard > SQL Editor (prod). Probado antes en local.
-- ============================================================================
-- Toma la mitad "a" de cada par, le pone el número original, suma el precio
-- de las dos mitades y la ubica en el punto medio. Borra la mitad "b".
-- Queda en estado 'reserved' (bloqueada, sin usuario) para que nadie la
-- pueda elegir, tal como estaban las dos mitades antes de unirlas.
-- ============================================================================

alter table public.stands disable trigger protect_stand_columns;

do $$
declare
  pairs text[] := array['S09','S10'];
  n text;
  a record;
  b record;
begin
  foreach n in array pairs loop
    select * into a from public.stands where number = n || 'a';
    select * into b from public.stands where number = n || 'b';
    if a.id is null or b.id is null then
      raise notice 'Falta % o %, se salta %.', n || 'a', n || 'b', n;
      continue;
    end if;

    update public.stands
      set number = n, price = a.price + b.price, x = (a.x + b.x) / 2.0, status = 'reserved'
      where id = a.id;

    delete from public.stands where id = b.id;

    raise notice 'OK: % + % -> % (precio %)', n || 'a', n || 'b', n, a.price + b.price;
  end loop;
end $$;

alter table public.stands enable trigger protect_stand_columns;
