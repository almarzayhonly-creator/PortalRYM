import { createClient } from '@supabase/supabase-js';

type Row = Record<string, unknown>;
type SyncResult = { module: string; processed: number; stored: number };

const API_BASE = 'https://customerapi.geovictoria.com';
const DEFAULT_DAYS = 7;
const USER_BATCH_SIZE = 40;

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-sync-secret',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

function json(data: unknown, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
}

function envMap(name: string) {
  try { return JSON.parse(Deno.env.get(name) || '{}') as Record<string, string>; }
  catch { return {} as Record<string, string>; }
}

function str(value: unknown) {
  return value === null || value === undefined ? '' : String(value).trim();
}

function bool(value: unknown) {
  if (typeof value === 'boolean') return value;
  const normalized = str(value).toLowerCase();
  if (!normalized) return null;
  if (['true', '1', 'yes', 'si'].includes(normalized)) return true;
  if (['false', '0', 'no'].includes(normalized)) return false;
  return null;
}

function intValue(value: unknown) {
  if (typeof value === 'number' && Number.isFinite(value)) return Math.trunc(value);
  const parsed = Number.parseInt(str(value), 10);
  return Number.isFinite(parsed) ? parsed : null;
}

function parseJson(raw: string): unknown {
  try { return raw ? JSON.parse(raw) : null; }
  catch { return raw; }
}

function extractToken(payload: unknown) {
  if (typeof payload === 'string') return payload.replace(/^"|"$/g, '').trim();
  if (!payload || typeof payload !== 'object') return '';
  const row = payload as Row;
  return str(row.token ?? row.Token ?? row.access_token ?? row.AccessToken);
}

function dateDigits(value: unknown) {
  return str(value).replace(/[^0-9]/g, '');
}

function parseTimestamp(value: unknown): string | null {
  const raw = str(value);
  if (!raw) return null;
  const digits = dateDigits(raw);
  if (digits.length >= 14) {
    const parsed = new Date(
      `${digits.slice(0, 4)}-${digits.slice(4, 6)}-${digits.slice(6, 8)}T${digits.slice(8, 10)}:${digits.slice(10, 12)}:${digits.slice(12, 14)}Z`,
    );
    if (!Number.isNaN(parsed.getTime())) return parsed.toISOString();
  }
  const parsed = new Date(raw);
  return Number.isNaN(parsed.getTime()) ? null : parsed.toISOString();
}

function parseDate(value: unknown): string | null {
  const raw = str(value);
  if (!raw) return null;
  const digits = dateDigits(raw);
  if (digits.length >= 8) return `${digits.slice(0, 4)}-${digits.slice(4, 6)}-${digits.slice(6, 8)}`;
  const parsed = new Date(raw);
  return Number.isNaN(parsed.getTime()) ? null : parsed.toISOString().slice(0, 10);
}

function ymd(date: Date) {
  return `${date.getUTCFullYear()}${String(date.getUTCMonth() + 1).padStart(2, '0')}${String(date.getUTCDate()).padStart(2, '0')}`;
}

function periodFromDays(days: number) {
  const end = new Date();
  const start = new Date(end.getTime() - Math.max(0, days - 1) * 24 * 60 * 60 * 1000);
  const startYmd = ymd(start);
  const endYmd = ymd(end);
  return {
    start: `${startYmd}000000`,
    end: `${endYmd}235959`,
    startDate: `${startYmd.slice(0, 4)}-${startYmd.slice(4, 6)}-${startYmd.slice(6, 8)}`,
    endDate: `${endYmd.slice(0, 4)}-${endYmd.slice(4, 6)}-${endYmd.slice(6, 8)}`,
  };
}

function chunk<T>(items: T[], size: number) {
  const result: T[][] = [];
  for (let i = 0; i < items.length; i += size) result.push(items.slice(i, i + size));
  return result;
}

