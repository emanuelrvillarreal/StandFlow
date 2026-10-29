-- ============================================================================
-- PARTIR 10 MESAS A LA MITAD (N01, N02, N03, N09, N10, S01, S02, S03, S09, S10)
-- Ejecutar en Supabase Dashboard > SQL Editor. Es seguro: ninguna de estas
-- 10 mesas tiene reserva activa al momento de escribir esto.
-- ============================================================================
-- Por cada mesa: la fila original se convierte en la mitad "a" (mismo id,
-- mitad de precio), y se crea una fila nueva para la mitad "b" (clon con la
-- otra mitad de precio, al lado). Mantienen el 50% de seña que ya tenían
-- configurado individualmente.
-- ============================================================================

-- El SQL Editor corre sin la sesión de admin de la app, así que el trigger
-- de seguridad que protege precio/número/posición del stand lo bloquea. Se
-- desactiva solo para esta operación puntual y se reactiva al final.
alter table public.stands disable trigger protect_stand_columns;

do $$
declare
  nums text[] := array['N01','N02','N03','N09','N10','S01','S02','S03','S09','S10'];
  n text;
  s record;
begin
  foreach n in array nums loop
    select * into s from public.stands where number = n limit 1;
    if s.id is null then
      raise notice 'No se encontró el stand %, se salta.', n;
      continue;
    end if;

    update public.stands
      set number = n || 'a', price = round(s.price / 2.0), x = s.x - 0.7
      where id = s.id;

    insert into public.stands (event_id, number, sector, x, y, price, status, category_id, is_sponsor_stand, deposit_percent)
      values (s.event_id, n || 'b', s.sector, s.x + 0.7, s.y, round(s.price / 2.0), 'available', s.category_id, s.is_sponsor_stand, s.deposit_percent);

    raise notice 'OK %: % -> %a + %b', n, s.price, n, n;
  end loop;
end $$;

alter table public.stands enable trigger protect_stand_columns;
