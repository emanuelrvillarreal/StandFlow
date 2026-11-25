SET local check_function_bodies = off;

CREATE SEQUENCE "public"."settings_id_seq" AS integer INCREMENT BY 1 MINVALUE 1 MAXVALUE 2147483647 START WITH 1 CACHE 1 NO CYCLE;

CREATE TABLE "public"."app_settings" (
  "id"         text                     NOT NULL,
  "value"      jsonb                    NOT NULL DEFAULT '{}'::jsonb,
  "updated_at" timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT "app_settings_pkey" PRIMARY KEY (id)
);

ALTER TABLE "public"."app_settings"
  ENABLE ROW LEVEL SECURITY;

CREATE TABLE "public"."categories" (
  "id"      uuid NOT NULL DEFAULT extensions.uuid_generate_v4(),
  "name"    text NOT NULL,
  "color"   text NOT NULL,
  "details" text,
  CONSTRAINT "categories_pkey" PRIMARY KEY (id)
);

ALTER TABLE "public"."categories"
  ENABLE ROW LEVEL SECURITY;

CREATE TABLE "public"."event_attendance" (
  "id"                uuid                     NOT NULL DEFAULT gen_random_uuid(),
  "event_id"          uuid                     NOT NULL,
  "day"               date                     NOT NULL,
  "reservation_id"    uuid,
  "sponsor_member_id" uuid,
  "checked_at"        timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT "event_attendance_one_subject" CHECK (((((reservation_id IS NOT NULL))::integer + ((sponsor_member_id IS NOT NULL))::integer) = 1)),
  CONSTRAINT "event_attendance_pkey" PRIMARY KEY (id),
  "checked_by"        uuid                     DEFAULT auth.uid()
);

ALTER TABLE "public"."event_attendance"
  ENABLE ROW LEVEL SECURITY;

CREATE TABLE "public"."event_requests" (
  "id"         uuid                     NOT NULL DEFAULT gen_random_uuid(),
  "event_id"   uuid                     NOT NULL,
  "user_id"    uuid                     NOT NULL,
  "status"     text                     NOT NULL DEFAULT 'pending'::text,
  "message"    text,
  "created_at" timestamp with time zone NOT NULL DEFAULT now(),
  "decided_at" timestamp with time zone,
  "decided_by" uuid,
  CONSTRAINT "event_requests_event_id_user_id_key" UNIQUE (event_id, user_id),
  CONSTRAINT "event_requests_pkey" PRIMARY KEY (id),
  CONSTRAINT "event_requests_status_check" CHECK ((status = ANY (ARRAY['pending'::text, 'approved'::text, 'rejected'::text])))
);

ALTER TABLE "public"."event_requests"
  ENABLE ROW LEVEL SECURITY;

CREATE TABLE "public"."event_sponsor_settings" (
  "event_id"   uuid                     NOT NULL,
  "enabled"    boolean                  NOT NULL DEFAULT false,
  "code"       text,
  "image"      text,
  "updated_at" timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT "event_sponsor_settings_pkey" PRIMARY KEY (event_id)
);

ALTER TABLE "public"."event_sponsor_settings"
  ENABLE ROW LEVEL SECURITY;

CREATE TABLE "public"."events" (
  "id"                   uuid                     NOT NULL DEFAULT extensions.uuid_generate_v4(),
  "name"                 text                     NOT NULL,
  "date"                 date,
  "location"             text,
  "status"               text                     DEFAULT 'active'::text,
  "map_image"            jsonb,
  "whatsapp"             text,
  "payment_instructions" text,
  "created_at"           timestamp with time zone DEFAULT timezone('utc'::text, now()),
  "poster_image"         text,
  "end_date"             date,
  "requires_approval"    boolean                  NOT NULL DEFAULT false,
  "allow_partial_days"   boolean                  NOT NULL DEFAULT false,
  "organizer_email"      text,
  "contact_method"       text                     NOT NULL DEFAULT 'whatsapp'::text,
  "deposit_percent"      integer                  NOT NULL DEFAULT 50,
  "reservation_note"     text,
  "requests_paused"      boolean                  NOT NULL DEFAULT false,
  CONSTRAINT "events_contact_method_check" CHECK ((contact_method = ANY (ARRAY['whatsapp'::text, 'email'::text, 'both'::text]))),
  CONSTRAINT "events_deposit_percent_check" CHECK (((deposit_percent > 0) AND (deposit_percent < 100))),
  CONSTRAINT "events_pkey" PRIMARY KEY (id)
);

ALTER TABLE "public"."events"
  ENABLE ROW LEVEL SECURITY;

CREATE TABLE "public"."expenses" (
  "id"          uuid                     NOT NULL DEFAULT gen_random_uuid(),
  "description" text                     NOT NULL,
  "amount"      numeric                  NOT NULL,
  "created_at"  timestamp with time zone NOT NULL DEFAULT timezone('utc'::text, now()),
  "type"        text                     DEFAULT 'expense'::text,
  CONSTRAINT "expenses_pkey" PRIMARY KEY (id)
);

ALTER TABLE "public"."expenses"
  ENABLE ROW LEVEL SECURITY;

CREATE TABLE "public"."map_labels" (
  "id"         uuid                     NOT NULL DEFAULT gen_random_uuid(),
  "event_id"   uuid                     NOT NULL,
  "sector"     text                     NOT NULL DEFAULT 'salon'::text,
  "text"       text                     NOT NULL,
  "x"          numeric                  NOT NULL DEFAULT 50,
  "y"          numeric                  NOT NULL DEFAULT 50,
  "created_at" timestamp with time zone NOT NULL DEFAULT now(),
  "color"      text                     NOT NULL DEFAULT '#0b0b16'::text,
  "rotation"   numeric                  NOT NULL DEFAULT 0,
  CONSTRAINT "map_labels_pkey" PRIMARY KEY (id)
);

ALTER TABLE "public"."map_labels"
  ENABLE ROW LEVEL SECURITY;

CREATE TABLE "public"."notification_log" (
  "id"               uuid                     NOT NULL DEFAULT gen_random_uuid(),
  "event_request_id" uuid,
  "event_id"         uuid,
  "user_id"          uuid,
  "to_email"         text                     NOT NULL,
  "kind"             text                     NOT NULL DEFAULT 'approval'::text,
  "status"           text                     NOT NULL,
  "error_message"    text,
  "sent_by"          uuid,
  "created_at"       timestamp with time zone NOT NULL DEFAULT now(),
  "subject"          text,
  "detail"           jsonb,
  CONSTRAINT "notification_log_pkey" PRIMARY KEY (id),
  CONSTRAINT "notification_log_status_check" CHECK ((status = ANY (ARRAY['sent'::text, 'error'::text])))
);

ALTER TABLE "public"."notification_log"
  ENABLE ROW LEVEL SECURITY;

CREATE TABLE "public"."profiles" (
  "id"             uuid                     NOT NULL,
  "first_name"     text,
  "last_name"      text,
  "phone"          text,
  "role"           text                     DEFAULT 'user'::text,
  "updated_at"     timestamp with time zone DEFAULT timezone('utc'::text, now()),
  "email"          text,
  "role_id"        integer                  DEFAULT 2,
  "business_name"  text,
  "is_blocked"     boolean                  NOT NULL DEFAULT false,
  "blocked_reason" text,
  "blocked_at"     timestamp with time zone,
  "instagram"      text,
  "business_photo" text,
  "max_stands"     integer                  NOT NULL DEFAULT 1,
  "is_sysadmin"    boolean                  NOT NULL DEFAULT false,
  "birth_date"     date,
  "created_at"     timestamp with time zone DEFAULT now(),
  CONSTRAINT "profiles_max_stands_check" CHECK ((max_stands >= 1)),
  CONSTRAINT "profiles_pkey" PRIMARY KEY (id)
);

ALTER TABLE "public"."profiles"
  ENABLE ROW LEVEL SECURITY;

