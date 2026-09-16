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
  for (const key of ['Users', 'Punches', 'Response', 'Data', 'data', 'Items', 'items']) {
    if (Array.isArray(row[key])) return (row[key] as unknown[]).length;
  }
  return null;
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
    return { StartDate: startDate, EndDate: endDate, UserIdentifiers: userIds };
  }

  return { StartDate: startDate, EndDate: endDate, UserIds: userIds };
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
  return fetch(`${API_BASE}${entry.path}`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      Accept: 'application/json',
      'Content-Type': 'application/json',
    },
    ...(body ? { body: JSON.stringify(body) } : {}),
  });
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
    });
  }

  const action = asString(input.action);
  const entry = catalog[action];
  if (!entry) return response({ error: 'Accion no permitida', allowed_actions: Object.keys(catalog) }, 400);

  const apiKey = Deno.env.get('GEOVICTORIA_API_KEY');
  const apiSecret = Deno.env.get('GEOVICTORIA_API_SECRET');
  if (!apiKey || !apiSecret) {
    return response({ error: 'Faltan GEOVICTORIA_API_KEY o GEOVICTORIA_API_SECRET' }, 503);
  }

  try {
    const token = await geoLogin(apiKey, apiSecret);
    const body = buildBody(entry, input);
    const gv = await invokeGeo(entry, token, body);
    const raw = await gv.text();
    const payload = parseJson(raw);

    if (!gv.ok) {
      return response({
        ok: false,
        action,
        endpoint: entry.path,
        status: gv.status,
        content_type: gv.headers.get('content-type'),
        response_shape: shapeOf(payload),
      }, 502);
    }

    return response({
      ok: true,
      action,
      endpoint: entry.path,
      status: gv.status,
      count: countRecords(payload),
      response_shape: shapeOf(payload),
    });
  } catch (error) {
    return response({ error: error instanceof Error ? error.message : 'Unexpected explorer error' }, 500);
  }
});
