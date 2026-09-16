import { createClient } from '@supabase/supabase-js';

type Json = Record<string, unknown>;

type CatalogEntry = {
  path: string;
  body: 'none' | 'period-users' | 'period-users-overtime' | 'period-page';
  description: string;
};

const API_BASE = 'https://customerapi.geovictoria.com';

const catalog: Record<string, CatalogEntry> = {
  attendance_book: {
    path: '/api/v1/AttendanceBook',
    body: 'period-users',
    description: 'Libro de asistencia calculado: horas trabajadas/no trabajadas, atrasos, marcas, turnos y permisos.',
  },
  punches_by_users: {
    path: '/api/v1/Punch/ListByUsersDates',
    body: 'period-users',
    description: 'Marcas de usuarios específicos en un rango de fechas.',
  },
  punches_paginated: {
    path: '/api/v1/Punch/PaginatedListByDate',
    body: 'period-page',
    description: 'Marcas de toda la empresa paginadas por fecha.',
  },
  timeoff: {
    path: '/api/v1/TimeOff/Get',
    body: 'period-users',
    description: 'Permisos asociados a usuarios para un periodo.',
  },
  timeoff_types: {
    path: '/api/v1/TimeOff/GetTypes',
    body: 'none',
    description: 'Tipos de permisos activos configurados en la empresa.',
  },
  shifts: {
    path: '/api/v1/Shift/List',
    body: 'none',
    description: 'Listado de turnos existentes.',
  },
  profiles: {
    path: '/api/v1/Profile/List',
    body: 'none',
    description: 'Perfiles y privilegios básicos.',
  },
  positions: {
    path: '/api/v1/Position/List',
    body: 'none',
    description: 'Listado de cargos existentes.',
  },
  groups: {
    path: '/api/v1/Group/List',
    body: 'none',
    description: 'Listado de grupos/centros de costo.',
  },
  overtime: {
    path: '/api/v1/OverTime/GetOvertime',
    body: 'period-users-overtime',
    description: 'Horas extra antes/después de turno y aprobadas, por usuario y fecha.',
  },
  overtime_reasons: {
    path: '/api/v1/OverTime/GetReasons',
    body: 'none',
    description: 'Motivos de horas extra habilitados.',
  },
};

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'content-type, x-sync-secret',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

function response(data: unknown, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
}

function asString(value: unknown) {
  if (value === null || value === undefined) return '';
  return String(value).trim();
}

function parseJson(raw: string): unknown {
  try {
    return raw ? JSON.parse(raw) : null;
  } catch {
    return raw;
  }
}

function extractToken(payload: unknown) {
  if (typeof payload === 'string') return payload.replace(/^"|"$/g, '').trim();
  if (!payload || typeof payload !== 'object') return '';
  const row = payload as Json;
  return asString(row.token ?? row.Token ?? row.access_token ?? row.AccessToken);
}

function shapeOf(value: unknown, depth = 0): unknown {
  if (depth > 3) return 'max-depth';
  if (Array.isArray(value)) {
    return {
      type: 'array',
      count: value.length,
      first: value.length ? shapeOf(value[0], depth + 1) : null,
    };
  }
  if (value && typeof value === 'object') {
    const row = value as Json;
    const keys = Object.keys(row).slice(0, 40);
    const fields: Record<string, unknown> = {};
    for (const key of keys.slice(0, 12)) fields[key] = shapeOf(row[key], depth + 1);
    return { type: 'object', keys, fields };
  }
  if (value === null) return 'null';
  return typeof value;
}

function countRecords(value: unknown): number | null {
  if (Array.isArray(value)) return value.length;
  if (!value || typeof value !== 'object') return null;
  const row = value as Json;
  for (const key of ['Users', 'Punches', 'Response', 'Data', 'data', 'Items', 'items', 'Weeks', 'TimeOffs']) {
    if (Array.isArray(row[key])) return (row[key] as unknown[]).length;
  }
  return null;
}

function apiErrorDetails(payload: unknown) {
  if (payload && typeof payload === 'object' && !Array.isArray(payload)) {
    const row = payload as Json;
    const details = {
      code: asString(row.Code ?? row.code) || null,
      category: asString(row.CategoryException ?? row.categoryException ?? row.Category) || null,
      description: asString(row.Description ?? row.description ?? row.Message ?? row.message) || null,
      possible_solution: asString(row.PossibleSolution ?? row.possibleSolution) || null,
      success: typeof row.Success === 'boolean' ? row.Success : null,
    };
    return Object.fromEntries(Object.entries(details).filter(([, value]) => value !== null));
  }
  if (typeof payload === 'string') {
    return { description: payload.trim().slice(0, 300) };
  }
  return null;
}