CREATE TABLE "public"."reservations" (
  "id"               uuid                     NOT NULL DEFAULT extensions.uuid_generate_v4(),
  "event_id"         uuid,
  "stand_id"         uuid,
  "user_id"          uuid,
  "stand_name"       text,
  "shared"           boolean                  DEFAULT false,
  "shared_with"      text,
  "instagram"        text,
  "category_id"      uuid,
  "status"           text                     DEFAULT 'pending'::text,
  "amount"           numeric,
  "created_at"       timestamp with time zone DEFAULT timezone('utc'::text, now()),
  "paid_at"          timestamp with time zone,
  "payment_type"     text                     DEFAULT 'full'::text,
  "days"             jsonb,
  "balance_paid_at"  timestamp with time zone,
  "category_details" text,
  CONSTRAINT "reservations_pkey" PRIMARY KEY (id),
  CONSTRAINT "reservations_status_check" CHECK ((status = ANY (ARRAY['pending'::text, 'deposit_paid'::text, 'paid'::text, 'cancelled'::text, 'reserved'::text])))
);

ALTER TABLE "public"."reservations"
  ENABLE ROW LEVEL SECURITY;

CREATE TABLE "public"."roles" (
  "id"   integer NOT NULL,
  "name" text    NOT NULL,
  CONSTRAINT "roles_pkey" PRIMARY KEY (id)
);

ALTER TABLE "public"."roles"
  ENABLE ROW LEVEL SECURITY;

CREATE TABLE "public"."settings" (
  "id"                integer NOT NULL DEFAULT nextval('public.settings_id_seq'::regclass),
  "whatsapp_number"   text,
  "whatsapp_template" text,
  CONSTRAINT "settings_pkey" PRIMARY KEY (id)
);

ALTER TABLE "public"."settings"
  ENABLE ROW LEVEL SECURITY;

CREATE TABLE "public"."sponsor_members" (
  "id"              uuid    NOT NULL DEFAULT gen_random_uuid(),
  "registration_id" uuid    NOT NULL,
  "first_name"      text    NOT NULL,
  "last_name"       text    NOT NULL,
  "dni"             text    NOT NULL,
  "phone"           text    NOT NULL,
  "email"           text    NOT NULL,
  "position"        integer NOT NULL DEFAULT 0,
  "birth_date"      date,
  CONSTRAINT "sponsor_members_pkey" PRIMARY KEY (id)
);

ALTER TABLE "public"."sponsor_members"
  ENABLE ROW LEVEL SECURITY;

CREATE TABLE "public"."sponsor_registrations" (
  "id"         uuid                     NOT NULL DEFAULT gen_random_uuid(),
  "event_id"   uuid                     NOT NULL,
  "stand_id"   uuid                     NOT NULL,
  "user_id"    uuid                     NOT NULL,
  "created_at" timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT "sponsor_registrations_pkey" PRIMARY KEY (id),
  CONSTRAINT "sponsor_registrations_stand_id_key" UNIQUE (stand_id)
);

ALTER TABLE "public"."sponsor_registrations"
  ENABLE ROW LEVEL SECURITY;

CREATE TABLE "public"."stands" (
  "id"               uuid    NOT NULL DEFAULT extensions.uuid_generate_v4(),
  "event_id"         uuid,
  "number"           text    NOT NULL,
  "sector"           text    NOT NULL,
  "x"                numeric NOT NULL,
  "y"                numeric NOT NULL,
  "price"            numeric NOT NULL,
  "status"           text    DEFAULT 'available'::text,
  "category_id"      uuid,
  "is_sponsor_stand" boolean NOT NULL DEFAULT false,
  "deposit_percent"  integer,
  CONSTRAINT "stands_pkey" PRIMARY KEY (id)
);

ALTER TABLE "public"."stands"
  ENABLE ROW LEVEL SECURITY;

ALTER SEQUENCE "public"."settings_id_seq" OWNED BY "public"."settings"."id";

CREATE OR REPLACE FUNCTION public.assert_stand_quota (
  p_user_id  uuid,
  p_event_id uuid
)
  RETURNS void
  LANGUAGE plpgsql
  SECURITY DEFINER
  SET search_path TO 'public'
  AS $function$
declare
  quota integer;
  used integer;
begin
  -- Serializa los pedidos del mismo usuario en el mismo evento: así dos
  -- reservas simultáneas no se cuelan por encima del límite.
  perform pg_advisory_xact_lock(hashtext(p_user_id::text || ':' || p_event_id::text));

  select coalesce(max_stands, 1) into quota from public.profiles where id = p_user_id;
  quota := coalesce(quota, 1);

  select count(*) into used
  from public.reservations r
  where r.user_id = p_user_id
    and r.event_id = p_event_id
    and r.status in ('pending', 'deposit_paid', 'paid', 'reserved');

  if used >= quota then
    raise exception 'Ya tenés % en este evento. Cada expositor puede reservar % (si necesitás más, pedíselo a la organización).',
      case when used = 1 then 'tu stand' else used || ' stands' end,
      case when quota = 1 then 'un solo stand' else quota || ' stands' end;
  end if;
end;
$function$;

CREATE OR REPLACE FUNCTION public.block_exhibitor_as_sponsor()
  RETURNS TRIGGER
  LANGUAGE plpgsql
  SECURITY DEFINER
  SET search_path TO 'public'
  AS $function$
begin
  if public.is_admin() then
    raise exception 'Una cuenta de administrador no puede registrarse como Sponsor.';
  end if;
  if exists (select 1 from public.reservations x where x.user_id = new.user_id)
     or exists (select 1 from public.event_requests q where q.user_id = new.user_id) then
    raise exception 'Esta cuenta ya es de expositor. Para registrarte como Sponsor usá otra cuenta (otro mail).';
  end if;
  return new;
end;
$function$;

CREATE OR REPLACE FUNCTION public.block_sponsor_reservation()
  RETURNS TRIGGER
  LANGUAGE plpgsql
  SECURITY DEFINER
  SET search_path TO 'public'
  AS $function$
begin
  if not public.is_admin() and public.is_sponsor_account(auth.uid()) then
    raise exception 'Las cuentas de Sponsor no pueden reservar stands de expositores.';
  end if;
  return new;
end;
$function$;

CREATE OR REPLACE FUNCTION public.block_sponsor_taking_stand()
  RETURNS TRIGGER
  LANGUAGE plpgsql
  SECURITY DEFINER
  SET search_path TO 'public'
  AS $function$
begin
  if public.is_admin() or current_setting('app.sponsor_flow', true) = 'on' then
    return new;
  end if;
  if old.status = 'available' and new.status = 'pending' and public.is_sponsor_account(auth.uid()) then
    raise exception 'Las cuentas de Sponsor no pueden reservar stands de expositores.';
  end if;
  return new;
end;
$function$;

CREATE OR REPLACE FUNCTION public.can_participate (
  p_event_id uuid,
  p_user_id  uuid
)
  RETURNS boolean
  LANGUAGE sql
  STABLE
  SECURITY DEFINER
  SET search_path TO 'public'
  AS $function$
  select
    not coalesce((select e.requires_approval from public.events e where e.id = p_event_id), false)
    or exists (
      select 1 from public.event_requests r
      where r.event_id = p_event_id and r.user_id = p_user_id and r.status = 'approved'
    )
    or (
      not exists (
        select 1 from public.event_requests r
        where r.event_id = p_event_id and r.user_id = p_user_id and r.status = 'rejected'
      )
      and exists (
        select 1 from public.reservations x
        where x.event_id = p_event_id and x.user_id = p_user_id
          and x.status in ('pending', 'deposit_paid', 'paid', 'reserved')
      )
    );
$function$;

CREATE OR REPLACE FUNCTION public.force_created_at()
  RETURNS TRIGGER
  LANGUAGE plpgsql
  AS $function$
begin
  new.created_at := now();
  return new;
end;
$function$;

CREATE OR REPLACE FUNCTION public.free_sponsor_stand()
  RETURNS TRIGGER
  LANGUAGE plpgsql
  SECURITY DEFINER
  SET search_path TO 'public'
  AS $function$
begin
  perform set_config('app.sponsor_flow', 'on', true);
  update public.stands set status = 'available', category_id = null where id = old.stand_id;
  return old;
end;
$function$;

CREATE OR REPLACE FUNCTION public.handle_new_user()
  RETURNS TRIGGER
  LANGUAGE plpgsql
  SECURITY DEFINER
  AS $function$
