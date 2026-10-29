-- ============================================================================
-- AVISO POR MAIL AL ADMIN CUANDO LLEGA UNA SOLICITUD DE STAND NUEVA
-- Ejecutar en Supabase Dashboard > SQL Editor (se puede repetir sin problema).
-- ============================================================================
-- Cada evento puede tener una lista de mails (events.notify_emails, separados
-- por coma) configurada en el panel. Cada vez que un expositor manda una
-- solicitud para ese evento, un trigger en la base llama directo a la Edge
-- Function "rapid-processor" (kind='new_request') para avisarles, sin
-- depender de que el admin tenga la app abierta.
-- ============================================================================

alter table public.events add column if not exists notify_emails text;

create extension if not exists pg_net with schema extensions;

-- ----------------------------------------------------------------------------
-- PASO APARTE, UNA SOLA VEZ: guardar la service role key en Vault.
-- NO la pegues en este archivo ni me la pases a mí — andá al Dashboard de
-- Supabase > Project Settings > API > "service_role" (copiala de ahí), y
-- corré SOLO esta línea en el SQL Editor reemplazando <TU_SERVICE_ROLE_KEY>:
--
--   select vault.create_secret('<TU_SERVICE_ROLE_KEY>', 'service_role_key');
--
-- Si ya existe (por ejemplo porque la volvés a correr), usá en cambio:
--   select vault.update_secret(id, '<TU_SERVICE_ROLE_KEY>') from vault.secrets where name = 'service_role_key';
-- ----------------------------------------------------------------------------

create or replace function public.notify_new_event_request()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  ev record;
  requester record;
  emails text[];
  service_key text;
begin
  select name, notify_emails into ev from public.events where id = new.event_id;

  if ev.notify_emails is null or trim(ev.notify_emails) = '' then
    return new;
  end if;

  select coalesce(business_name, '') as business_name,
         coalesce(first_name, '') as first_name,
         coalesce(last_name, '') as last_name
    into requester
  from public.profiles where id = new.user_id;

  emails := string_to_array(regexp_replace(ev.notify_emails, '\s+', '', 'g'), ',');

  select decrypted_secret into service_key
  from vault.decrypted_secrets where name = 'service_role_key';

  if service_key is null then
    raise warning 'notify_new_event_request: falta el secret "service_role_key" en Vault, no se mandó el aviso.';
    return new;
  end if;

  perform net.http_post(
    url := 'https://fctdwbqpbyfdozucsonm.supabase.co/functions/v1/rapid-processor',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer ' || service_key
    ),
    body := jsonb_build_object(
      'kind', 'new_request',
      'to', to_jsonb(emails),
      'eventName', ev.name,
      'eventId', new.event_id,
      'eventRequestId', new.id,
      'userId', new.user_id,
      'requesterName', trim(both ' ' from (requester.first_name || ' ' || requester.last_name)),
      'requesterBusiness', requester.business_name,
      'requesterMessage', new.message,
      'adminUrl', 'https://stands.deckaria.ar/admin'
    )
  );

  return new;
end;
$$;

drop trigger if exists notify_new_event_request on public.event_requests;
create trigger notify_new_event_request
after insert on public.event_requests
for each row execute function public.notify_new_event_request();
