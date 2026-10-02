-- ============================================================================
-- ETIQUETAS DE TEXTO LIBRE SOBRE EL MAPA (ej: "ENTRADA", "SALIDA", "BAÑOS")
-- Ejecutar en Supabase Dashboard > SQL Editor (se puede repetir sin problema).
-- ============================================================================
-- El admin las agrega en "Modo edición" del mapa (igual que un stand, pero
-- sin precio ni reserva: es solo un cartelito de referencia). Las ve
-- cualquiera que entre al mapa del evento, incluidos los expositores.
-- ============================================================================

create table if not exists public.map_labels (
  id uuid primary key default gen_random_uuid(),
  event_id uuid not null references public.events(id) on delete cascade,
  sector text not null default 'salon',
  text text not null,
  x numeric not null default 50,
  y numeric not null default 50,
  color text not null default '#0b0b16',
  rotation numeric not null default 0,
  created_at timestamptz not null default now()
);

alter table public.map_labels add column if not exists color text not null default '#0b0b16';
alter table public.map_labels add column if not exists rotation numeric not null default 0;

create index if not exists map_labels_event_idx on public.map_labels(event_id);

alter table public.map_labels enable row level security;

do $$
declare pol record;
begin
  for pol in select policyname from pg_policies where schemaname = 'public' and tablename = 'map_labels' loop
    execute format('drop policy if exists %I on public.map_labels', pol.policyname);
  end loop;
end $$;

-- Son parte del mapa: las ve cualquiera, incluso sin login (igual que events/stands).
create policy "anyone can read map labels"
on public.map_labels
for select
to anon, authenticated
using (true);

create policy "admins manage map labels"
on public.map_labels
for all
to authenticated
using (public.is_admin())
with check (public.is_admin());

do $$
begin
  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'map_labels'
  ) then
    alter publication supabase_realtime add table public.map_labels;
  end if;
end $$;