BEGIN
  INSERT INTO public.profiles (id, first_name, last_name, phone, email)
  VALUES (
    NEW.id,
    NEW.raw_user_meta_data->>'name',
    NEW.raw_user_meta_data->>'lastName',
    NEW.raw_user_meta_data->>'phone',
    NEW.email
  );
  RETURN NEW;
END;
$function$;

CREATE OR REPLACE FUNCTION public.handle_reservation_stand_sync()
  RETURNS TRIGGER
  LANGUAGE plpgsql
  SECURITY DEFINER
  SET search_path TO 'public'
  AS $function$
begin
  if tg_op in ('INSERT', 'UPDATE') then
    perform public.sync_stand_status_from_reservations(new.stand_id);
  end if;

  if tg_op in ('UPDATE', 'DELETE') then
    perform public.sync_stand_status_from_reservations(old.stand_id);
  end if;

  return coalesce(new, old);
end;
$function$;

CREATE OR REPLACE FUNCTION public.is_admin()
  RETURNS boolean
  LANGUAGE sql
  SECURITY DEFINER
  SET search_path TO 'public'
  AS $function$
  select exists (
    select 1
    from public.profiles
    where id = auth.uid()
      and role_id = 1
  );
$function$;

CREATE OR REPLACE FUNCTION public.is_sponsor_account (
  p_user_id uuid
)
  RETURNS boolean
  LANGUAGE sql
  STABLE
  SECURITY DEFINER
  SET search_path TO 'public'
  AS $function$
  select exists (select 1 from public.sponsor_registrations r where r.user_id = p_user_id);
$function$;

CREATE OR REPLACE FUNCTION public.is_sysadmin (
  p_user_id uuid
)
  RETURNS boolean
  LANGUAGE sql
  STABLE
  SECURITY DEFINER
  SET search_path TO 'public'
  AS $function$
  select exists (
    select 1 from public.profiles
    where id = p_user_id and role_id = 1 and is_sysadmin
  );
$function$;

CREATE OR REPLACE FUNCTION public.limit_stands_on_reserve()
  RETURNS TRIGGER
  LANGUAGE plpgsql
  SECURITY DEFINER
  SET search_path TO 'public'
  AS $function$
begin
  if public.is_admin() then
    return new;
  end if;
  perform public.assert_stand_quota(new.user_id, new.event_id);
  return new;
end;
$function$;

CREATE OR REPLACE FUNCTION public.limit_stands_on_take()
  RETURNS TRIGGER
  LANGUAGE plpgsql
  SECURITY DEFINER
  SET search_path TO 'public'
  AS $function$
begin
  if public.is_admin() or current_setting('app.sponsor_flow', true) = 'on' then
    return new;
  end if;
  if old.status = 'available' and new.status = 'pending' then
    perform public.assert_stand_quota(auth.uid(), old.event_id);
  end if;
  return new;
end;
$function$;

CREATE OR REPLACE FUNCTION public.protect_profile_columns()
  RETURNS TRIGGER
  LANGUAGE plpgsql
  SECURITY DEFINER
  SET search_path TO 'public'
  AS $function$
begin
  if new.is_sysadmin is distinct from old.is_sysadmin
     and auth.uid() is not null
     and not public.is_sysadmin(auth.uid())
  then
    raise exception 'Solo un sysadmin puede otorgar o quitar el rol de sysadmin.';
  end if;

  if old.is_sysadmin
     and auth.uid() is not null
     and auth.uid() <> old.id
     and not public.is_sysadmin(auth.uid())
     and (new.role_id is distinct from old.role_id
          or new.role is distinct from old.role
          or new.is_blocked is distinct from old.is_blocked)
  then
    raise exception 'No podés modificar la cuenta de un sysadmin.';
  end if;

  if public.is_admin() then
    return new;
  end if;

  if new.role_id is distinct from old.role_id
     or new.role is distinct from old.role
     or new.is_blocked is distinct from old.is_blocked
     or new.blocked_reason is distinct from old.blocked_reason
     or new.blocked_at is distinct from old.blocked_at
     or new.email is distinct from old.email
     or new.max_stands is distinct from old.max_stands
  then
    raise exception 'No tenés permiso para modificar esos campos del perfil.';
  end if;

  return new;
end;
$function$;

CREATE OR REPLACE FUNCTION public.protect_reservation_columns()
  RETURNS TRIGGER
  LANGUAGE plpgsql
  SECURITY DEFINER
  SET search_path TO 'public'
  AS $function$
declare
  stand_price numeric;
  stand_event uuid;
  stand_sponsor boolean;
  stand_deposit_pct integer;
  ev_date date;
  ev_end date;
  ev_deposit_pct integer;
  effective_deposit_pct integer;
  deposit_amount numeric;
begin
  if public.is_admin() then
    return new;
  end if;

  if tg_op = 'INSERT' then
    if new.status is distinct from 'pending' then
      raise exception 'Una reserva nueva tiene que empezar en estado pendiente.';
    end if;

    select price, event_id, is_sponsor_stand, deposit_percent
      into stand_price, stand_event, stand_sponsor, stand_deposit_pct
    from public.stands where id = new.stand_id;

    select coalesce(deposit_percent, 50) into ev_deposit_pct from public.events where id = stand_event;
    effective_deposit_pct := coalesce(stand_deposit_pct, ev_deposit_pct, 50);
    deposit_amount := round(stand_price * effective_deposit_pct / 100.0);

    if stand_price is null
       or (new.amount is distinct from stand_price and new.amount is distinct from deposit_amount)
    then
      raise exception 'El importe no coincide con el precio del stand.';
    end if;

    if stand_sponsor then
      raise exception 'Este stand está reservado para Sponsors.';
    end if;

    if new.event_id is distinct from stand_event then
      raise exception 'El stand no pertenece a ese evento.';
    end if;

    if not public.can_participate(new.event_id, auth.uid()) then
      raise exception 'Este evento es con confirmación: el organizador tiene que aprobar tu solicitud antes de que puedas reservar.';
    end if;

    if new.days is not null then
      if jsonb_typeof(new.days) <> 'array' or jsonb_array_length(new.days) = 0 then
        raise exception 'Elegí al menos un día para el stand.';
      end if;

      select date, coalesce(end_date, date) into ev_date, ev_end from public.events where id = new.event_id;

      if exists (
        select 1 from jsonb_array_elements_text(new.days) as d(day)
        where d.day !~ '^\d{4}-\d{2}-\d{2}$'
           or d.day::date < ev_date or d.day::date > ev_end
      ) then
        raise exception 'Hay un día elegido que no pertenece a las fechas del evento.';
      end if;
    end if;

    return new;
  end if;

  if new.status is distinct from old.status
     or new.amount is distinct from old.amount
     or new.payment_type is distinct from old.payment_type
     or new.user_id is distinct from old.user_id
     or new.stand_id is distinct from old.stand_id
     or new.event_id is distinct from old.event_id
     or new.paid_at is distinct from old.paid_at
     or new.balance_paid_at is distinct from old.balance_paid_at
     or new.days is distinct from old.days
  then
    raise exception 'No tenés permiso para modificar esos campos de la reserva.';
  end if;

  return new;
end;
$function$;

CREATE OR REPLACE FUNCTION public.protect_stand_columns()
  RETURNS TRIGGER
  LANGUAGE plpgsql
  SECURITY DEFINER
  SET search_path TO 'public'
  AS $function$
begin
  if public.is_admin() or current_setting('app.sponsor_flow', true) = 'on' then
    return new;
  end if;

  if new.price is distinct from old.price
     or new.number is distinct from old.number
     or new.x is distinct from old.x
     or new.y is distinct from old.y
     or new.event_id is distinct from old.event_id
     or new.sector is distinct from old.sector
     or new.is_sponsor_stand is distinct from old.is_sponsor_stand
  then
    raise exception 'No tenés permiso para modificar esos campos del stand.';
  end if;

  if old.status = 'available' and new.status = 'pending' then
    if old.is_sponsor_stand then
      raise exception 'Este stand está reservado para Sponsors.';
    end if;
    if not public.can_participate(old.event_id, auth.uid()) then
      raise exception 'Este evento es con confirmación: el organizador tiene que aprobar tu solicitud antes de que puedas reservar.';
    end if;
  end if;

  return new;
