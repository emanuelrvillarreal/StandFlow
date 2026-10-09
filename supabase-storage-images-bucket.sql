-- ============================================================================
-- BUCKET DE STORAGE PARA IMÁGENES (posters, mapas, fotos de perfil)
-- Ejecutar en Supabase Dashboard > SQL Editor (se puede repetir sin problema).
-- ============================================================================
-- Hasta ahora las imágenes (fotos de emprendimiento, posters de evento,
-- mapas) se guardaban como texto base64 directo en las filas de la base.
-- Eso hace que esa imagen entera se vuelva a bajar cada vez que cualquiera
-- consulta esa fila (evento, perfil), sin ningún caché de navegador real —
-- es la causa del consumo alto de Egress en el proyecto. Este bucket permite
-- subir el archivo real y guardar solo la URL pública en la base: el
-- navegador cachea esa URL como cualquier imagen de internet.
-- ============================================================================

insert into storage.buckets (id, name, public)
values ('images', 'images', true)
on conflict (id) do nothing;

-- Cualquiera puede ver las imágenes (bucket público: posters, mapas y fotos
-- de perfil se muestran sin necesidad de estar logueado).
drop policy if exists "images: lectura pública" on storage.objects;
create policy "images: lectura pública"
  on storage.objects for select
  using (bucket_id = 'images');

-- Cualquier usuario logueado puede subir/reemplazar/borrar imágenes en este
-- bucket (lo suben tanto admins -eventos- como expositores -foto de perfil-).
drop policy if exists "images: subir logueado" on storage.objects;
create policy "images: subir logueado"
  on storage.objects for insert
  with check (bucket_id = 'images' and auth.role() = 'authenticated');

drop policy if exists "images: actualizar logueado" on storage.objects;
create policy "images: actualizar logueado"
  on storage.objects for update
  using (bucket_id = 'images' and auth.role() = 'authenticated');

drop policy if exists "images: borrar logueado" on storage.objects;
create policy "images: borrar logueado"
  on storage.objects for delete
  using (bucket_id = 'images' and auth.role() = 'authenticated');
