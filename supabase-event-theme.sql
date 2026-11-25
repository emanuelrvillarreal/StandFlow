-- ============================================================================
-- COLOR POR EVENTO (paleta propia en mapa/reserva)
-- SOLO LOCAL por ahora. No ejecutar en producción hasta que el usuario confirme.
-- ============================================================================
-- Un evento puede elegir un color de acento propio (hex). El resto de la
-- paleta se deriva en el front (ver src/lib/eventTheme.js). Si queda null,
-- se usa la paleta default de Deckaria.
alter table public.events add column if not exists theme_accent text;