end;
$function$;

CREATE OR REPLACE FUNCTION public.purge_user_account (
  p_user_id uuid
)
  RETURNS jsonb
  LANGUAGE plpgsql
  SECURITY DEFINER
  SET search_path TO 'public'
  AS $function$
declare
  prof public.profiles;
  n_sponsor integer := 0;
  n_res integer := 0;
  n_req integer := 0;
begin
  if auth.uid() is null or not public.is_sysadmin(auth.uid()) then
    raise exception 'Solo un sysadmin puede eliminar cuentas definitivamente.';
  end if;

  if p_user_id = auth.uid() then
    raise exception 'No podés eliminar tu propia cuenta.';
  end if;

  select * into prof from public.profiles where id = p_user_id;
  if not found then
    raise exception 'La cuenta no existe.';
  end if;

  if prof.is_sysadmin then
    raise exception 'No se puede eliminar la cuenta de un sysadmin.';
  end if;

  if prof.role_id is distinct from -1 then
    raise exception 'Primero hay que dar de baja la cuenta (borrado lógico); recién después se puede eliminar definitivamente.';
  end if;

  -- Resguardo de finanzas: una cuenta con pagos registrados no se borra.
  if exists (
    select 1 from public.reservations
    where user_id = p_user_id and status in ('paid', 'deposit_paid')
  ) then
    raise exception 'Esta cuenta tiene reservas pagadas o con seña: no se puede eliminar definitivamente para no perder el registro de los pagos.';
  end if;

  -- Los stands que tenía vuelven a quedar libres (los triggers se encargan).
  delete from public.sponsor_registrations where user_id = p_user_id;
  get diagnostics n_sponsor = row_count;

  delete from public.reservations where user_id = p_user_id;
  get diagnostics n_res = row_count;

  delete from public.event_requests where user_id = p_user_id;
  get diagnostics n_req = row_count;

  delete from public.profiles where id = p_user_id;
  delete from auth.users where id = p_user_id;

  return jsonb_build_object(
    'user_id', p_user_id,
    'email', prof.email,
    'reservas_eliminadas', n_res,
    'solicitudes_eliminadas', n_req,
    'registros_sponsor_eliminados', n_sponsor
  );
end;
$function$;

REVOKE ALL ON FUNCTION "public"."purge_user_account"(uuid) FROM PUBLIC, "anon";

CREATE OR REPLACE FUNCTION public.register_sponsor (
  p_code     text,
  p_stand_id uuid,
  p_members  jsonb
)
  RETURNS jsonb
  LANGUAGE plpgsql
  SECURITY DEFINER
  SET search_path TO 'public'
  AS $function$
declare
  cfg public.event_sponsor_settings;
  ev public.events;
  m jsonb;
  reg_id uuid;
  taken uuid;
  bd date;
  i int := 0;
begin
  if auth.uid() is null then
    raise exception 'Tenés que iniciar sesión para registrarte como Sponsor.';
  end if;

  select * into cfg
  from public.event_sponsor_settings
  where enabled and upper(btrim(code)) = upper(btrim(p_code));
  if not found then
    raise exception 'El código de Sponsor no es válido.';
  end if;

  select * into ev from public.events where id = cfg.event_id;
  if not found or ev.status = 'past' then
    raise exception 'El código de Sponsor no es válido.';
  end if;

  if p_members is null or jsonb_typeof(p_members) <> 'array' or jsonb_array_length(p_members) = 0 then
    raise exception 'Cargá al menos un integrante.';
  end if;

  for m in select * from jsonb_array_elements(p_members) loop
    if btrim(coalesce(m->>'first_name', '')) = ''
       or btrim(coalesce(m->>'last_name', '')) = ''
       or btrim(coalesce(m->>'dni', '')) = ''
       or btrim(coalesce(m->>'phone', '')) = ''
       or btrim(coalesce(m->>'email', '')) = ''
    then
      raise exception 'Completá nombre, apellido, DNI, teléfono y mail de todos los integrantes.';
    end if;
    if position('@' in m->>'email') = 0 then
      raise exception 'Hay un mail de integrante que no es válido.';
    end if;

    -- Fecha de nacimiento: obligatoria, con formato válido, no futura.
    if btrim(coalesce(m->>'birth_date', '')) = '' then
      raise exception 'Completá la fecha de nacimiento de todos los integrantes.';
    end if;
    begin
      bd := (m->>'birth_date')::date;
    exception when others then
      raise exception 'Hay una fecha de nacimiento que no es válida.';
    end;
    if bd > current_date or bd < date '1900-01-01' then
      raise exception 'Hay una fecha de nacimiento que no es válida.';
    end if;
  end loop;

  perform set_config('app.sponsor_flow', 'on', true);

  -- Toma condicionada: solo si el stand es de Sponsors, es de este evento y
  -- sigue libre. Si otro se lo llevó antes, no toca ninguna fila.
  update public.stands
  set status = 'reserved'
  where id = p_stand_id and event_id = ev.id and is_sponsor_stand and status = 'available'
  returning id into taken;

  if taken is null then
    raise exception 'Ese stand ya no está disponible. Elegí otro.';
  end if;

  insert into public.sponsor_registrations (event_id, stand_id, user_id)
  values (ev.id, p_stand_id, auth.uid())
  returning id into reg_id;

  for m in select * from jsonb_array_elements(p_members) loop
    insert into public.sponsor_members (registration_id, first_name, last_name, dni, phone, email, birth_date, position)
    values (
      reg_id,
      btrim(m->>'first_name'), btrim(m->>'last_name'), btrim(m->>'dni'),
      btrim(m->>'phone'), btrim(m->>'email'), (m->>'birth_date')::date, i
    );
    i := i + 1;
  end loop;

  return jsonb_build_object('registration_id', reg_id, 'event_id', ev.id, 'event_name', ev.name, 'stand_id', p_stand_id);
end;
$function$;

CREATE OR REPLACE FUNCTION public.set_sponsor_stand_flag()
  RETURNS TRIGGER
  LANGUAGE plpgsql
  AS $function$
begin
  new.is_sponsor_stand := (new.sector = 'sponsor');
  return new;
end;
$function$;

CREATE OR REPLACE FUNCTION public.sponsor_lookup (
  p_code text
)
  RETURNS jsonb
  LANGUAGE plpgsql
  STABLE
  SECURITY DEFINER
  SET search_path TO 'public'
  AS $function$
declare
  cfg public.event_sponsor_settings;
  ev public.events;
begin
  if p_code is null or btrim(p_code) = '' then
    raise exception 'Ingresá el código de Sponsor.';
  end if;

  select * into cfg
  from public.event_sponsor_settings
  where enabled and upper(btrim(code)) = upper(btrim(p_code));

  if not found then
    raise exception 'El código de Sponsor no es válido.';
  end if;

  select * into ev from public.events where id = cfg.event_id;
  if not found or ev.status = 'past' then
    raise exception 'El código de Sponsor no es válido.';
  end if;

  return jsonb_build_object(
    'event_id', ev.id,
    'event_name', ev.name,
    'date', ev.date,
    'end_date', ev.end_date,
    'location', ev.location,
    'sponsor_image', coalesce(ev.map_image->>'sponsor', cfg.image),
    'stands', coalesce((
      select jsonb_agg(
        jsonb_build_object('id', s.id, 'number', s.number, 'sector', s.sector, 'status', s.status, 'x', s.x, 'y', s.y)
        order by s.number
      )
      from public.stands s
      where s.event_id = ev.id and s.is_sponsor_stand
    ), '[]'::jsonb)
  );
end;
$function$;

CREATE OR REPLACE FUNCTION public.sync_stand_status_from_reservations (
  target_stand_id uuid
)
  RETURNS void
  LANGUAGE plpgsql
  SECURITY DEFINER
  SET search_path TO 'public'
  AS $function$
declare
  active_reservation record;
begin
  select status, category_id
  into active_reservation
  from public.reservations
  where stand_id = target_stand_id
    and status in ('pending', 'paid', 'reserved')
  order by
    case
      when status in ('paid', 'reserved') then 1
      when status = 'pending' then 2
      else 3
    end,
    created_at desc
  limit 1;

  if active_reservation is null then
    update public.stands
    set status = 'available',
        category_id = null
    where id = target_stand_id
      and status in ('pending', 'reserved');
  else
    update public.stands
    set status = case
          when active_reservation.status in ('paid', 'reserved') then 'reserved'
          else 'pending'
        end,
        category_id = active_reservation.category_id
    where id = target_stand_id;
  end if;
