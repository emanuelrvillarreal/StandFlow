-- ============================================================================
-- DNI/CUIT OBLIGATORIO DE ACÁ EN ADELANTE (las cuentas viejas sin DNI quedan
-- como están, no se les exige completarlo retroactivamente).
-- Ejecutar en Supabase Dashboard > SQL Editor (se puede repetir sin problema).
-- ============================================================================

-- 1) El alta automática de perfil (dispara al crear el usuario en Auth, antes
-- de que el front-end llegue a mandar el resto de los datos) ahora también
-- toma el DNI si vino en los metadatos del signUp, para que la fila ya nazca
-- completa y no choque con la regla de abajo.
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
as $$
begin
  insert into public.profiles (id, first_name, last_name, phone, email, dni)
  values (
    new.id,
    new.raw_user_meta_data->>'name',
    new.raw_user_meta_data->>'lastName',
    new.raw_user_meta_data->>'phone',
    new.email,
    new.raw_user_meta_data->>'dni'
  );
  return new;
end;
$$;

-- 2) A partir de este momento, toda cuenta nueva necesita DNI/CUIT. Las
-- cuentas creadas antes de correr esto (created_at anterior al momento del
-- "now()" de abajo) quedan exceptuadas para siempre, así que es seguro
-- correr esto aunque ya haya miles de cuentas sin ese dato cargado.
do $$
begin
  if not exists (
    select 1 from pg_constraint where conname = 'profiles_dni_required_going_forward'
  ) then
    execute format(
      'alter table public.profiles add constraint profiles_dni_required_going_forward check (dni is not null or created_at < %L)',
      now()
    );
  end if;
end $$;
