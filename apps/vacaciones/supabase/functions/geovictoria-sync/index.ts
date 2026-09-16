import { createClient } from '@supabase/supabase-js';

type Row = Record<string, unknown>;

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-sync-secret',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

const DEFAULT_OAUTH_BASE = 'https://apiv3.geovictoria.com';
const DEFAULT_TOKEN_BASE = 'https://customerapi.geovictoria.com';

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

function value(input: unknown) {
  if (input === null || input === undefined) return null;
  const result = String(input).trim();
  return result || null;
}

function normalized(input: unknown) {
  return (value(input) || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();
}

function enabled(input: unknown) {
  if (input === null || input === undefined || input === '') return true;
  if (typeof input === 'boolean') return input;
  if (typeof input === 'number') return input !== 0;
  return !['0', 'false', 'no', 'inactive', 'disabled', 'inactivo', 'deshabilitado']
    .includes(String(input).trim().toLowerCase());
}

function encodeOAuth(input: string) {
  return encodeURIComponent(input).replace(/[!'()*]/g, (char) => `%${char.charCodeAt(0).toString(16).toUpperCase()}`);
}

function toBase64(bytes: ArrayBuffer) {
  let binary = '';
  for (const byte of new Uint8Array(bytes)) binary += String.fromCharCode(byte);
  return btoa(binary);
}

async function oauthAuthorization(method: string, url: string, consumerKey: string, consumerSecret: string) {
  const oauth: Record<string, string> = {
    oauth_consumer_key: consumerKey,
    oauth_nonce: crypto.randomUUID().replaceAll('-', ''),
    oauth_signature_method: 'HMAC-SHA1',
    oauth_timestamp: Math.floor(Date.now() / 1000).toString(),
    oauth_version: '1.0',
  };

  const normalizedParameters = Object.entries(oauth)
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([key, val]) => `${encodeOAuth(key)}=${encodeOAuth(val)}`)
    .join('&');

  const signatureBase = [method.toUpperCase(), encodeOAuth(url), encodeOAuth(normalizedParameters)].join('&');
  const signingKey = `${encodeOAuth(consumerSecret)}&`;
  const cryptoKey = await crypto.subtle.importKey(
    'raw',
    new TextEncoder().encode(signingKey),
    { name: 'HMAC', hash: 'SHA-1' },
    false,
    ['sign'],
  );
  const signature = toBase64(await crypto.subtle.sign('HMAC', cryptoKey, new TextEncoder().encode(signatureBase)));

  return `OAuth ${Object.entries({ ...oauth, oauth_signature: signature })
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([key, val]) => `${encodeOAuth(key)}="${encodeOAuth(val)}"`)
    .join(', ')}`;
}

async function oauthPost(baseUrl: string, path: string, apiKey: string, apiSecret: string) {
  const url = new URL(path, baseUrl).toString();
  const authorization = await oauthAuthorization('POST', url, apiKey, apiSecret);
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
  let body: unknown = raw;
  try { body = raw ? JSON.parse(raw) : null; } catch { /* keep raw */ }
  return { response, body, raw, url };
}

function findRows(input: unknown, depth = 0): Row[] {
  if (depth > 7) return [];
  if (Array.isArray(input)) {
    if (input.some((item) => item && typeof item === 'object' && !Array.isArray(item) && (
      'Identifier' in (item as Row) || 'identifier' in (item as Row) || 'Name' in (item as Row)
    ))) return input as Row[];
    for (const item of input) {
      const found = findRows(item, depth + 1);
      if (found.length) return found;
    }
    return [];
  }
  if (!input || typeof input !== 'object') return [];
  for (const key of ['data', 'users', 'Users', 'result', 'Result', 'response', 'Response']) {
    if (key in (input as Row)) {
      const found = findRows((input as Row)[key], depth + 1);
      if (found.length) return found;
    }
  }
  for (const child of Object.values(input as Row)) {
    const found = findRows(child, depth + 1);
    if (found.length) return found;
  }
  return [];
}

async function authorize(req: Request) {
  const configuredSyncSecret = Deno.env.get('GEOVICTORIA_SYNC_SECRET');
  const suppliedSyncSecret = req.headers.get('x-sync-secret');
  if (configuredSyncSecret && suppliedSyncSecret === configuredSyncSecret) {
    return { ok: true, actor: 'sync-secret' };
  }

  const authorization = req.headers.get('Authorization') || '';
  if (!authorization.startsWith('Bearer ')) return { ok: false, reason: 'Missing authorization' };

  const publishableKey = envMap('SUPABASE_PUBLISHABLE_KEYS').default || Deno.env.get('SUPABASE_ANON_KEY') || '';
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

  if (!employee || !['hr', 'admin'].includes(employee.role)) return { ok: false, reason: 'Admin or HR role required' };
  return { ok: true, actor: employee.id };
}

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });
  if (req.method !== 'POST') return json({ error: 'Method not allowed' }, 405);

  try {
    const access = await authorize(req);
    if (!access.ok) return json({ error: access.reason || 'Unauthorized' }, 401);

    const apiKey = Deno.env.get('GEOVICTORIA_API_KEY');
    const apiSecret = Deno.env.get('GEOVICTORIA_API_SECRET');
    if (!apiKey || !apiSecret) return json({ error: 'Faltan GEOVICTORIA_API_KEY o GEOVICTORIA_API_SECRET' }, 503);

    // GeoVictoria documents OAuth 1.0 endpoints under apiv3. The old portal
    // host (clients.geovictoria.com) is intentionally not used for API calls.
    const oauthBase = Deno.env.get('GEOVICTORIA_OAUTH_BASE_URL') || DEFAULT_OAUTH_BASE;
    const usersPath = Deno.env.get('GEOVICTORIA_USERS_PATH') || '/api/User/List';
    const groupsPath = Deno.env.get('GEOVICTORIA_GROUPS_PATH') || '/api/Group/ListGroup';

    const usersCall = await oauthPost(oauthBase, usersPath, apiKey, apiSecret);
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
        error: 'El endpoint OAuth de GeoVictoria devolvio HTML en lugar de JSON',
        endpoint: usersCall.url,
        final_url: usersCall.response.url,
      }, 502);
    }

    const users = findRows(usersCall.body);
    if (!users.length) {
      return json({
        error: 'GeoVictoria respondio JSON, pero no se encontro una lista de usuarios',
        response_type: Array.isArray(usersCall.body) ? 'array' : typeof usersCall.body,
        response_keys: usersCall.body && typeof usersCall.body === 'object' && !Array.isArray(usersCall.body)
          ? Object.keys(usersCall.body as Row).slice(0, 30)
          : [],
      }, 502);
    }

    const adminKey = envMap('SUPABASE_SECRET_KEYS').default || Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || '';
    if (!adminKey) return json({ error: 'Supabase admin key unavailable' }, 503);
    const admin = createClient(Deno.env.get('SUPABASE_URL') || '', adminKey, {
      auth: { persistSession: false, autoRefreshToken: false },
    });

    const ids = users
      .map((user) => value(user.Identifier ?? user.identifier ?? user.Id ?? user.id))
      .filter((id): id is string => Boolean(id));

    const existingRoles = new Map<string, string>();
    if (ids.length) {
      const { data: existing, error } = await admin.from('employees').select('geovictoria_id, role').in('geovictoria_id', ids);
      if (error) throw error;
      for (const row of existing || []) if (row.geovictoria_id) existingRoles.set(row.geovictoria_id, row.role);
    }

    let groups: Row[] = [];
    let groupWarning: string | null = null;
    try {
      const groupCall = await oauthPost(oauthBase, groupsPath, apiKey, apiSecret);
      if (groupCall.response.ok) groups = findRows(groupCall.body);
      else groupWarning = `Group/ListGroup HTTP ${groupCall.response.status}`;
    } catch (error) {
      groupWarning = error instanceof Error ? error.message : 'No se pudieron consultar grupos';
    }

    const supervisors = new Map<string, string[]>();
    const supervisorIds = new Set<string>();
    for (const group of groups) {
      const department = normalized(group.Description ?? group.description ?? group.GroupDescription);
      const rawSupervisors = Array.isArray(group.Supervisors) ? group.Supervisors as Row[] : [];
      const groupSupervisorIds = rawSupervisors
        .map((user) => value(user.Identifier ?? user.identifier ?? user.Id ?? user.id))
        .filter((id): id is string => Boolean(id));
      if (department && groupSupervisorIds.length) supervisors.set(department, groupSupervisorIds);
      groupSupervisorIds.forEach((id) => supervisorIds.add(id));
    }

    const now = new Date().toISOString();
    const records = users.map((user) => {
      const externalId = value(user.Identifier ?? user.identifier ?? user.Id ?? user.id) || '';
      const department = value(user.GroupDescription ?? user.groupDescription ?? user.Department ?? user.department);
      const candidateSupervisors = supervisors.get(normalized(department)) || [];
      const preservedRole = existingRoles.get(externalId);
      return {
        geovictoria_id: externalId,
        email: value(user.Email ?? user.email)?.toLowerCase() || null,
        full_name: `${value(user.Name ?? user.name) || ''} ${value(user.LastName ?? user.lastName) || ''}`.trim() || externalId,
        department,
        position: value(user.positionName ?? user.PositionName ?? user.PositionDescription ?? user.positionDescription ?? user.positionIdentifier ?? user.UserProfile ?? user.userProfile),
        supervisor_geovictoria_id: candidateSupervisors.find((id) => id !== externalId) || null,
        active: enabled(user.Enabled ?? user.enabled ?? user.Active ?? user.active),
        role: ['hr', 'admin'].includes(preservedRole || '')
          ? preservedRole
          : supervisorIds.has(externalId) ? 'supervisor' : 'employee',
        synced_at: now,
        updated_at: now,
      };
    }).filter((row) => row.geovictoria_id);

    const { error: upsertError } = await admin.from('employees').upsert(records, { onConflict: 'geovictoria_id' });
    if (upsertError) throw upsertError;

    const { data: relinked, error: relinkError } = await admin.rpc('relink_geovictoria_supervisors');
    if (relinkError) throw relinkError;

    return json({
      ok: true,
      source: DEFAULT_OAUTH_BASE,
      synced: records.length,
      active: records.filter((row) => row.active).length,
      groups: groups.length,
      groups_warning: groupWarning,
      supervisors_detected: supervisorIds.size,
      supervisors_relinked: relinked,
      actor: access.actor,
      token_api_hint: DEFAULT_TOKEN_BASE,
    });
  } catch (error) {
    console.error('GeoVictoria sync failed', error);
    return json({ error: error instanceof Error ? error.message : 'Unexpected sync error' }, 500);
  }
});