end;
$function$;

CREATE OR REPLACE FUNCTION public.validate_birth_date()
  RETURNS TRIGGER
  LANGUAGE plpgsql
  AS $function$
begin
  if new.birth_date is not null
     and (new.birth_date > current_date or new.birth_date < date '1900-01-01')
  then
    raise exception 'La fecha de nacimiento no es válida.';
  end if;
  return new;
end;
$function$;

ALTER TABLE "public"."event_requests"
  ADD CONSTRAINT "event_requests_decided_by_fkey" FOREIGN KEY (decided_by) REFERENCES auth.users(id) ON DELETE SET NULL;

ALTER TABLE "public"."event_requests"
  ADD CONSTRAINT "event_requests_user_id_fkey" FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;

ALTER TABLE "public"."event_attendance"
  ADD CONSTRAINT "event_attendance_event_id_fkey" FOREIGN KEY (event_id) REFERENCES public.events(id) ON DELETE CASCADE;

ALTER TABLE "public"."event_requests"
  ADD CONSTRAINT "event_requests_event_id_fkey" FOREIGN KEY (event_id) REFERENCES public.events(id) ON DELETE CASCADE;

ALTER TABLE "public"."event_sponsor_settings"
  ADD CONSTRAINT "event_sponsor_settings_event_id_fkey" FOREIGN KEY (event_id) REFERENCES public.events(id) ON DELETE CASCADE;

ALTER TABLE "public"."map_labels"
  ADD CONSTRAINT "map_labels_event_id_fkey" FOREIGN KEY (event_id) REFERENCES public.events(id) ON DELETE CASCADE;

ALTER TABLE "public"."notification_log"
  ADD CONSTRAINT "notification_log_event_id_fkey" FOREIGN KEY (event_id) REFERENCES public.events(id) ON DELETE SET NULL;

ALTER TABLE "public"."notification_log"
  ADD CONSTRAINT "notification_log_event_request_id_fkey" FOREIGN KEY (event_request_id) REFERENCES public.event_requests(id) ON DELETE SET NULL;

ALTER TABLE "public"."notification_log"
  ADD CONSTRAINT "notification_log_sent_by_fkey" FOREIGN KEY (sent_by) REFERENCES auth.users(id) ON DELETE SET NULL;

ALTER TABLE "public"."notification_log"
  ADD CONSTRAINT "notification_log_user_id_fkey" FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE SET NULL;

ALTER TABLE "public"."profiles"
  ADD CONSTRAINT "profiles_id_fkey" FOREIGN KEY (id) REFERENCES auth.users(id) ON DELETE CASCADE;

ALTER TABLE "public"."reservations"
  ADD CONSTRAINT "reservations_category_id_fkey" FOREIGN KEY (category_id) REFERENCES public.categories(id) ON DELETE SET NULL;

ALTER TABLE "public"."reservations"
  ADD CONSTRAINT "reservations_event_id_fkey" FOREIGN KEY (event_id) REFERENCES public.events(id) ON DELETE CASCADE;

ALTER TABLE "public"."event_attendance"
  ADD CONSTRAINT "event_attendance_reservation_id_fkey" FOREIGN KEY (reservation_id) REFERENCES public.reservations(id) ON DELETE CASCADE;

ALTER TABLE "public"."reservations"
  ADD CONSTRAINT "reservations_user_id_fkey" FOREIGN KEY (user_id) REFERENCES auth.users(id);

ALTER TABLE "public"."profiles"
  ADD CONSTRAINT "profiles_role_id_fkey" FOREIGN KEY (role_id) REFERENCES public.roles(id);

ALTER TABLE "public"."event_attendance"
  ADD CONSTRAINT "event_attendance_sponsor_member_id_fkey" FOREIGN KEY (sponsor_member_id) REFERENCES public.sponsor_members(id) ON DELETE CASCADE;

ALTER TABLE "public"."sponsor_registrations"
  ADD CONSTRAINT "sponsor_registrations_event_id_fkey" FOREIGN KEY (event_id) REFERENCES public.events(id) ON DELETE CASCADE;

ALTER TABLE "public"."sponsor_members"
  ADD CONSTRAINT "sponsor_members_registration_id_fkey" FOREIGN KEY (registration_id) REFERENCES public.sponsor_registrations(id) ON DELETE CASCADE;

ALTER TABLE "public"."sponsor_registrations"
  ADD CONSTRAINT "sponsor_registrations_user_id_fkey" FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;

ALTER TABLE "public"."stands"
  ADD CONSTRAINT "stands_category_id_fkey" FOREIGN KEY (category_id) REFERENCES public.categories(id) ON DELETE SET NULL;

ALTER TABLE "public"."stands"
  ADD CONSTRAINT "stands_event_id_fkey" FOREIGN KEY (event_id) REFERENCES public.events(id) ON DELETE CASCADE;

ALTER TABLE "public"."reservations"
  ADD CONSTRAINT "reservations_stand_id_fkey" FOREIGN KEY (stand_id) REFERENCES public.stands(id) ON DELETE CASCADE;

ALTER TABLE "public"."sponsor_registrations"
  ADD CONSTRAINT "sponsor_registrations_stand_id_fkey" FOREIGN KEY (stand_id) REFERENCES public.stands(id) ON DELETE CASCADE;

CREATE INDEX event_attendance_event_idx ON public.event_attendance USING btree (event_id, day);

CREATE UNIQUE INDEX event_attendance_member_day_uidx ON public.event_attendance USING btree (sponsor_member_id, day)
  WHERE (sponsor_member_id IS NOT NULL);

CREATE UNIQUE INDEX event_attendance_reservation_day_uidx ON public.event_attendance USING btree (reservation_id, day)
  WHERE (reservation_id IS NOT NULL);

CREATE INDEX event_requests_event_idx ON public.event_requests USING btree (event_id);

CREATE INDEX event_requests_user_idx ON public.event_requests USING btree (user_id);

CREATE UNIQUE INDEX event_sponsor_settings_code_uidx ON public.event_sponsor_settings USING btree (upper(btrim(code)))
  WHERE ((code IS NOT NULL) AND (btrim(code) <> ''::text));

CREATE INDEX map_labels_event_idx ON public.map_labels USING btree (event_id);

CREATE INDEX notification_log_created_idx ON public.notification_log USING btree (created_at DESC);

CREATE INDEX notification_log_request_idx ON public.notification_log USING btree (event_request_id);

CREATE INDEX sponsor_members_registration_idx ON public.sponsor_members USING btree (registration_id);

CREATE INDEX sponsor_registrations_event_idx ON public.sponsor_registrations USING btree (event_id);

CREATE INDEX sponsor_registrations_user_idx ON public.sponsor_registrations USING btree (user_id);

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user();

CREATE TRIGGER a4_force_created_at
  BEFORE INSERT ON public.event_requests
  FOR EACH ROW
  EXECUTE FUNCTION public.force_created_at();

CREATE TRIGGER a5_validate_birth_date
  BEFORE INSERT OR UPDATE OF birth_date ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.validate_birth_date();

CREATE TRIGGER protect_profile_columns
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.protect_profile_columns();

CREATE TRIGGER a2_block_sponsor_reservation
  BEFORE INSERT ON public.reservations
  FOR EACH ROW
  EXECUTE FUNCTION public.block_sponsor_reservation();

CREATE TRIGGER a3_limit_stands_on_reserve
  BEFORE INSERT ON public.reservations
  FOR EACH ROW
  EXECUTE FUNCTION public.limit_stands_on_reserve();

CREATE TRIGGER a4_force_created_at
  BEFORE INSERT ON public.reservations
  FOR EACH ROW
  EXECUTE FUNCTION public.force_created_at();

CREATE TRIGGER protect_reservation_columns
  BEFORE INSERT OR UPDATE ON public.reservations
  FOR EACH ROW
  EXECUTE FUNCTION public.protect_reservation_columns();

