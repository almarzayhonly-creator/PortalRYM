-- Draft schema for RYM Vacaciones.
-- Keep this file as the reviewed source draft. Generate the real migration with Supabase CLI before production rollout.

create schema if not exists private;

create table if not exists public.employees (
  id uuid primary key default gen_random_uuid(),
  auth_user_id uuid unique references auth.users(id) on delete set null,
  geovictoria_id text not null unique,
  email text,
  full_name text not null,
  department text,
  position text,
  supervisor_geovictoria_id text,
  supervisor_id uuid references public.employees(id) on delete set null,
  role text not null default 'employee' check (role in ('employee','hr','admin')),
  active boolean not null default true,
  synced_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create unique index if not exists employees_email_lower_uidx on public.employees (lower(email)) where email is not null;
create index if not exists employees_supervisor_idx on public.employees (supervisor_id) where active;
create index if not exists employees_department_idx on public.employees (department) where active;

create table if not exists public.vacation_balances (
  employee_id uuid not null references public.employees(id) on delete cascade,
  year integer not null,
  entitlement_days numeric(6,2) not null default 0,
  carry_over_days numeric(6,2) not null default 0,
  adjustment_days numeric(6,2) not null default 0,
  updated_at timestamptz not null default now(),
  primary key (employee_id, year)
);

create table if not exists public.holidays (
  holiday_date date primary key,
  name text not null,
  applies_to_department text,
  active boolean not null default true
);

create table if not exists public.availability_rules (
  id uuid primary key default gen_random_uuid(),
  department text not null unique,
  max_concurrent_absences integer check (max_concurrent_absences is null or max_concurrent_absences > 0),
  min_notice_days integer not null default 0 check (min_notice_days >= 0),
  max_consecutive_business_days integer check (max_consecutive_business_days is null or max_consecutive_business_days > 0),
  updated_at timestamptz not null default now()
);

create table if not exists public.vacation_requests (
  id uuid primary key default gen_random_uuid(),
  employee_id uuid not null references public.employees(id) on delete restrict,
  start_date date not null,
  end_date date not null,
  business_days integer not null default 0 check (business_days >= 0),
  status text not null default 'pending' check (status in ('pending','approved','rejected','cancelled')),
  employee_note text,
  reviewed_by uuid references public.employees(id) on delete set null,
  review_note text,
  requested_at timestamptz not null default now(),
  reviewed_at timestamptz,
  updated_at timestamptz not null default now(),
  check (end_date >= start_date)
);

create index if not exists vacation_requests_employee_status_idx on public.vacation_requests (employee_id, status, start_date desc);
create index if not exists vacation_requests_active_range_idx on public.vacation_requests (start_date, end_date) where status in ('pending','approved');

create table if not exists public.vacation_request_events (
  id bigint generated always as identity primary key,
  request_id uuid not null references public.vacation_requests(id) on delete cascade,
  actor_employee_id uuid references public.employees(id) on delete set null,
  event_type text not null,
  old_status text,
  new_status text,
  note text,
  created_at timestamptz not null default now()
);

create index if not exists vacation_request_events_request_idx on public.vacation_request_events (request_id, created_at desc);

create or replace function private.current_employee_id()
returns uuid
language sql
stable
security definer
set search_path = public, private, pg_temp
as $$
  select id from public.employees where auth_user_id = auth.uid() and active = true limit 1;
$$;

create or replace function private.is_hr_admin()
returns boolean
language sql
stable
security definer
set search_path = public, private, pg_temp
as $$
  select exists (
    select 1 from public.employees
    where auth_user_id = auth.uid() and active = true and role in ('hr','admin')
  );
$$;

create or replace function private.can_manage_employee(p_employee_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public, private, pg_temp
as $$
  select private.is_hr_admin() or exists (
    select 1 from public.employees target
    where target.id = p_employee_id
      and target.supervisor_id = private.current_employee_id()
      and target.active = true
  );
$$;

revoke all on function private.current_employee_id() from public;
revoke all on function private.is_hr_admin() from public;
revoke all on function private.can_manage_employee(uuid) from public;
grant execute on function private.current_employee_id() to authenticated;
grant execute on function private.is_hr_admin() to authenticated;
grant execute on function private.can_manage_employee(uuid) to authenticated;

create or replace function public.claim_employee_profile()
returns uuid
language plpgsql
security definer
set search_path = public, auth, pg_temp
as $$
declare
  v_uid uuid := auth.uid();
  v_email text;
  v_employee_id uuid;
begin
  if v_uid is null then raise exception 'Authentication required'; end if;
  select email into v_email from auth.users where id = v_uid;
  if v_email is null then raise exception 'Authenticated user has no email'; end if;

  update public.employees
     set auth_user_id = v_uid, updated_at = now()
   where id = (
     select id from public.employees
      where active = true
        and lower(email) = lower(v_email)
        and (auth_user_id is null or auth_user_id = v_uid)
      limit 1
   )
  returning id into v_employee_id;

  if v_employee_id is null then
    select id into v_employee_id from public.employees where auth_user_id = v_uid limit 1;
  end if;
  if v_employee_id is null then raise exception 'No active employee matches this corporate email'; end if;
  return v_employee_id;
end;
$$;

revoke all on function public.claim_employee_profile() from public, anon;
grant execute on function public.claim_employee_profile() to authenticated;

create or replace function public.relink_geovictoria_supervisors()
returns integer
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare v_count integer;
begin
  update public.employees e
     set supervisor_id = s.id,
         updated_at = now()
    from public.employees s
   where e.supervisor_geovictoria_id is not null
     and s.geovictoria_id = e.supervisor_geovictoria_id
     and e.id <> s.id
     and e.supervisor_id is distinct from s.id;
  get diagnostics v_count = row_count;
  return v_count;
end;
$$;

revoke all on function public.relink_geovictoria_supervisors() from public, anon, authenticated;
grant execute on function public.relink_geovictoria_supervisors() to service_role;

create or replace function public.calculate_business_days(p_start date, p_end date, p_department text)
returns integer
language sql
stable
security invoker
as $$
  select count(*)::integer
  from generate_series(p_start, p_end, interval '1 day') d
  where extract(isodow from d) < 6
    and not exists (
      select 1 from public.holidays h
      where h.active = true
        and h.holiday_date = d::date
        and (h.applies_to_department is null or h.applies_to_department = p_department)
    );
$$;

create or replace function public.set_vacation_business_days()
returns trigger
language plpgsql
security invoker
as $$
declare v_department text;
begin
  select department into v_department from public.employees where id = new.employee_id;
  new.business_days := public.calculate_business_days(new.start_date, new.end_date, v_department);
  new.updated_at := now();
  return new;
end;
$$;

drop trigger if exists vacation_requests_business_days_trg on public.vacation_requests;
create trigger vacation_requests_business_days_trg before insert or update of start_date, end_date on public.vacation_requests for each row execute function public.set_vacation_business_days();

create or replace function public.check_vacation_availability(p_employee_id uuid, p_start_date date, p_end_date date)
returns jsonb
language plpgsql
security definer
set search_path = public, private, pg_temp
as $$
declare
  v_employee public.employees%rowtype;
  v_days integer;
  v_rule public.availability_rules%rowtype;
  v_balance numeric := 0;
  v_committed numeric := 0;
  v_capacity_conflict boolean := false;
  v_reasons text[] := '{}';
begin
  if p_start_date is null or p_end_date is null or p_end_date < p_start_date then
    return jsonb_build_object('available', false, 'business_days', 0, 'reasons', jsonb_build_array('Rango de fechas inválido'));
  end if;

  if p_employee_id <> private.current_employee_id() and not private.can_manage_employee(p_employee_id) then
    raise exception 'Not authorized';
  end if;

  select * into v_employee from public.employees where id = p_employee_id and active = true;
  if not found then raise exception 'Employee not found'; end if;

  v_days := public.calculate_business_days(p_start_date, p_end_date, v_employee.department);
  select * into v_rule from public.availability_rules where department = v_employee.department;

  if exists (
    select 1 from public.vacation_requests r
    where r.employee_id = p_employee_id
      and r.status in ('pending','approved')
      and daterange(r.start_date, r.end_date, '[]') && daterange(p_start_date, p_end_date, '[]')
  ) then v_reasons := array_append(v_reasons, 'Ya tienes una solicitud pendiente o aprobada que se cruza con esas fechas'); end if;

  if v_rule.min_notice_days is not null and p_start_date < current_date + v_rule.min_notice_days then
    v_reasons := array_append(v_reasons, format('Debes solicitar con al menos %s días de anticipación', v_rule.min_notice_days));
  end if;

  if v_rule.max_consecutive_business_days is not null and v_days > v_rule.max_consecutive_business_days then
    v_reasons := array_append(v_reasons, format('El máximo permitido es %s días laborables consecutivos', v_rule.max_consecutive_business_days));
  end if;

  select coalesce(entitlement_days + carry_over_days + adjustment_days, 0)
    into v_balance
    from public.vacation_balances
   where employee_id = p_employee_id and year = extract(year from p_start_date)::integer;

  select coalesce(sum(business_days), 0)
    into v_committed
    from public.vacation_requests
   where employee_id = p_employee_id
     and status in ('pending','approved')
     and extract(year from start_date)::integer = extract(year from p_start_date)::integer;

  if v_days > greatest(v_balance - v_committed, 0) then
    v_reasons := array_append(v_reasons, 'El saldo disponible no cubre todos los días seleccionados');
  end if;

  if v_rule.max_concurrent_absences is not null then
    select exists (
      select 1
      from generate_series(p_start_date, p_end_date, interval '1 day') d
      where extract(isodow from d) < 6
        and (
          select count(distinct r.employee_id)
          from public.vacation_requests r
          join public.employees e on e.id = r.employee_id
          where r.status = 'approved'
            and e.department = v_employee.department
            and r.employee_id <> p_employee_id
            and d::date between r.start_date and r.end_date
        ) >= v_rule.max_concurrent_absences
    ) into v_capacity_conflict;
  end if;

  if v_capacity_conflict then v_reasons := array_append(v_reasons, 'El equipo ya alcanzó su capacidad máxima de ausencias en al menos uno de esos días'); end if;

  return jsonb_build_object(
    'available', cardinality(v_reasons) = 0,
    'business_days', v_days,
    'remaining_after_request', greatest(v_balance - v_committed - v_days, 0),
    'reasons', to_jsonb(v_reasons)
  );
end;
$$;

revoke all on function public.check_vacation_availability(uuid,date,date) from public, anon;
grant execute on function public.check_vacation_availability(uuid,date,date) to authenticated;

create or replace function public.review_vacation_request(p_request_id uuid, p_decision text, p_note text default null)
returns public.vacation_requests
language plpgsql
security definer
set search_path = public, private, pg_temp
as $$
declare
  v_request public.vacation_requests%rowtype;
  v_actor uuid := private.current_employee_id();
begin
  if p_decision not in ('approved','rejected') then raise exception 'Invalid decision'; end if;
  select * into v_request from public.vacation_requests where id = p_request_id for update;
  if not found then raise exception 'Request not found'; end if;
  if v_request.status <> 'pending' then raise exception 'Request is no longer pending'; end if;
  if not private.can_manage_employee(v_request.employee_id) then raise exception 'Not authorized'; end if;

  if p_decision = 'approved' then
    if not coalesce((public.check_vacation_availability(v_request.employee_id, v_request.start_date, v_request.end_date)->>'available')::boolean, false) then
      -- Existing request overlaps itself, so availability is recalculated below excluding this request via temporary status.
      update public.vacation_requests set status = 'cancelled' where id = p_request_id;
      if not coalesce((public.check_vacation_availability(v_request.employee_id, v_request.start_date, v_request.end_date)->>'available')::boolean, false) then
        update public.vacation_requests set status = 'pending' where id = p_request_id;
        raise exception 'Dates are no longer available';
      end if;
      update public.vacation_requests set status = 'pending' where id = p_request_id;
    end if;
  end if;

  update public.vacation_requests
     set status = p_decision,
         reviewed_by = v_actor,
         review_note = p_note,
         reviewed_at = now(),
         updated_at = now()
   where id = p_request_id
  returning * into v_request;
  return v_request;
end;
$$;

revoke all on function public.review_vacation_request(uuid,text,text) from public, anon;
grant execute on function public.review_vacation_request(uuid,text,text) to authenticated;

create or replace function public.log_vacation_request_event()
returns trigger
language plpgsql
security definer
set search_path = public, private, pg_temp
as $$
begin
  insert into public.vacation_request_events(request_id, actor_employee_id, event_type, old_status, new_status, note)
  values (new.id, private.current_employee_id(), case when tg_op = 'INSERT' then 'created' else 'status_changed' end, case when tg_op = 'UPDATE' then old.status end, new.status, new.review_note);
  return new;
end;
$$;

drop trigger if exists vacation_request_events_trg on public.vacation_requests;
create trigger vacation_request_events_trg after insert or update of status on public.vacation_requests for each row execute function public.log_vacation_request_event();

alter table public.employees enable row level security;
alter table public.vacation_balances enable row level security;
alter table public.holidays enable row level security;
alter table public.availability_rules enable row level security;
alter table public.vacation_requests enable row level security;
alter table public.vacation_request_events enable row level security;

revoke all on table public.employees, public.vacation_balances, public.holidays, public.availability_rules, public.vacation_requests, public.vacation_request_events from anon, authenticated;
grant select on public.employees, public.vacation_balances, public.holidays, public.availability_rules, public.vacation_requests, public.vacation_request_events to authenticated;
grant insert on public.vacation_requests to authenticated;

drop policy if exists employees_read_policy on public.employees;
create policy employees_read_policy on public.employees for select to authenticated using (id = private.current_employee_id() or private.can_manage_employee(id));

drop policy if exists balances_read_policy on public.vacation_balances;
create policy balances_read_policy on public.vacation_balances for select to authenticated using (employee_id = private.current_employee_id() or private.can_manage_employee(employee_id));

drop policy if exists holidays_read_policy on public.holidays;
create policy holidays_read_policy on public.holidays for select to authenticated using (active = true);

drop policy if exists availability_rules_read_policy on public.availability_rules;
create policy availability_rules_read_policy on public.availability_rules for select to authenticated using (true);

drop policy if exists vacation_requests_read_policy on public.vacation_requests;
create policy vacation_requests_read_policy on public.vacation_requests for select to authenticated using (employee_id = private.current_employee_id() or private.can_manage_employee(employee_id));

drop policy if exists vacation_requests_insert_policy on public.vacation_requests;
create policy vacation_requests_insert_policy on public.vacation_requests for insert to authenticated with check (employee_id = private.current_employee_id() and status = 'pending');

drop policy if exists vacation_request_events_read_policy on public.vacation_request_events;
create policy vacation_request_events_read_policy on public.vacation_request_events for select to authenticated using (exists (select 1 from public.vacation_requests r where r.id = request_id));
