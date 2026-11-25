-- ============================================================================
-- DNI / CUIT DE LA CUENTA (separado del DNI del titular del seguro)
-- Ejecutar en Supabase Dashboard > SQL Editor (se puede repetir sin problema).
-- ============================================================================
-- El perfil del usuario (la cuenta que reserva el stand) no tenía DNI/CUIT
-- propio: solo se pedía DNI a la persona física asegurada en "Seguros", que
-- puede ser otra persona distinta del dueño de la cuenta. Esto agrega un
-- campo aparte para identificar fiscalmente a la cuenta/comercial.

alter table public.profiles add column if not exists dni text;