CREATE TRIGGER sync_reservation_stand_status
  AFTER INSERT OR DELETE OR UPDATE ON public.reservations
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_reservation_stand_sync();

CREATE TRIGGER a2_block_exhibitor_as_sponsor
  BEFORE INSERT ON public.sponsor_registrations
  FOR EACH ROW
  EXECUTE FUNCTION public.block_exhibitor_as_sponsor();

CREATE TRIGGER free_sponsor_stand_trg
  AFTER DELETE ON public.sponsor_registrations
  FOR EACH ROW
  EXECUTE FUNCTION public.free_sponsor_stand();

CREATE TRIGGER a2_block_sponsor_taking_stand
  BEFORE UPDATE ON public.stands
  FOR EACH ROW
  EXECUTE FUNCTION public.block_sponsor_taking_stand();

CREATE TRIGGER a3_limit_stands_on_take
  BEFORE UPDATE ON public.stands
  FOR EACH ROW
  EXECUTE FUNCTION public.limit_stands_on_take();

CREATE TRIGGER a_set_sponsor_stand_flag
  BEFORE INSERT OR UPDATE OF sector ON public.stands
  FOR EACH ROW
  EXECUTE FUNCTION public.set_sponsor_stand_flag();

CREATE TRIGGER protect_stand_columns
  BEFORE UPDATE ON public.stands
  FOR EACH ROW
  EXECUTE FUNCTION public.protect_stand_columns();

CREATE POLICY "admins can manage app settings" ON "public"."app_settings"
  FOR ALL
  TO "authenticated"
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

CREATE POLICY "authenticated users can read app settings" ON "public"."app_settings"
  FOR SELECT
  TO "authenticated"
  USING (true);

CREATE POLICY "admins manage categories" ON "public"."categories"
  FOR ALL
  TO "authenticated"
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

CREATE POLICY "anyone can read categories" ON "public"."categories"
  FOR SELECT
  TO "anon", "authenticated"
  USING (true);

CREATE POLICY "admins manage attendance" ON "public"."event_attendance"
  FOR ALL
  TO "authenticated"
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

CREATE POLICY "admins manage requests" ON "public"."event_requests"
  FOR ALL
  TO "authenticated"
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

CREATE POLICY "users create own pending requests" ON "public"."event_requests"
  FOR INSERT
  TO "authenticated"
  WITH CHECK (((user_id = auth.uid()) AND (status = 'pending'::text) AND (NOT (EXISTS ( SELECT 1
   FROM public.events e
  WHERE ((e.id = event_requests.event_id) AND e.requests_paused))))));

CREATE POLICY "users read own requests and admins read all" ON "public"."event_requests"
  FOR SELECT
  TO "authenticated"
  USING (((user_id = auth.uid()) OR public.is_admin()));

CREATE POLICY "admins manage sponsor settings" ON "public"."event_sponsor_settings"
  FOR ALL
  TO "authenticated"
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

CREATE POLICY "Permitir lectura pública de eventos" ON "public"."events"
  FOR SELECT
  TO PUBLIC
  USING (true);

CREATE POLICY "admins can manage events" ON "public"."events"
  FOR ALL
  TO "authenticated"
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

CREATE POLICY "authenticated users can read events" ON "public"."events"
  FOR SELECT
  TO "authenticated"
  USING (true);

CREATE POLICY "admins manage expenses" ON "public"."expenses"
  FOR ALL
  TO "authenticated"
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

CREATE POLICY "admins manage map labels" ON "public"."map_labels"
  FOR ALL
  TO "authenticated"
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

CREATE POLICY "anyone can read map labels" ON "public"."map_labels"
  FOR SELECT
  TO "anon", "authenticated"
  USING (true);

CREATE POLICY "admins insert notification log" ON "public"."notification_log"
  FOR INSERT
  TO "authenticated"
  WITH CHECK (public.is_admin());

CREATE POLICY "sysadmins read notification log" ON "public"."notification_log"
  FOR SELECT
  TO "authenticated"
  USING (public.is_sysadmin(auth.uid()));

CREATE POLICY "admins can delete profiles" ON "public"."profiles"
  FOR DELETE
  TO "authenticated"
  USING (public.is_admin());

CREATE POLICY "insert own profile or admin" ON "public"."profiles"
  FOR INSERT
  TO "authenticated"
  WITH CHECK (((id = auth.uid()) OR public.is_admin()));

CREATE POLICY "select own profile or admin" ON "public"."profiles"
  FOR SELECT
  TO "authenticated"
  USING (((id = auth.uid()) OR public.is_admin()));

CREATE POLICY "update own profile or admin" ON "public"."profiles"
  FOR UPDATE
  TO "authenticated"
  USING (((id = auth.uid()) OR public.is_admin()))
  WITH CHECK (((id = auth.uid()) OR public.is_admin()));

CREATE POLICY "Permitir crear reservas" ON "public"."reservations"
  FOR INSERT
  TO PUBLIC
  WITH CHECK (true);

CREATE POLICY "admins can manage reservations" ON "public"."reservations"
  FOR ALL
  TO "authenticated"
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

CREATE POLICY "users can create own reservations" ON "public"."reservations"
  FOR INSERT
  TO "authenticated"
  WITH CHECK ((user_id = auth.uid()));

CREATE POLICY "users can read own reservations and admins can read all" ON "public"."reservations"
  FOR SELECT
  TO "authenticated"
  USING (((user_id = auth.uid()) OR public.is_admin()));

CREATE POLICY "users can update own pending reservations" ON "public"."reservations"
  FOR UPDATE
  TO "authenticated"
  USING (((user_id = auth.uid()) AND (status = 'pending'::text)))
  WITH CHECK ((user_id = auth.uid()));

CREATE POLICY "Permitir lectura pública de configuración" ON "public"."settings"
  FOR SELECT
  TO PUBLIC
  USING (true);

CREATE POLICY "admins manage sponsor members" ON "public"."sponsor_members"
  FOR ALL
  TO "authenticated"
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

CREATE POLICY "sponsors read own members, admins all" ON "public"."sponsor_members"
  FOR SELECT
  TO "authenticated"
  USING ((public.is_admin() OR (EXISTS ( SELECT 1
   FROM public.sponsor_registrations r
  WHERE ((r.id = sponsor_members.registration_id) AND (r.user_id = auth.uid()))))));

CREATE POLICY "admins manage sponsor registrations" ON "public"."sponsor_registrations"
  FOR ALL
  TO "authenticated"
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

CREATE POLICY "sponsors read own registrations, admins all" ON "public"."sponsor_registrations"
  FOR SELECT
  TO "authenticated"
  USING (((user_id = auth.uid()) OR public.is_admin()));

CREATE POLICY "admins can manage stands" ON "public"."stands"
  FOR ALL
  TO "authenticated"
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

CREATE POLICY "anyone can read stands" ON "public"."stands"
  FOR SELECT
  TO "anon"
  USING ((sector <> 'sponsor'::text));

CREATE POLICY "authenticated users can read stands" ON "public"."stands"
  FOR SELECT
  TO "authenticated"
  USING
    ((public.is_admin() OR ((sector <> 'sponsor'::text) AND (NOT ( SELECT public.is_sponsor_account(auth.uid()) AS is_sponsor_account))) OR ((sector = 'sponsor'::text) AND (EXISTS
    ( SELECT 1
   FROM public.sponsor_registrations r
  WHERE ((r.stand_id = stands.id) AND (r.user_id = auth.uid())))))));

CREATE POLICY "authenticated users can reserve available stands" ON "public"."stands"
  FOR UPDATE
  TO "authenticated"
  USING ((status = 'available'::text))
  WITH CHECK ((status = 'pending'::text));

CREATE POLICY "images: actualizar logueado" ON "storage"."objects"
  FOR UPDATE
  TO PUBLIC
  USING (((bucket_id = 'images'::text) AND (auth.role() = 'authenticated'::text)));

CREATE POLICY "images: borrar logueado" ON "storage"."objects"
  FOR DELETE
  TO PUBLIC
  USING (((bucket_id = 'images'::text) AND (auth.role() = 'authenticated'::text)));

CREATE POLICY "images: lectura pública" ON "storage"."objects"
  FOR SELECT
  TO PUBLIC
  USING ((bucket_id = 'images'::text));

