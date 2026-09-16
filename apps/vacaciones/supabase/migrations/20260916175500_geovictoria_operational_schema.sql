begin;

alter table private.integration_sync_log enable row level security;
revoke all on table private.integration_sync_log from anon, authenticated;
grant select, insert, update, delete on table private.integration_sync_log to service_role;

create policy integration_sync_log_service_role_all
on private.integration_sync_log
for all
to service_role
using (true)
with check (true);

create table public.geovictoria_shifts (
  id text primary key,
  start_time text,
  max_start_time text,
  exit_time text,
  shift_type text,
  fixed_shift_hours text,
  shift_display text,
  break_minutes text,
  break_start text,
  break_end text,
  status text,
  custom text,
  raw_data jsonb not null default '{}'::jsonb,
  synced_at timestamptz not null default now()
);

create table public.geovictoria_profiles (
  profile_id text primary key,
  profile_name text not null,
  is_common boolean,
  raw_data jsonb not null default '{}'::jsonb,
  synced_at timestamptz not null default now()
);

create table public.geovictoria_positions (
  identifier text primary key,
  description text,
  critical boolean,
  state text,
  raw_data jsonb not null default '{}'::jsonb,
  synced_at timestamptz not null default now()
);

create table public.geovictoria_groups (
  description text primary key,
  raw_data jsonb not null default '{}'::jsonb,
  synced_at timestamptz not null default now()
);

create table public.geovictoria_timeoff_types (
  id text primary key,
  description text,
  status text,
  is_payable text,
  external_id text,
  is_partial boolean,
  length_in_hours text,
  is_by_hours text,
  partial_type text,
  raw_data jsonb not null default '{}'::jsonb,
  synced_at timestamptz not null default now()
);

create table public.geovictoria_attendance_periods (
  employee_id uuid not null references public.employees(id) on delete cascade,
  period_start date not null,
  period_end date not null,
  total_worked_hours text,
  worked_days integer,
  non_worked_days integer,
  absences integer,
  holidays integer,
  vacation integer,
  days_leave_with_pay integer,
  days_leave_without_pay integer,
  absence_days_without_justification integer,
  absence_days_license integer,
  worked_sundays integer,
  worked_holidays integer,
  days_attended integer,
  planned_interval jsonb not null default '[]'::jsonb,
  extra_time_values jsonb not null default '[]'::jsonb,
  raw_data jsonb not null default '{}'::jsonb,
  synced_at timestamptz not null default now(),
  primary key (employee_id, period_start, period_end)
);

create table public.geovictoria_punches (
  fingerprint text primary key,
  employee_id uuid not null references public.employees(id) on delete cascade,
  punch_id text,
  punch_at_raw text not null,
  punch_at timestamptz,
  punch_type text,
  origin text,
  group_description text,
  upload_date_raw text,
  upload_at timestamptz,
  shift_punch_type text,
  assigned_in_book boolean,
  box_sn text,
  task_id text,
  project_id text,
  checksum text,
  raw_data jsonb not null default '{}'::jsonb,
  synced_at timestamptz not null default now()
);
create unique index geovictoria_punches_punch_id_uidx
  on public.geovictoria_punches (punch_id)
  where punch_id is not null and punch_id <> '';
create index geovictoria_punches_employee_time_idx
  on public.geovictoria_punches (employee_id, punch_at desc);

create table public.geovictoria_overtime (
  fingerprint text primary key,
  employee_id uuid not null references public.employees(id) on delete cascade,
  work_date_raw text not null,
  work_date date,
  shift_external_id text,
  extra_time_before text,
  extra_time_after text,
  approved_overtime_before text,
  approved_overtime_after text,
  raw_data jsonb not null default '{}'::jsonb,
  synced_at timestamptz not null default now()
);
create index geovictoria_overtime_employee_date_idx
  on public.geovictoria_overtime (employee_id, work_date desc);

create table public.geovictoria_time_off (
  fingerprint text primary key,
  employee_id uuid references public.employees(id) on delete cascade,
  external_id text,
  type_id text,
  type_description text,
  start_at_raw text,
  end_at_raw text,
  start_at timestamptz,
  end_at timestamptz,
  status text,
  raw_data jsonb not null default '{}'::jsonb,
  synced_at timestamptz not null default now()
);
create index geovictoria_time_off_employee_start_idx
  on public.geovictoria_time_off (employee_id, start_at desc);

alter table public.geovictoria_shifts enable row level security;
alter table public.geovictoria_profiles enable row level security;
alter table public.geovictoria_positions enable row level security;
alter table public.geovictoria_groups enable row level security;
alter table public.geovictoria_timeoff_types enable row level security;
alter table public.geovictoria_attendance_periods enable row level security;
alter table public.geovictoria_punches enable row level security;
alter table public.geovictoria_overtime enable row level security;
alter table public.geovictoria_time_off enable row level security;

revoke all on table public.geovictoria_shifts, public.geovictoria_profiles, public.geovictoria_positions, public.geovictoria_groups, public.geovictoria_timeoff_types, public.geovictoria_attendance_periods, public.geovictoria_punches, public.geovictoria_overtime, public.geovictoria_time_off from anon, authenticated;

grant select on table public.geovictoria_shifts, public.geovictoria_profiles, public.geovictoria_positions, public.geovictoria_groups, public.geovictoria_timeoff_types to authenticated;
grant select on table public.geovictoria_attendance_periods, public.geovictoria_punches, public.geovictoria_overtime, public.geovictoria_time_off to authenticated;
grant select, insert, update, delete on table public.geovictoria_shifts, public.geovictoria_profiles, public.geovictoria_positions, public.geovictoria_groups, public.geovictoria_timeoff_types, public.geovictoria_attendance_periods, public.geovictoria_punches, public.geovictoria_overtime, public.geovictoria_time_off to service_role;

create policy geovictoria_shifts_select on public.geovictoria_shifts for select to authenticated using (true);
create policy geovictoria_profiles_select on public.geovictoria_profiles for select to authenticated using (true);
create policy geovictoria_positions_select on public.geovictoria_positions for select to authenticated using (true);
create policy geovictoria_groups_select on public.geovictoria_groups for select to authenticated using (true);
create policy geovictoria_timeoff_types_select on public.geovictoria_timeoff_types for select to authenticated using (true);

create policy geovictoria_attendance_select on public.geovictoria_attendance_periods
for select to authenticated
using (employee_id = (select private.current_employee_id()) or (select private.can_manage_employee(employee_id)));

create policy geovictoria_punches_select on public.geovictoria_punches
for select to authenticated
using (employee_id = (select private.current_employee_id()) or (select private.can_manage_employee(employee_id)));

create policy geovictoria_overtime_select on public.geovictoria_overtime
for select to authenticated
using (employee_id = (select private.current_employee_id()) or (select private.can_manage_employee(employee_id)));

create policy geovictoria_time_off_select on public.geovictoria_time_off
for select to authenticated
using (employee_id = (select private.current_employee_id()) or (select private.can_manage_employee(employee_id)));

commit;
