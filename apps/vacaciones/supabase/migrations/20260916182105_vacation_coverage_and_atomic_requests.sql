create or replace function private.vacation_coverage_snapshot_internal(
  p_employee_id uuid,
  p_start_date date,
  p_end_date date,
  p_exclude_request_id uuid default null
)
returns jsonb
language plpgsql
stable
security definer
set search_path to ''
as $$
declare
  v_actor_employee_id uuid := private.current_employee_id();
  v_employee public.employees%rowtype;
  v_scope_kind text;
  v_scope_label text;
  v_scope_size integer := 0;
  v_recent_punch_employees integer := 0;
  v_own_timeoff_conflicts integer := 0;
  v_days jsonb := '[]'::jsonb;
  v_min_projected integer;
  v_min_projected_with_pending integer;
  v_max_known_absent integer := 0;
  v_max_pending integer := 0;
  v_latest_sync timestamptz;
begin
  if auth.uid() is null or v_actor_employee_id is null then raise exception 'Authentication required'; end if;
  if p_employee_id is null or p_start_date is null or p_end_date is null or p_end_date < p_start_date then
    return jsonb_build_object('scope', jsonb_build_object('kind', 'unknown', 'active_employees', 0), 'days', '[]'::jsonb, 'own_time_off_conflicts', 0);
  end if;
  if p_employee_id <> v_actor_employee_id and not private.can_manage_employee(p_employee_id) then raise exception 'Not authorized'; end if;

  select * into v_employee from public.employees e where e.id = p_employee_id and e.active = true;
  if not found then raise exception 'Employee not found'; end if;

  if v_employee.supervisor_id is not null then
    v_scope_kind := 'supervisor';
    v_scope_label := 'Equipo del supervisor';
  else
    v_scope_kind := 'department';
    v_scope_label := coalesce(v_employee.department, 'Sin departamento');
  end if;

  with scope_employees as (
    select e.id from public.employees e
    where e.active = true and (
      (v_employee.supervisor_id is not null and e.supervisor_id = v_employee.supervisor_id)
      or (v_employee.supervisor_id is null and e.department is not distinct from v_employee.department)
    )
  )
  select count(*)::integer into v_scope_size from scope_employees;

  with scope_employees as (
    select e.id from public.employees e
    where e.active = true and (
      (v_employee.supervisor_id is not null and e.supervisor_id = v_employee.supervisor_id)
      or (v_employee.supervisor_id is null and e.department is not distinct from v_employee.department)
    )
  )
  select count(distinct p.employee_id)::integer into v_recent_punch_employees
  from public.geovictoria_punches p join scope_employees se on se.id = p.employee_id
  where p.punch_at >= now() - interval '7 days';

  select count(*)::integer into v_own_timeoff_conflicts
  from public.geovictoria_time_off t
  where t.employee_id = p_employee_id and t.start_at is not null and t.end_at is not null
    and t.start_at::date <= p_end_date and t.end_at::date >= p_start_date;

  select max(x.synced_at) into v_latest_sync
  from (
    select max(synced_at) as synced_at from public.geovictoria_attendance_periods
    union all select max(synced_at) from public.geovictoria_punches
    union all select max(synced_at) from public.geovictoria_time_off
    union all select max(synced_at) from public.geovictoria_overtime
  ) x;

  with scope_employees as (
    select e.id from public.employees e
    where e.active = true and (
      (v_employee.supervisor_id is not null and e.supervisor_id = v_employee.supervisor_id)
      or (v_employee.supervisor_id is null and e.department is not distinct from v_employee.department)
    )
  ), business_days as (
    select d.day_value::date as day
    from generate_series(p_start_date, p_end_date, interval '1 day') d(day_value)
    where extract(isodow from d.day_value) < 6
      and not exists (
        select 1 from public.holidays h
        where h.active = true and h.holiday_date = d.day_value::date
          and (h.applies_to_department is null or h.applies_to_department = v_employee.department)
      )
  ), approved_vacation as (
    select bd.day, vr.employee_id from business_days bd
    join public.vacation_requests vr on bd.day between vr.start_date and vr.end_date
    join scope_employees se on se.id = vr.employee_id
    where vr.status = 'approved' and vr.employee_id <> p_employee_id
      and (p_exclude_request_id is null or vr.id <> p_exclude_request_id)
  ), external_timeoff as (
    select bd.day, t.employee_id from business_days bd
    join public.geovictoria_time_off t
      on t.start_at is not null and t.end_at is not null and bd.day between t.start_at::date and t.end_at::date
    join scope_employees se on se.id = t.employee_id
    where t.employee_id <> p_employee_id
  ), known_absent as (
    select day, employee_id from approved_vacation
    union select day, employee_id from external_timeoff
  ), pending_vacation as (
    select bd.day, vr.employee_id from business_days bd
    join public.vacation_requests vr on bd.day between vr.start_date and vr.end_date
    join scope_employees se on se.id = vr.employee_id
    where vr.status = 'pending' and vr.employee_id <> p_employee_id
      and (p_exclude_request_id is null or vr.id <> p_exclude_request_id)
  ), all_possible_absent as (
    select day, employee_id from known_absent
    union select day, employee_id from pending_vacation
  ), daily as (
    select bd.day,
      count(distinct ka.employee_id)::integer as known_absent,
      count(distinct pv.employee_id)::integer as pending_requests,
      count(distinct apa.employee_id)::integer as known_plus_pending
    from business_days bd
    left join known_absent ka on ka.day = bd.day
    left join pending_vacation pv on pv.day = bd.day
    left join all_possible_absent apa on apa.day = bd.day
    group by bd.day
  )
  select coalesce(jsonb_agg(jsonb_build_object(
      'date', day,
      'known_absent', known_absent,
      'pending_requests', pending_requests,
      'projected_available', greatest(v_scope_size - known_absent - 1, 0),
      'projected_if_pending_approved', greatest(v_scope_size - known_plus_pending - 1, 0)
    ) order by day), '[]'::jsonb),
    min(greatest(v_scope_size - known_absent - 1, 0)),
    min(greatest(v_scope_size - known_plus_pending - 1, 0)),
    coalesce(max(known_absent), 0), coalesce(max(pending_requests), 0)
  into v_days, v_min_projected, v_min_projected_with_pending, v_max_known_absent, v_max_pending
  from daily;

  return jsonb_build_object(
    'scope', jsonb_build_object('kind', v_scope_kind, 'label', v_scope_label, 'active_employees', v_scope_size, 'supervisor_linked', v_employee.supervisor_id is not null),
    'known_absent_max_without_request', v_max_known_absent,
    'pending_competition_max', v_max_pending,
    'projected_available_min', v_min_projected,
    'projected_if_pending_approved_min', v_min_projected_with_pending,
    'own_time_off_conflicts', v_own_timeoff_conflicts,
    'recently_observed_with_punches_7d', v_recent_punch_employees,
    'data_freshness', v_latest_sync,
    'days', v_days
  );