CREATE POLICY "images: subir logueado" ON "storage"."objects"
  FOR INSERT
  TO PUBLIC
  WITH CHECK (((bucket_id = 'images'::text) AND (auth.role() = 'authenticated'::text)));

ALTER PUBLICATION "supabase_realtime" ADD TABLE "public"."event_attendance";

ALTER PUBLICATION "supabase_realtime" ADD TABLE "public"."event_requests";

ALTER PUBLICATION "supabase_realtime" ADD TABLE "public"."map_labels";

ALTER PUBLICATION "supabase_realtime" ADD TABLE "public"."notification_log";

ALTER PUBLICATION "supabase_realtime" ADD TABLE "public"."reservations";

ALTER PUBLICATION "supabase_realtime" ADD TABLE "public"."sponsor_registrations";

ALTER PUBLICATION "supabase_realtime" ADD TABLE "public"."stands";

GRANT EXECUTE ON FUNCTION "public"."assert_stand_quota"(uuid, uuid) TO PUBLIC, "anon", "authenticated";

REVOKE ALL ON FUNCTION "public"."assert_stand_quota"(uuid, uuid) FROM "postgres";

GRANT EXECUTE ON FUNCTION "public"."assert_stand_quota"(uuid, uuid) TO "postgres";

GRANT EXECUTE ON FUNCTION "public"."assert_stand_quota"(uuid, uuid) TO "service_role";

GRANT EXECUTE ON FUNCTION "public"."block_exhibitor_as_sponsor"() TO PUBLIC, "anon", "authenticated";

REVOKE ALL ON FUNCTION "public"."block_exhibitor_as_sponsor"() FROM "postgres";

GRANT EXECUTE ON FUNCTION "public"."block_exhibitor_as_sponsor"() TO "postgres";

GRANT EXECUTE ON FUNCTION "public"."block_exhibitor_as_sponsor"() TO "service_role";

GRANT EXECUTE ON FUNCTION "public"."block_sponsor_reservation"() TO PUBLIC, "anon", "authenticated";

REVOKE ALL ON FUNCTION "public"."block_sponsor_reservation"() FROM "postgres";

GRANT EXECUTE ON FUNCTION "public"."block_sponsor_reservation"() TO "postgres";

GRANT EXECUTE ON FUNCTION "public"."block_sponsor_reservation"() TO "service_role";

GRANT EXECUTE ON FUNCTION "public"."block_sponsor_taking_stand"() TO PUBLIC, "anon", "authenticated";

REVOKE ALL ON FUNCTION "public"."block_sponsor_taking_stand"() FROM "postgres";

GRANT EXECUTE ON FUNCTION "public"."block_sponsor_taking_stand"() TO "postgres";

GRANT EXECUTE ON FUNCTION "public"."block_sponsor_taking_stand"() TO "service_role";

GRANT EXECUTE ON FUNCTION "public"."can_participate"(uuid, uuid) TO PUBLIC, "anon", "authenticated";

REVOKE ALL ON FUNCTION "public"."can_participate"(uuid, uuid) FROM "postgres";

GRANT EXECUTE ON FUNCTION "public"."can_participate"(uuid, uuid) TO "postgres";

GRANT EXECUTE ON FUNCTION "public"."can_participate"(uuid, uuid) TO "service_role";

GRANT EXECUTE ON FUNCTION "public"."force_created_at"() TO PUBLIC, "anon", "authenticated";

REVOKE ALL ON FUNCTION "public"."force_created_at"() FROM "postgres";

GRANT EXECUTE ON FUNCTION "public"."force_created_at"() TO "postgres";

GRANT EXECUTE ON FUNCTION "public"."force_created_at"() TO "service_role";

GRANT EXECUTE ON FUNCTION "public"."free_sponsor_stand"() TO PUBLIC, "anon", "authenticated";

REVOKE ALL ON FUNCTION "public"."free_sponsor_stand"() FROM "postgres";

GRANT EXECUTE ON FUNCTION "public"."free_sponsor_stand"() TO "postgres";

GRANT EXECUTE ON FUNCTION "public"."free_sponsor_stand"() TO "service_role";

GRANT EXECUTE ON FUNCTION "public"."handle_new_user"() TO PUBLIC, "anon", "authenticated";

REVOKE ALL ON FUNCTION "public"."handle_new_user"() FROM "postgres";

GRANT EXECUTE ON FUNCTION "public"."handle_new_user"() TO "postgres";

GRANT EXECUTE ON FUNCTION "public"."handle_new_user"() TO "service_role";

GRANT EXECUTE ON FUNCTION "public"."handle_reservation_stand_sync"() TO PUBLIC, "anon", "authenticated";

REVOKE ALL ON FUNCTION "public"."handle_reservation_stand_sync"() FROM "postgres";

GRANT EXECUTE ON FUNCTION "public"."handle_reservation_stand_sync"() TO "postgres";

GRANT EXECUTE ON FUNCTION "public"."handle_reservation_stand_sync"() TO "service_role";

GRANT EXECUTE ON FUNCTION "public"."is_admin"() TO PUBLIC, "anon", "authenticated";

REVOKE ALL ON FUNCTION "public"."is_admin"() FROM "postgres";

GRANT EXECUTE ON FUNCTION "public"."is_admin"() TO "postgres";

GRANT EXECUTE ON FUNCTION "public"."is_admin"() TO "service_role";

GRANT EXECUTE ON FUNCTION "public"."is_sponsor_account"(uuid) TO PUBLIC, "anon", "authenticated";

REVOKE ALL ON FUNCTION "public"."is_sponsor_account"(uuid) FROM "postgres";

GRANT EXECUTE ON FUNCTION "public"."is_sponsor_account"(uuid) TO "postgres";

GRANT EXECUTE ON FUNCTION "public"."is_sponsor_account"(uuid) TO "service_role";

GRANT EXECUTE ON FUNCTION "public"."is_sysadmin"(uuid) TO PUBLIC, "anon", "authenticated";

REVOKE ALL ON FUNCTION "public"."is_sysadmin"(uuid) FROM "postgres";

GRANT EXECUTE ON FUNCTION "public"."is_sysadmin"(uuid) TO "postgres";

GRANT EXECUTE ON FUNCTION "public"."is_sysadmin"(uuid) TO "service_role";

GRANT EXECUTE ON FUNCTION "public"."limit_stands_on_reserve"() TO PUBLIC, "anon", "authenticated";

REVOKE ALL ON FUNCTION "public"."limit_stands_on_reserve"() FROM "postgres";

GRANT EXECUTE ON FUNCTION "public"."limit_stands_on_reserve"() TO "postgres";

GRANT EXECUTE ON FUNCTION "public"."limit_stands_on_reserve"() TO "service_role";

GRANT EXECUTE ON FUNCTION "public"."limit_stands_on_take"() TO PUBLIC, "anon", "authenticated";

REVOKE ALL ON FUNCTION "public"."limit_stands_on_take"() FROM "postgres";

GRANT EXECUTE ON FUNCTION "public"."limit_stands_on_take"() TO "postgres";

GRANT EXECUTE ON FUNCTION "public"."limit_stands_on_take"() TO "service_role";

GRANT EXECUTE ON FUNCTION "public"."protect_profile_columns"() TO PUBLIC, "anon", "authenticated";

REVOKE ALL ON FUNCTION "public"."protect_profile_columns"() FROM "postgres";

GRANT EXECUTE ON FUNCTION "public"."protect_profile_columns"() TO "postgres";

GRANT EXECUTE ON FUNCTION "public"."protect_profile_columns"() TO "service_role";

GRANT EXECUTE ON FUNCTION "public"."protect_reservation_columns"() TO PUBLIC, "anon", "authenticated";

REVOKE ALL ON FUNCTION "public"."protect_reservation_columns"() FROM "postgres";

GRANT EXECUTE ON FUNCTION "public"."protect_reservation_columns"() TO "postgres";

GRANT EXECUTE ON FUNCTION "public"."protect_reservation_columns"() TO "service_role";

GRANT EXECUTE ON FUNCTION "public"."protect_stand_columns"() TO PUBLIC, "anon", "authenticated";

