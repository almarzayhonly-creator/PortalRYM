import { createClient } from '@supabase/supabase-js';

type Row = Record<string, unknown>;

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-sync-secret',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

const DEFAULT_API_BASE = 'https://customerapi.geovictoria.com';

function json(data: unknown, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
}

function envMap(name: string) {
  try {
    return JSON.parse(Deno.env.get(name) || '{}') as Record<string, string>;
  } catch {
    return {} as Record<string, string>;
  }
}

function text(value: unknown) {
  if (value === null || value === undefined) return null;
  const result = String(value).trim();
  return result || null;
}

function isEnabled(value: unknown) {
  if (value === null || value === undefined || value === '') return true;
  if (typeof value === 'boolean') return value;
  if (typeof value === 'number') return value !== 0;
  return !['0', 'false', 'no', 'inactive', 'disabled', 'inactivo', 'deshabilitado']
    .includes(String(value).trim().toLowerCase());
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
  if (!payload || typeof payload !== 'object') return null;
  const row = payload as Row;
  return text(row.token ?? row.Token ?? row.access_token ?? row.AccessToken ?? row._message);
}

function findUsers(input: unknown, depth = 0): Row[] {
  if (depth > 8) return [];

  if (Array.isArray(input)) {
    const looksLikeUsers = input.some((item) => item && typeof item === 'object' && !Array.isArray(item) && (
      'Identifier' in (item as Row) ||
      'identifier' in (item as Row) ||
      'Email' in (item as Row) ||
      'Name' in (item as Row)
    ));
    if (looksLikeUsers) return input as Row[];
    for (const item of input) {
      const found = findUsers(item, depth + 1);
      if (found.length) return found;
    }
    return [];
  }

  if (!input || typeof input !== 'object') return [];
  const row = input as Row;
  for (const key of ['data', 'users', 'Users', 'result', 'Result', 'response', 'Response', '_message', 'message']) {
    if (key in row) {
      const nestedValue = typeof row[key] === 'string' ? parseJson(String(row[key])) : row[key];
      const found = findUsers(nestedValue, depth + 1);
      if (found.length) return found;
    }
  }
  for (const child of Object.values(row)) {
    const found = findUsers(child, depth + 1);
    if (found.length) return found;
  }
  return [];
}

async function authenticateGeoVictoria(apiBase: string, apiKey: string, apiSecret: string) {
  const url = new URL('/api/v1/Login', apiBase).toString();
  const response = await fetch(url, {
    method: 'POST',
    redirect: 'follow',
    headers: {
      Accept: 'application/json',
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ User: apiKey, Password: apiSecret }),
  });

  const raw = await response.text();
  const payload = parseJson(raw);
  const token = extractToken(payload);

  if (!response.ok || !token) {
    throw new Error(`GeoVictoria Login fallo con HTTP ${response.status}`);
  }

  return token;
}

async function callGeoVictoria(apiBase: string, path: string, token: string) {
  const url = new URL(path, apiBase).toString();

  const attempt = async (authorization: string) => {
    const response = await fetch(url, {
      method: 'POST',
      redirect: 'follow',
      headers: {
        Authorization: authorization,
        Accept: 'application/json',
        'Content-Type': 'application/json',
      },
      body: '{}',
    });
    const raw = await response.text();
    return { response, raw, payload: parseJson(raw) };
  };

  // GeoVictoria's documentation says the JWT goes in the Authorization header.
  // Older Swagger definitions have accepted the raw JWT, while some gateways use Bearer.
  // Try the documented raw token first and only fall back to Bearer on auth errors.
  let result = await attempt(token);
  if ([401, 403].includes(result.response.status) && !token.startsWith('Bearer ')) {
    result = await attempt(`Bearer ${token}`);
  }

  return { ...result, url };
}