function dedupe<T extends Record<string, unknown>>(items: T[], key: keyof T) {
  const map = new Map<string, T>();
  for (const item of items) {
    const id = str(item[key]);
    if (id) map.set(id, item);
  }
  return [...map.values()];
}

async function sha256(input: string) {
  const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(input));
  return [...new Uint8Array(digest)].map((b) => b.toString(16).padStart(2, '0')).join('');
}

function scrubPunchRaw(row: Row) {
  const clean = { ...row };
  for (const key of ['Longitude', 'longitude', 'Latitude', 'latitude', 'Accuracy', 'accuracy']) delete clean[key];
  return clean;
}

function rowsFromPayload(payload: unknown, keys: string[] = []) {
  if (Array.isArray(payload)) {
    return payload.filter((item): item is Row => Boolean(item && typeof item === 'object' && !Array.isArray(item)));
  }
  if (!payload || typeof payload !== 'object') return [] as Row[];
  const row = payload as Row;
  for (const key of keys) {
    if (Array.isArray(row[key])) {
      return (row[key] as unknown[]).filter((item): item is Row => Boolean(item && typeof item === 'object' && !Array.isArray(item)));
    }
  }
  for (const value of Object.values(row)) {
    if (Array.isArray(value)) {
      return value.filter((item): item is Row => Boolean(item && typeof item === 'object' && !Array.isArray(item)));
    }
  }
  return [] as Row[];
}

async function geoLogin(apiKey: string, apiSecret: string) {
  const response = await fetch(`${API_BASE}/api/v1/Login`, {
    method: 'POST',
    headers: { Accept: 'application/json', 'Content-Type': 'application/json' },
    body: JSON.stringify({ User: apiKey, Password: apiSecret }),
  });
  const payload = parseJson(await response.text());
  const token = extractToken(payload);
  if (!response.ok || !token) throw new Error(`GeoVictoria Login fallo con HTTP ${response.status}`);
  return token;
}

async function geoPost(token: string, path: string, body?: Row) {
  const response = await fetch(`${API_BASE}${path}`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      Accept: 'application/json',
      'Content-Type': 'application/json',
    },
    ...(body ? { body: JSON.stringify(body) } : {}),
  });
  const payload = parseJson(await response.text());
  if (!response.ok) {
    const detail = payload && typeof payload === 'object' && !Array.isArray(payload)
      ? str((payload as Row).Description ?? (payload as Row).Message)
      : '';
    throw new Error(`GeoVictoria ${path} HTTP ${response.status}${detail ? `: ${detail}` : ''}`);
  }
  return payload;
}