function dateTime(value: string, endOfDay = false) {
  const digits = value.replace(/[^0-9]/g, '');
  if (digits.length >= 14) return digits.slice(0, 14);
  if (digits.length === 8) return `${digits}${endOfDay ? '235959' : '000000'}`;
  throw new Error("Las fechas deben usar 'yyyyMMddHHmmss' o 'yyyyMMdd'");
}

function buildBody(entry: CatalogEntry, input: Json) {
  const startDate = asString(input.start_date);
  const endDate = asString(input.end_date);
  const userIds = Array.isArray(input.user_ids)
    ? input.user_ids.map(asString).filter(Boolean).join(',')
    : asString(input.user_ids);

  if (entry.body === 'none') return undefined;

  if (entry.body === 'period-page') {
    if (!startDate || !endDate) throw new Error('start_date y end_date son requeridos');
    return { StartDate: startDate, EndDate: endDate, Page: asString(input.page || '1') };
  }

  if (!startDate || !endDate || !userIds) {
    throw new Error('start_date, end_date y user_ids son requeridos');
  }

  if (entry.body === 'period-users-overtime') {
    return {
      StartDate: dateTime(startDate, false),
      EndDate: dateTime(endDate, true),
      UserIdentifiers: userIds,
    };
  }

  return { StartDate: startDate, EndDate: endDate, UserIds: userIds };
}

function ymd(date: Date) {
  return `${date.getUTCFullYear()}${String(date.getUTCMonth() + 1).padStart(2, '0')}${String(date.getUTCDate()).padStart(2, '0')}`;
}

function defaultPeriod() {
  const end = new Date();
  const start = new Date(end.getTime() - 6 * 24 * 60 * 60 * 1000);
  return {
    start_date: `${ymd(start)}000000`,
    end_date: `${ymd(end)}235959`,
  };
}

async function geoLogin(apiKey: string, apiSecret: string) {
  const login = await fetch(`${API_BASE}/api/v1/Login`, {
    method: 'POST',
    headers: { Accept: 'application/json', 'Content-Type': 'application/json' },
    body: JSON.stringify({ User: apiKey, Password: apiSecret }),
  });
  const raw = await login.text();
  const payload = parseJson(raw);
  const token = extractToken(payload);
  if (!login.ok || !token) {
    throw new Error(`GeoVictoria Login fallo con HTTP ${login.status}`);
  }
  return token;
}

async function invokeGeo(entry: CatalogEntry, token: string, body?: Json) {
  const gv = await fetch(`${API_BASE}${entry.path}`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      Accept: 'application/json',
      'Content-Type': 'application/json',
    },
    ...(body ? { body: JSON.stringify(body) } : {}),
  });
  const raw = await gv.text();
  return { gv, raw, payload: parseJson(raw) };
}

function summarizeCall(action: string, result: { gv: Response; payload: unknown }) {
  return {
    action,
    ok: result.gv.ok,
    status: result.gv.status,
    count: result.gv.ok ? countRecords(result.payload) : null,
    ...(result.gv.ok ? {} : { api_error: apiErrorDetails(result.payload) }),
    response_shape: shapeOf(result.payload),
  };
}