end;
$$;

revoke execute on function private.vacation_coverage_snapshot_internal(uuid, date, date, uuid) from public, anon, authenticated;
grant execute on function private.vacation_coverage_snapshot_internal(uuid, date, date, uuid) to service_role;

create or replace function private.check_vacation_availability_internal(
  p_employee_id uuid, p_start_date date, p_end_date date, p_exclude_request_id uuid default null
)
returns jsonb
language plpgsql
security definer
set search_path to ''
as $$
declare
  v_actor_employee_id uuid := private.current_employee_id();
  v_employee public.employees%rowtype;
  v_rule public.availability_rules%rowtype;
  v_days integer := 0;
  v_balance numeric := 0;
  v_committed numeric := 0;
  v_remaining numeric := 0;
  v_coverage jsonb;
  v_capacity_conflict boolean := false;
  v_reasons text[] := array[]::text[];
  v_warnings text[] := array[]::text[];
begin
  if auth.uid() is null or v_actor_employee_id is null then raise exception 'Authentication required'; end if;
  if p_employee_id is null or p_start_date is null or p_end_date is null or p_end_date < p_start_date then
    return jsonb_build_object('available', false, 'business_days', 0, 'remaining_after_request', 0, 'reasons', jsonb_build_array('Rango de fechas inválido'), 'warnings', '[]'::jsonb);
  end if;
  if p_employee_id <> v_actor_employee_id and not private.can_manage_employee(p_employee_id) then raise exception 'Not authorized'; end if;

  select * into v_employee from public.employees e where e.id = p_employee_id and e.active = true;
  if not found then raise exception 'Employee not found'; end if;

  if extract(year from p_start_date) <> extract(year from p_end_date) then
    v_reasons := array_append(v_reasons, 'Las solicitudes que cruzan de año deben dividirse en dos solicitudes');
  end if;

  v_days := public.calculate_business_days(p_start_date, p_end_date, v_employee.department);
  if v_days <= 0 then v_reasons := array_append(v_reasons, 'El rango seleccionado no contiene días laborables disponibles'); end if;

  select * into v_rule from public.availability_rules r where r.department = v_employee.department;

  if exists (
    select 1 from public.vacation_requests r
    where r.employee_id = p_employee_id and r.status in ('pending','approved')
      and (p_exclude_request_id is null or r.id <> p_exclude_request_id)
      and daterange(r.start_date, r.end_date, '[]') && daterange(p_start_date, p_end_date, '[]')
  ) then
    v_reasons := array_append(v_reasons, 'Ya existe una solicitud pendiente o aprobada que se cruza con esas fechas');
  end if;

  if v_rule.id is not null then
    if p_start_date < current_date + v_rule.min_notice_days then
      v_reasons := array_append(v_reasons, format('Debes solicitar con al menos %s días de anticipación', v_rule.min_notice_days));
    end if;
    if v_rule.max_consecutive_business_days is not null and v_days > v_rule.max_consecutive_business_days then
      v_reasons := array_append(v_reasons, format('El máximo permitido es %s días laborables consecutivos', v_rule.max_consecutive_business_days));
    end if;
  else
    v_warnings := array_append(v_warnings, 'No hay una regla de capacidad configurada para este departamento; la cobertura se muestra como referencia');
  end if;

  select coalesce(b.entitlement_days + b.carry_over_days + b.adjustment_days, 0) into v_balance
  from public.vacation_balances b
  where b.employee_id = p_employee_id and b.year = extract(year from p_start_date)::integer;
  if not found then
    v_reasons := array_append(v_reasons, 'El saldo de vacaciones para este año aún no está configurado');
    v_balance := 0;
  end if;

  select coalesce(sum(r.business_days), 0) into v_committed
  from public.vacation_requests r
  where r.employee_id = p_employee_id and r.status in ('pending','approved')
    and (p_exclude_request_id is null or r.id <> p_exclude_request_id)
    and extract(year from r.start_date)::integer = extract(year from p_start_date)::integer;

  v_remaining := greatest(v_balance - v_committed - v_days, 0);
  if v_days > greatest(v_balance - v_committed, 0) then
    v_reasons := array_append(v_reasons, 'El saldo disponible no cubre todos los días seleccionados');
  end if;

  v_coverage := private.vacation_coverage_snapshot_internal(p_employee_id, p_start_date, p_end_date, p_exclude_request_id);

  if coalesce((v_coverage ->> 'own_time_off_conflicts')::integer, 0) > 0 then
    v_reasons := array_append(v_reasons, 'GeoVictoria registra un permiso o licencia que se cruza con esas fechas');
  end if;
  if not coalesce((v_coverage -> 'scope' ->> 'supervisor_linked')::boolean, false) then
    v_warnings := array_append(v_warnings, 'La jerarquía de supervisor aún no está enlazada; la cobertura se calcula por departamento');
  end if;
  if coalesce((v_coverage ->> 'projected_available_min')::integer, 1) <= 1 then
    v_warnings := array_append(v_warnings, 'La cobertura proyectada queda en una persona o menos en al menos un día');
  end if;
  if coalesce((v_coverage ->> 'pending_competition_max')::integer, 0) > 0 then
    v_warnings := array_append(v_warnings, 'Hay otras solicitudes pendientes que podrían reducir la cobertura si también se aprueban');
  end if;

  if v_rule.id is not null and v_rule.max_concurrent_absences is not null then
    v_capacity_conflict := coalesce((v_coverage ->> 'known_absent_max_without_request')::integer, 0) >= v_rule.max_concurrent_absences;
  end if;
  if v_capacity_conflict then
    v_reasons := array_append(v_reasons, 'El equipo alcanzó su capacidad máxima de ausencias considerando vacaciones aprobadas y permisos de GeoVictoria');
  end if;

  return jsonb_build_object(
    'available', cardinality(v_reasons) = 0,
    'business_days', v_days,
    'balance_total', v_balance,
    'committed_days', v_committed,
    'remaining_after_request', v_remaining,
    'reasons', to_jsonb(v_reasons),
    'warnings', to_jsonb(v_warnings),
    'coverage', v_coverage
  );