REVOKE ALL ON FUNCTION "public"."protect_stand_columns"() FROM "postgres";

GRANT EXECUTE ON FUNCTION "public"."protect_stand_columns"() TO "postgres";

GRANT EXECUTE ON FUNCTION "public"."protect_stand_columns"() TO "service_role";

GRANT EXECUTE ON FUNCTION "public"."purge_user_account"(uuid) TO "authenticated";

REVOKE ALL ON FUNCTION "public"."purge_user_account"(uuid) FROM "postgres";

GRANT EXECUTE ON FUNCTION "public"."purge_user_account"(uuid) TO "postgres";

GRANT EXECUTE ON FUNCTION "public"."purge_user_account"(uuid) TO "service_role";

REVOKE ALL ON FUNCTION "public"."register_sponsor"(text, uuid, jsonb) FROM PUBLIC;

GRANT EXECUTE ON FUNCTION "public"."register_sponsor"(text, uuid, jsonb) TO "anon", "authenticated";

REVOKE ALL ON FUNCTION "public"."register_sponsor"(text, uuid, jsonb) FROM "postgres";

GRANT EXECUTE ON FUNCTION "public"."register_sponsor"(text, uuid, jsonb) TO "postgres";

GRANT EXECUTE ON FUNCTION "public"."register_sponsor"(text, uuid, jsonb) TO "service_role";

GRANT EXECUTE ON FUNCTION "public"."set_sponsor_stand_flag"() TO PUBLIC, "anon", "authenticated";

REVOKE ALL ON FUNCTION "public"."set_sponsor_stand_flag"() FROM "postgres";

GRANT EXECUTE ON FUNCTION "public"."set_sponsor_stand_flag"() TO "postgres";

GRANT EXECUTE ON FUNCTION "public"."set_sponsor_stand_flag"() TO "service_role";

REVOKE ALL ON FUNCTION "public"."sponsor_lookup"(text) FROM PUBLIC;

GRANT EXECUTE ON FUNCTION "public"."sponsor_lookup"(text) TO "anon", "authenticated";

REVOKE ALL ON FUNCTION "public"."sponsor_lookup"(text) FROM "postgres";

GRANT EXECUTE ON FUNCTION "public"."sponsor_lookup"(text) TO "postgres";

GRANT EXECUTE ON FUNCTION "public"."sponsor_lookup"(text) TO "service_role";

GRANT EXECUTE ON FUNCTION "public"."sync_stand_status_from_reservations"(uuid) TO PUBLIC, "anon", "authenticated";

REVOKE ALL ON FUNCTION "public"."sync_stand_status_from_reservations"(uuid) FROM "postgres";

GRANT EXECUTE ON FUNCTION "public"."sync_stand_status_from_reservations"(uuid) TO "postgres";

GRANT EXECUTE ON FUNCTION "public"."sync_stand_status_from_reservations"(uuid) TO "service_role";

GRANT EXECUTE ON FUNCTION "public"."validate_birth_date"() TO PUBLIC, "anon", "authenticated";

REVOKE ALL ON FUNCTION "public"."validate_birth_date"() FROM "postgres";

GRANT EXECUTE ON FUNCTION "public"."validate_birth_date"() TO "postgres";

GRANT EXECUTE ON FUNCTION "public"."validate_birth_date"() TO "service_role";

GRANT SELECT, UPDATE, USAGE ON SEQUENCE "public"."settings_id_seq" TO "anon", "authenticated";

REVOKE ALL ON SEQUENCE "public"."settings_id_seq" FROM "postgres";

GRANT SELECT, UPDATE, USAGE ON SEQUENCE "public"."settings_id_seq" TO "postgres";

GRANT SELECT, UPDATE, USAGE ON SEQUENCE "public"."settings_id_seq" TO "service_role";

GRANT DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE "public"."app_settings" TO "anon", "authenticated";

REVOKE ALL ON TABLE "public"."app_settings" FROM "postgres";

GRANT DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE "public"."app_settings" TO "postgres";

GRANT DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE "public"."app_settings" TO "service_role";

GRANT DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE "public"."categories" TO "anon", "authenticated";

REVOKE ALL ON TABLE "public"."categories" FROM "postgres";

GRANT DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE "public"."categories" TO "postgres";

GRANT DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE "public"."categories" TO "service_role";

GRANT DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE "public"."event_attendance" TO "anon", "authenticated";

REVOKE ALL ON TABLE "public"."event_attendance" FROM "postgres";

GRANT DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE "public"."event_attendance" TO "postgres";

GRANT DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE "public"."event_attendance" TO "service_role";

GRANT DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE "public"."event_requests" TO "anon", "authenticated";

REVOKE ALL ON TABLE "public"."event_requests" FROM "postgres";

GRANT DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE "public"."event_requests" TO "postgres";

GRANT DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE "public"."event_requests" TO "service_role";

GRANT DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE "public"."event_sponsor_settings" TO "anon", "authenticated";

REVOKE ALL ON TABLE "public"."event_sponsor_settings" FROM "postgres";

GRANT DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE "public"."event_sponsor_settings" TO "postgres";

GRANT DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE "public"."event_sponsor_settings" TO "service_role";

GRANT DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE "public"."events" TO "anon", "authenticated";

REVOKE ALL ON TABLE "public"."events" FROM "postgres";

GRANT DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE "public"."events" TO "postgres";

GRANT DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE "public"."events" TO "service_role";

GRANT DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE "public"."expenses" TO "anon", "authenticated";

REVOKE ALL ON TABLE "public"."expenses" FROM "postgres";

GRANT DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE "public"."expenses" TO "postgres";

GRANT DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE "public"."expenses" TO "service_role";

GRANT DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE "public"."map_labels" TO "anon", "authenticated";

REVOKE ALL ON TABLE "public"."map_labels" FROM "postgres";

GRANT DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE "public"."map_labels" TO "postgres";

GRANT DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE "public"."map_labels" TO "service_role";

GRANT DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE "public"."notification_log" TO "anon", "authenticated";

REVOKE ALL ON TABLE "public"."notification_log" FROM "postgres";

GRANT DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE "public"."notification_log" TO "postgres";

GRANT DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE "public"."notification_log" TO "service_role";

GRANT DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE "public"."profiles" TO "anon", "authenticated";

REVOKE ALL ON TABLE "public"."profiles" FROM "postgres";

GRANT DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE "public"."profiles" TO "postgres";

GRANT DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE "public"."profiles" TO "service_role";

GRANT DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE "public"."reservations" TO "anon", "authenticated";

REVOKE ALL ON TABLE "public"."reservations" FROM "postgres";

GRANT DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE "public"."reservations" TO "postgres";

GRANT DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE "public"."reservations" TO "service_role";

GRANT DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE "public"."roles" TO "anon", "authenticated";

REVOKE ALL ON TABLE "public"."roles" FROM "postgres";

GRANT DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE "public"."roles" TO "postgres";

GRANT DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE "public"."roles" TO "service_role";

GRANT DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE "public"."settings" TO "anon", "authenticated";

REVOKE ALL ON TABLE "public"."settings" FROM "postgres";

GRANT DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE "public"."settings" TO "postgres";

GRANT DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE "public"."settings" TO "service_role";

GRANT DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE "public"."sponsor_members" TO "anon", "authenticated";

REVOKE ALL ON TABLE "public"."sponsor_members" FROM "postgres";

GRANT DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE "public"."sponsor_members" TO "postgres";

GRANT DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE "public"."sponsor_members" TO "service_role";

GRANT DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE "public"."sponsor_registrations" TO "anon", "authenticated";

REVOKE ALL ON TABLE "public"."sponsor_registrations" FROM "postgres";

GRANT DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE "public"."sponsor_registrations" TO "postgres";

GRANT DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE "public"."sponsor_registrations" TO "service_role";

GRANT DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE "public"."stands" TO "anon", "authenticated";

REVOKE ALL ON TABLE "public"."stands" FROM "postgres";

GRANT DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE "public"."stands" TO "postgres";

GRANT DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE "public"."stands" TO "service_role";

ALTER TABLE "public"."event_attendance"
  ADD CONSTRAINT "event_attendance_checked_by_fkey" FOREIGN KEY (checked_by) REFERENCES auth.users(id) ON DELETE SET NULL;