function adminClient() {
  const secret = envMap('SUPABASE_SECRET_KEYS').default || Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || '';
  if (!secret) throw new Error('Supabase admin key unavailable');
  return createClient(Deno.env.get('SUPABASE_URL') || '', secret, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

async function authorize(req: Request) {
  const configured = Deno.env.get('GEOVICTORIA_SYNC_SECRET');
  if (configured && req.headers.get('x-sync-secret') === configured) return { ok: true, actor: 'sync-secret' };

  const authorization = req.headers.get('Authorization') || '';
  if (!authorization.startsWith('Bearer ')) return { ok: false, reason: 'Missing authorization' };
  const publishable = envMap('SUPABASE_PUBLISHABLE_KEYS').default || Deno.env.get('SUPABASE_ANON_KEY') || '';
  if (!publishable) return { ok: false, reason: 'Supabase publishable key unavailable' };

  const client = createClient(Deno.env.get('SUPABASE_URL') || '', publishable, {
    global: { headers: { Authorization: authorization } },
    auth: { persistSession: false, autoRefreshToken: false },
  });
  const { data: userData, error: userError } = await client.auth.getUser(authorization.slice(7));
  if (userError || !userData.user) return { ok: false, reason: 'Invalid user session' };
  const { data: employee } = await client
    .from('employees')
    .select('id, role, active')
    .eq('auth_user_id', userData.user.id)
    .eq('active', true)
    .maybeSingle();
  if (!employee || !['hr', 'admin'].includes(employee.role)) return { ok: false, reason: 'Admin or HR role required' };
  return { ok: true, actor: employee.id };
}

async function upsertCatalogs(admin: ReturnType<typeof adminClient>, token: string, syncedAt: string) {
  const results: SyncResult[] = [];

  const shifts = rowsFromPayload(await geoPost(token, '/api/v1/Shift/List'));
  const shiftRows = dedupe(shifts.map((r) => ({
    id: str(r.Id),
    start_time: str(r.StartTime) || null,
    max_start_time: str(r.MaxStartTime) || null,
    exit_time: str(r.ExitTime) || null,
    shift_type: str(r.Type) || null,
    fixed_shift_hours: str(r.FixedShiftHours) || null,
    shift_display: str(r.ShiftDisplay) || null,
    break_minutes: str(r.BreakMinutes) || null,
    break_start: str(r.BreakStart) || null,
    break_end: str(r.BreakEnd) || null,
    status: str(r.Status) || null,
    custom: str(r.Custom) || null,
    raw_data: r,
    synced_at: syncedAt,
  })).filter((r) => r.id), 'id');
  if (shiftRows.length) {
    const { error } = await admin.from('geovictoria_shifts').upsert(shiftRows, { onConflict: 'id' });
    if (error) throw error;
  }
  results.push({ module: 'shifts', processed: shifts.length, stored: shiftRows.length });

  const profiles = rowsFromPayload(await geoPost(token, '/api/v1/Profile/List'));
  const profileRows = dedupe(profiles.map((r) => ({
    profile_id: str(r.ProfileId),
    profile_name: str(r.ProfileName) || str(r.ProfileId),
    is_common: bool(r.IsCommon),
    raw_data: r,
    synced_at: syncedAt,
  })).filter((r) => r.profile_id), 'profile_id');
  if (profileRows.length) {
    const { error } = await admin.from('geovictoria_profiles').upsert(profileRows, { onConflict: 'profile_id' });
    if (error) throw error;
  }
  results.push({ module: 'profiles', processed: profiles.length, stored: profileRows.length });

  const positions = rowsFromPayload(await geoPost(token, '/api/v1/Position/List'));
  const positionRows = dedupe(positions.map((r) => ({
    identifier: str(r.Identifier),
    description: str(r.PositionDescription) || null,
    critical: bool(r.Critical),
    state: str(r.PositionState) || null,
    raw_data: r,
    synced_at: syncedAt,
  })).filter((r) => r.identifier), 'identifier');
  if (positionRows.length) {
    const { error } = await admin.from('geovictoria_positions').upsert(positionRows, { onConflict: 'identifier' });
    if (error) throw error;
  }
  results.push({ module: 'positions', processed: positions.length, stored: positionRows.length });

  const groups = rowsFromPayload(await geoPost(token, '/api/v1/Group/List'));
  const groupRows = dedupe(groups.map((r) => ({
    description: str(r.Description),
    raw_data: r,
    synced_at: syncedAt,
  })).filter((r) => r.description), 'description');
  if (groupRows.length) {
    const { error } = await admin.from('geovictoria_groups').upsert(groupRows, { onConflict: 'description' });
    if (error) throw error;
  }
  results.push({ module: 'groups', processed: groups.length, stored: groupRows.length });

  const timeoffTypes = rowsFromPayload(await geoPost(token, '/api/v1/TimeOff/GetTypes'));
  const typeRows = dedupe(timeoffTypes.map((r) => ({
    id: str(r.Id),
    description: str(r.TranslatedDescription) || null,
    status: str(r.Status) || null,
    is_payable: str(r.IsPayable) || null,
    external_id: str(r.ExternalId) || null,
    is_partial: bool(r.IsParcial),
    length_in_hours: str(r.LengthInHours) || null,
    is_by_hours: str(r.IsByHours) || null,
    partial_type: str(r.TypeOfPartialTimeOff) || null,
    raw_data: r,
    synced_at: syncedAt,
  })).filter((r) => r.id), 'id');
  if (typeRows.length) {
    const { error } = await admin.from('geovictoria_timeoff_types').upsert(typeRows, { onConflict: 'id' });
    if (error) throw error;
  }
  results.push({ module: 'timeoff_types', processed: timeoffTypes.length, stored: typeRows.length });

  return results;
}

async function employeeMap(admin: ReturnType<typeof adminClient>) {
  const { data, error } = await admin
    .from('employees')
    .select('id, geovictoria_id')
    .eq('active', true)
    .not('geovictoria_id', 'is', null);
  if (error) throw error;
  const map = new Map<string, string>();
  for (const row of data || []) if (row.geovictoria_id) map.set(row.geovictoria_id, row.id);
  return map;
}

async function upsertOperational(
  admin: ReturnType<typeof adminClient>,
  token: string,
  ids: Map<string, string>,
  period: ReturnType<typeof periodFromDays>,
  syncedAt: string,
) {
  const totals: Record<string, SyncResult> = {
    attendance: { module: 'attendance', processed: 0, stored: 0 },
    punches: { module: 'punches', processed: 0, stored: 0 },
    time_off: { module: 'time_off', processed: 0, stored: 0 },
    overtime: { module: 'overtime', processed: 0, stored: 0 },
  };

  for (const batch of chunk([...ids.keys()], USER_BATCH_SIZE)) {
    const joined = batch.join(',');

    const attendancePayload = await geoPost(token, '/api/v1/AttendanceBook', {
      StartDate: period.start,
      EndDate: period.end,
      UserIds: joined,
    });
    const attendanceUsers = rowsFromPayload(attendancePayload, ['Users']);
    const extraValues = attendancePayload && typeof attendancePayload === 'object' && !Array.isArray(attendancePayload)
      ? ((attendancePayload as Row).ExtraTimeValues ?? [])
      : [];
    totals.attendance.processed += attendanceUsers.length;
    const attendanceRows = attendanceUsers.map((r) => {
      const employeeId = ids.get(str(r.Identifier));
      if (!employeeId) return null;
      return {
        employee_id: employeeId,
        period_start: period.startDate,
        period_end: period.endDate,
        total_worked_hours: str(r.TotalWorkedHours) || null,
        worked_days: intValue(r.WorkedDays),
        non_worked_days: intValue(r.NonWorkedDays),
        absences: intValue(r.Absences),
        holidays: intValue(r.Holidays),
        vacation: intValue(r.Vacation),
        days_leave_with_pay: intValue(r.DaysLeaveWithPay),
        days_leave_without_pay: intValue(r.DaysLeaveWithoutPay),
        absence_days_without_justification: intValue(r.AbsenceDaysWithoutJustification),
        absence_days_license: intValue(r.AbsenceDaysLicense),
        worked_sundays: intValue(r.WorkedSundays),
        worked_holidays: intValue(r.WorkedHolidays),
        days_attended: intValue(r.DaysAttended),
        planned_interval: Array.isArray(r.PlannedInterval) ? r.PlannedInterval : [],
        extra_time_values: Array.isArray(extraValues) ? extraValues : [],
        raw_data: r,
        synced_at: syncedAt,
      };
    }).filter(Boolean);
    if (attendanceRows.length) {
      const { error } = await admin.from('geovictoria_attendance_periods').upsert(attendanceRows, {
        onConflict: 'employee_id,period_start,period_end',
      });
      if (error) throw error;
      totals.attendance.stored += attendanceRows.length;
    }

    const punchPayload = await geoPost(token, '/api/v1/Punch/ListByUsersDates', {
      StartDate: period.start,
      EndDate: period.end,
      UserIds: joined,
    });
    const punches = rowsFromPayload(punchPayload);
    totals.punches.processed += punches.length;
    const punchRows: Row[] = [];
    for (const r of punches) {
      const externalId = str(r.UserIdentifier);
      const employeeId = ids.get(externalId);
      if (!employeeId) continue;
      const punchId = str(r.PunchId);
      const rawDate = str(r.Date);
      const fingerprint = await sha256(`${externalId}|${punchId}|${rawDate}|${str(r.Type)}|${str(r.Checksum)}`);
      punchRows.push({
        fingerprint,
        employee_id: employeeId,
        punch_id: punchId || null,
        punch_at_raw: rawDate,
        punch_at: parseTimestamp(rawDate),
        punch_type: str(r.Type) || null,
        origin: str(r.Origin) || null,
        group_description: str(r.GroupDescription) || null,
        upload_date_raw: str(r.UploadDate) || null,
        upload_at: parseTimestamp(r.UploadDate),
        shift_punch_type: str(r.ShiftPunchType) || null,
        assigned_in_book: bool(r.AssignedInBook),
        box_sn: str(r.BoxSn) || null,
        task_id: str(r.IdTask) || null,
        project_id: str(r.IdProject) || null,
        checksum: str(r.Checksum) || null,
        raw_data: scrubPunchRaw(r),
        synced_at: syncedAt,
      });
    }
    const uniquePunches = dedupe(punchRows, 'fingerprint');
    if (uniquePunches.length) {
      const { error } = await admin.from('geovictoria_punches').upsert(uniquePunches, { onConflict: 'fingerprint' });
      if (error) throw error;
      totals.punches.stored += uniquePunches.length;
    }

    const timeOffPayload = await geoPost(token, '/api/v1/TimeOff/Get', {
      StartDate: period.start,
      EndDate: period.end,
      UserIds: joined,
    });
    const timeOffs = rowsFromPayload(timeOffPayload, ['TimeOffs', 'Response', 'Data']);
    totals.time_off.processed += timeOffs.length;
    const timeOffRows: Row[] = [];
    for (const r of timeOffs) {
      const externalId = str(r.UserIdentifier ?? r.Identifier ?? r.UserId);
      const employeeId = ids.get(externalId) || null;
      const externalRowId = str(r.Id ?? r.ExternalId ?? r.TimeOffId);
      const legacyStartRaw = str(r.StartDate ?? r.Start ?? r.FromDate ?? r.DateFrom);
      const legacyEndRaw = str(r.EndDate ?? r.End ?? r.ToDate ?? r.DateTo);
      const startRaw = str(r.Starts ?? legacyStartRaw);
      const endRaw = str(r.Ends ?? legacyEndRaw);
      const fingerprint = await sha256(
        `${externalId}|${externalRowId}|${legacyStartRaw}|${legacyEndRaw}|${str(r.TypeId ?? r.TimeOffTypeId)}`,
      );
      timeOffRows.push({
        fingerprint,
        employee_id: employeeId,
        external_id: externalRowId || null,
        type_id: str(r.TypeId ?? r.TimeOffTypeId ?? r.TimeOffType) || null,
        type_description: str(r.TimeOffTypeDescription ?? r.TypeDescription ?? r.Description ?? r.TranslatedDescription) || null,
        start_at_raw: startRaw || null,
        end_at_raw: endRaw || null,
        start_at: parseTimestamp(startRaw),
        end_at: parseTimestamp(endRaw),
        status: str(r.Status) || null,
        raw_data: r,
        synced_at: syncedAt,
      });
    }
    const uniqueTimeOff = dedupe(timeOffRows, 'fingerprint');
    if (uniqueTimeOff.length) {
      const { error } = await admin.from('geovictoria_time_off').upsert(uniqueTimeOff, { onConflict: 'fingerprint' });
      if (error) throw error;
      totals.time_off.stored += uniqueTimeOff.length;
    }

    const overtimePayload = await geoPost(token, '/api/v1/OverTime/GetOvertime', {
      StartDate: period.start,
      EndDate: period.end,
      UserIdentifiers: joined,
    });
    const overtime = rowsFromPayload(overtimePayload, ['Response', 'Data']);
    totals.overtime.processed += overtime.length;
    const overtimeRows: Row[] = [];
    for (const r of overtime) {
      const externalId = str(r.UserIdentifier);
      const employeeId = ids.get(externalId);
      if (!employeeId) continue;
      const rawDate = str(r.Date);
      const fingerprint = await sha256(`${externalId}|${rawDate}|${str(r.ShiftExternalId)}`);
      overtimeRows.push({
        fingerprint,
        employee_id: employeeId,
        work_date_raw: rawDate,
        work_date: parseDate(rawDate),
        shift_external_id: str(r.ShiftExternalId) || null,
        extra_time_before: str(r.ExtraTimeBefore) || null,
        extra_time_after: str(r.ExtraTimeAfter) || null,
        approved_overtime_before: str(r.ApprovedOvertimeBefore) || null,
        approved_overtime_after: str(r.ApprovedOvertimeAfter) || null,
        raw_data: r,
        synced_at: syncedAt,
      });
    }
    const uniqueOvertime = dedupe(overtimeRows, 'fingerprint');
    if (uniqueOvertime.length) {
      const { error } = await admin.from('geovictoria_overtime').upsert(uniqueOvertime, { onConflict: 'fingerprint' });
      if (error) throw error;
      totals.overtime.stored += uniqueOvertime.length;
    }
  }

  return Object.values(totals);
}

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });
  if (req.method !== 'POST') return json({ error: 'Method not allowed' }, 405);

  const access = await authorize(req);
  if (!access.ok) return json({ error: access.reason || 'Unauthorized' }, 401);

  const apiKey = Deno.env.get('GEOVICTORIA_API_KEY');
  const apiSecret = Deno.env.get('GEOVICTORIA_API_SECRET');
  if (!apiKey || !apiSecret) return json({ error: 'Faltan credenciales de GeoVictoria' }, 503);

  let input: Row = {};
  try { input = await req.json(); } catch { input = {}; }
  const mode = str(input.mode || 'all').toLowerCase();
  if (!['all', 'catalogs', 'operational'].includes(mode)) return json({ error: 'mode debe ser all, catalogs u operational' }, 400);

  const requestedDays = Math.min(31, Math.max(1, intValue(input.days) || DEFAULT_DAYS));
  const period = periodFromDays(requestedDays);
  const syncedAt = new Date().toISOString();
  const admin = adminClient();

  try {
    const token = await geoLogin(apiKey, apiSecret);
    const results: SyncResult[] = [];

    if (mode === 'all' || mode === 'catalogs') results.push(...await upsertCatalogs(admin, token, syncedAt));
    if (mode === 'all' || mode === 'operational') {
      const ids = await employeeMap(admin);
      results.push(...await upsertOperational(admin, token, ids, period, syncedAt));
    }

    const recordsProcessed = results.reduce((sum, item) => sum + item.processed, 0);
    const { error: logError } = await admin.schema('private').from('integration_sync_log').insert({
      integration: 'geovictoria_operational',
      status: 'success',
      records_processed: recordsProcessed,
      details: { mode, days: requestedDays, period, results, actor: access.actor },
    });
    if (logError) console.error('sync log insert failed', logError);

    return json({
      ok: true,
      mode,
      days: requestedDays,
      period: { start: period.start, end: period.end },
      results,
      actor: access.actor,
      location_data_stored: false,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unexpected sync error';
    try {
      await admin.schema('private').from('integration_sync_log').insert({
        integration: 'geovictoria_operational',
        status: 'error',
        records_processed: 0,
        details: { mode, days: requestedDays, message, actor: access.actor },
      });
    } catch { /* ignore secondary log failures */ }
    console.error('GeoVictoria operational sync failed', error);
    return json({ error: message }, 500);
  }
});