async function authorizeCaller(req: Request) {
  const configuredSyncSecret = Deno.env.get('GEOVICTORIA_SYNC_SECRET');
  const suppliedSyncSecret = req.headers.get('x-sync-secret');
  if (configuredSyncSecret && suppliedSyncSecret === configuredSyncSecret) {
    return { ok: true, actor: 'sync-secret' };
  }

  const authorization = req.headers.get('Authorization') || '';
  if (!authorization.startsWith('Bearer ')) return { ok: false, reason: 'Missing authorization' };

  const publishableKey = envMap('SUPABASE_PUBLISHABLE_KEYS').default || Deno.env.get('SUPABASE_ANON_KEY') || '';
  if (!publishableKey) return { ok: false, reason: 'Supabase publishable key unavailable' };

  const client = createClient(Deno.env.get('SUPABASE_URL') || '', publishableKey, {
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

  if (!employee || !['hr', 'admin'].includes(employee.role)) {
    return { ok: false, reason: 'Admin or HR role required' };
  }

  return { ok: true, actor: employee.id };
}

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });
  if (req.method !== 'POST') return json({ error: 'Method not allowed' }, 405);

  try {
    const access = await authorizeCaller(req);
    if (!access.ok) return json({ error: access.reason || 'Unauthorized' }, 401);

    const apiKey = Deno.env.get('GEOVICTORIA_API_KEY');
    const apiSecret = Deno.env.get('GEOVICTORIA_API_SECRET');
    if (!apiKey || !apiSecret) {
      return json({ error: 'Faltan GEOVICTORIA_API_KEY o GEOVICTORIA_API_SECRET' }, 503);
    }

    // The current public API documentation and Swagger use customerapi.geovictoria.com.
    // Keep an optional override for future GeoVictoria environment changes.
    const apiBase = Deno.env.get('GEOVICTORIA_CUSTOMER_API_BASE_URL') || DEFAULT_API_BASE;
    const usersPath = Deno.env.get('GEOVICTORIA_USERS_PATH') || '/api/User/List';

    const token = await authenticateGeoVictoria(apiBase, apiKey, apiSecret);
    const usersCall = await callGeoVictoria(apiBase, usersPath, token);

    if (!usersCall.response.ok) {
      return json({
        error: `GeoVictoria User/List respondio HTTP ${usersCall.response.status}`,
        endpoint: usersCall.url,
        final_url: usersCall.response.url,
        content_type: usersCall.response.headers.get('content-type'),
      }, 502);
    }

    if (/text\/html/i.test(usersCall.response.headers.get('content-type') || '') || /<html/i.test(usersCall.raw)) {
      return json({
        error: 'GeoVictoria User/List devolvio HTML en lugar de JSON',
        endpoint: usersCall.url,
        final_url: usersCall.response.url,
      }, 502);
    }

    const users = findUsers(usersCall.payload);
    if (!users.length) {
      return json({
        error: 'GeoVictoria autentico correctamente, pero no se encontro la lista de usuarios en la respuesta',
        response_type: Array.isArray(usersCall.payload) ? 'array' : typeof usersCall.payload,
        response_keys: usersCall.payload && typeof usersCall.payload === 'object' && !Array.isArray(usersCall.payload)
          ? Object.keys(usersCall.payload as Row).slice(0, 30)
          : [],
      }, 502);
    }

    const adminKey = envMap('SUPABASE_SECRET_KEYS').default || Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || '';
    if (!adminKey) return json({ error: 'Supabase admin key unavailable' }, 503);

    const admin = createClient(Deno.env.get('SUPABASE_URL') || '', adminKey, {
      auth: { persistSession: false, autoRefreshToken: false },
    });

    const ids = users
      .map((user) => text(user.Identifier ?? user.identifier ?? user.Id ?? user.id))
      .filter((id): id is string => Boolean(id));

    const existingRoles = new Map<string, string>();
    if (ids.length) {
      const { data: existing, error } = await admin
        .from('employees')
        .select('geovictoria_id, role')
        .in('geovictoria_id', ids);
      if (error) throw error;
      for (const row of existing || []) {
        if (row.geovictoria_id) existingRoles.set(row.geovictoria_id, row.role);
      }
    }

    const now = new Date().toISOString();
    const records = users.map((user) => {
      const externalId = text(user.Identifier ?? user.identifier ?? user.Id ?? user.id) || '';
      const preservedRole = existingRoles.get(externalId);
      return {
        geovictoria_id: externalId,
        email: text(user.Email ?? user.email)?.toLowerCase() || null,
        full_name: `${text(user.Name ?? user.name) || ''} ${text(user.LastName ?? user.lastName) || ''}`.trim() || externalId,
        department: text(user.GroupDescription ?? user.groupDescription ?? user.Department ?? user.department),
        position: text(
          user.positionName ??
          user.PositionName ??
          user.PositionDescription ??
          user.positionDescription ??
          user.positionIdentifier ??
          user.UserProfile ??
          user.userProfile,
        ),
        active: isEnabled(user.Enabled ?? user.enabled ?? user.Active ?? user.active),
        role: ['hr', 'admin'].includes(preservedRole || '') ? preservedRole : 'employee',
        synced_at: now,
        updated_at: now,
      };
    }).filter((row) => row.geovictoria_id);

    const { error: upsertError } = await admin
      .from('employees')
      .upsert(records, { onConflict: 'geovictoria_id' });
    if (upsertError) throw upsertError;

    return json({
      ok: true,
      source: apiBase,
      authenticated: true,
      synced: records.length,
      active: records.filter((row) => row.active).length,
      actor: access.actor,
    });
  } catch (error) {
    console.error('GeoVictoria sync failed', error);
    return json({ error: error instanceof Error ? error.message : 'Unexpected sync error' }, 500);
  }
});