end;
$$;

create or replace function private.create_vacation_request_internal(p_start_date date, p_end_date date, p_note text default null)
returns public.vacation_requests
language plpgsql
security definer
set search_path to ''
as $$
declare
  v_employee_id uuid := private.current_employee_id();
  v_availability jsonb;
  v_request public.vacation_requests%rowtype;
begin
  if auth.uid() is null or v_employee_id is null then raise exception 'Authentication required'; end if;
  perform pg_advisory_xact_lock(hashtextextended('vacation-employee:' || v_employee_id::text, 0));
  v_availability := private.check_vacation_availability_internal(v_employee_id, p_start_date, p_end_date, null);
  if not coalesce((v_availability ->> 'available')::boolean, false) then
    raise exception 'Dates are not available: %', coalesce(v_availability -> 'reasons', '[]'::jsonb)::text;
  end if;
  insert into public.vacation_requests(employee_id, start_date, end_date, employee_note)
  values (v_employee_id, p_start_date, p_end_date, nullif(btrim(p_note), '')) returning * into v_request;
  return v_request;
end;
$$;

revoke execute on function private.create_vacation_request_internal(date, date, text) from public, anon, authenticated;
grant execute on function private.create_vacation_request_internal(date, date, text) to service_role;

create or replace function public.create_vacation_request(p_start_date date, p_end_date date, p_note text default null)
returns public.vacation_requests
language sql
security invoker
set search_path to ''
as $$ select private.create_vacation_request_internal(p_start_date, p_end_date, p_note); $$;