function getAdminClient() {
  let secretKey = '';
  try {
    const keys = JSON.parse(Deno.env.get('SUPABASE_SECRET_KEYS') || '{}') as Record<string, string>;
    secretKey = keys.default || '';
  } catch {
    secretKey = '';
  }
  secretKey ||= Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || '';
  if (!secretKey) throw new Error('Supabase admin key unavailable');
  return createClient(Deno.env.get('SUPABASE_URL') || '', secretKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

async function getSampleUserIds(limit = 1) {
  const admin = getAdminClient();
  const { data, error } = await admin
    .from('employees')
    .select('geovictoria_id')
    .eq('active', true)
    .not('geovictoria_id', 'is', null)
    .limit(limit);
  if (error) throw error;
  const ids = (data || []).map((row) => asString(row.geovictoria_id)).filter(Boolean);
  if (!ids.length) throw new Error('No hay empleados activos sincronizados para la prueba');
  return ids;
}

async function probeCore(token: string) {
  const [userId] = await getSampleUserIds(1);
  const period = defaultPeriod();
  const requests: Array<[string, CatalogEntry, Json | undefined]> = [
    ['shifts', catalog.shifts, undefined],
    ['profiles', catalog.profiles, undefined],
    ['positions', catalog.positions, undefined],
    ['groups', catalog.groups, undefined],
    ['timeoff_types', catalog.timeoff_types, undefined],
    ['overtime_reasons', catalog.overtime_reasons, undefined],
    ['attendance_book', catalog.attendance_book, buildBody(catalog.attendance_book, { ...period, user_ids: [userId] })],
    ['punches_by_users', catalog.punches_by_users, buildBody(catalog.punches_by_users, { ...period, user_ids: [userId] })],
    ['timeoff', catalog.timeoff, buildBody(catalog.timeoff, { ...period, user_ids: [userId] })],
    ['overtime', catalog.overtime, buildBody(catalog.overtime, { ...period, user_ids: [userId] })],
  ];

  const results = [];
  for (const [action, entry, body] of requests) {
    try {
      results.push(summarizeCall(action, await invokeGeo(entry, token, body)));
    } catch (error) {
      results.push({ action, ok: false, status: null, error: error instanceof Error ? error.message : 'Unexpected request error' });
    }
  }

  return {
    ok: true,
    read_only: true,
    period,
    sample_user: 'empleado activo sincronizado',
    successful: results.filter((item) => item.ok).length,
    attempted: results.length,
    results,
  };
}

async function probeOvertime(token: string) {
  const userIds = await getSampleUserIds(3);
  const period = defaultPeriod();
  const results = [];

  for (let index = 0; index < userIds.length; index += 1) {
    const body = buildBody(catalog.overtime, { ...period, user_ids: [userIds[index]] });
    try {
      const result = await invokeGeo(catalog.overtime, token, body);
      results.push({
        sample: index + 1,
        ok: result.gv.ok,
        status: result.gv.status,
        count: result.gv.ok ? countRecords(result.payload) : null,
        ...(result.gv.ok ? {} : { api_error: apiErrorDetails(result.payload) }),
        response_shape: shapeOf(result.payload),
      });
    } catch (error) {
      results.push({ sample: index + 1, ok: false, status: null, error: error instanceof Error ? error.message : 'Unexpected request error' });
    }
  }

  return {
    ok: true,
    read_only: true,
    period: {
      start_date: dateTime(period.start_date, false),
      end_date: dateTime(period.end_date, true),
    },
    attempted: results.length,
    successful: results.filter((item) => item.ok).length,
    results,
  };
}

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });
  if (req.method !== 'POST') return response({ error: 'Method not allowed' }, 405);

  const configuredSecret = Deno.env.get('GEOVICTORIA_SYNC_SECRET');
  if (!configuredSecret || req.headers.get('x-sync-secret') !== configuredSecret) {
    return response({ error: 'Unauthorized' }, 401);
  }

  let input: Json = {};
  try {
    input = await req.json();
  } catch {
    return response({ error: 'JSON body requerido' }, 400);
  }

  if (input.action === 'catalog' || !input.action) {
    return response({
      ok: true,
      api_base: API_BASE,
      read_only: true,
      actions: Object.fromEntries(Object.entries(catalog).map(([key, item]) => [key, {
        endpoint: item.path,
        request: item.body,
        description: item.description,
      }])),
      utilities: {
        probe_core: 'Prueba los principales endpoints de solo lectura usando un empleado activo sincronizado y los ultimos 7 dias.',
        overtime_probe: 'Prueba GetOvertime con hasta 3 empleados activos y devuelve el detalle seguro del error sin exponer identificadores.',
      },
    });
  }

  const apiKey = Deno.env.get('GEOVICTORIA_API_KEY');
  const apiSecret = Deno.env.get('GEOVICTORIA_API_SECRET');
  if (!apiKey || !apiSecret) {
    return response({ error: 'Faltan GEOVICTORIA_API_KEY o GEOVICTORIA_API_SECRET' }, 503);
  }

  try {
    const token = await geoLogin(apiKey, apiSecret);

    if (input.action === 'probe_core') {
      return response(await probeCore(token));
    }

    if (input.action === 'overtime_probe') {
      return response(await probeOvertime(token));
    }

    const action = asString(input.action);
    const entry = catalog[action];
    if (!entry) return response({ error: 'Accion no permitida', allowed_actions: [...Object.keys(catalog), 'probe_core', 'overtime_probe'] }, 400);

    const body = buildBody(entry, input);
    const result = await invokeGeo(entry, token, body);

    if (!result.gv.ok) {
      return response({
        ok: false,
        action,
        endpoint: entry.path,
        status: result.gv.status,
        content_type: result.gv.headers.get('content-type'),
        api_error: apiErrorDetails(result.payload),
        response_shape: shapeOf(result.payload),
      }, 502);
    }

    return response({
      ok: true,
      action,
      endpoint: entry.path,
      status: result.gv.status,
      count: countRecords(result.payload),
      response_shape: shapeOf(result.payload),
    });
  } catch (error) {
    return response({ error: error instanceof Error ? error.message : 'Unexpected explorer error' }, 500);
  }
});
