-- ============================================================================
-- CATEGORÍAS POR EVENTO
-- SOLO LOCAL por ahora. No ejecutar en producción hasta que el usuario confirme.
-- ============================================================================
-- Las categorías eran globales: todos los eventos compartían las mismas, así
-- que editar una (ej: "Comerciales") afectaba a cualquier evento que la
-- usara, aunque el admin estuviera parado en otro evento distinto. Ahora cada
-- categoría pertenece a un evento; las que ya existían quedan en el evento
-- más viejo (Deckaria), que es para el que se habían creado.
alter table public.categories add column if not exists event_id uuid references public.events(id) on delete cascade;

update public.categories
set event_id = (select id from public.events order by date asc limit 1)
where event_id is null;

alter table public.categories alter column event_id set not null;

create index if not exists categories_event_idx on public.categories(event_id);