revoke execute on function public.create_vacation_request(date, date, text) from public, anon;
grant execute on function public.create_vacation_request(date, date, text) to authenticated;
revoke insert on table public.vacation_requests from authenticated;
drop policy if exists vacation_requests_insert_policy on public.vacation_requests;

create or replace function private.review_vacation_request_internal(p_request_id uuid, p_decision text, p_note text default null)
returns public.vacation_requests
language plpgsql
security definer
set search_path to ''
as $$
declare
  v_request public.vacation_requests%rowtype;
  v_actor_employee_id uuid := private.current_employee_id();
  v_availability jsonb;
  v_department text;
  v_supervisor_id uuid;
  v_lock_key text;
begin
  if auth.uid() is null or v_actor_employee_id is null then raise exception 'Authentication required'; end if;
  if p_decision not in ('approved','rejected') then raise exception 'Invalid decision'; end if;

  select * into v_request from public.vacation_requests r where r.id = p_request_id for update;
  if not found then raise exception 'Request not found'; end if;
  if v_request.status <> 'pending' then raise exception 'Request is no longer pending'; end if;
  if not private.can_manage_employee(v_request.employee_id) then raise exception 'Not authorized'; end if;

  if p_decision = 'approved' then
    select e.department, e.supervisor_id into v_department, v_supervisor_id from public.employees e where e.id = v_request.employee_id;
    v_lock_key := case
      when v_supervisor_id is not null then 'vacation-approval:supervisor:' || v_supervisor_id::text
      else 'vacation-approval:department:' || coalesce(v_department, '__none__')
    end;
    perform pg_advisory_xact_lock(hashtextextended(v_lock_key, 0));
    v_availability := private.check_vacation_availability_internal(v_request.employee_id, v_request.start_date, v_request.end_date, v_request.id);
    if not coalesce((v_availability ->> 'available')::boolean, false) then
      raise exception 'Dates are no longer available: %', coalesce(v_availability -> 'reasons', '[]'::jsonb)::text;
    end if;
  end if;

  update public.vacation_requests
  set status = p_decision, reviewed_by = v_actor_employee_id, review_note = nullif(btrim(p_note), ''), reviewed_at = now(), updated_at = now()
  where id = p_request_id returning * into v_request;
  return v_request;
end;
$$;

revoke execute on function public.check_vacation_availability(uuid, date, date) from public, anon;
grant execute on function public.check_vacation_availability(uuid, date, date) to authenticated;
revoke execute on function public.review_vacation_request(uuid, text, text) from public, anon;
grant execute on function public.review_vacation_request(uuid, text, text) to authenticated;

create index if not exists geovictoria_time_off_employee_period_idx
  on public.geovictoria_time_off (employee_id, start_at, end_at)
  where employee_id is not null and start_at is not null and end_at is not null;
