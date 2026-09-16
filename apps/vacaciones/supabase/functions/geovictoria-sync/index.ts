import { createClient } from '@supabase/supabase-js';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-sync-secret',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

type Row = Record<string, unknown>;

type EmployeeRecord = {
  geovictoria_id: string;
  email: string | null;
  full_name: string;
  department: string | null;
  position: string | null;
  supervisor_geovictoria_id: string | null;
  active: boolean;
  role: string;
  synced_at: string;
  updated_at: string;
};

function json(data: unknown, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
}

function envJsonMap(name: string) {
  const raw = Deno.env.get(name);
  if (!raw) return {} as Record<string, string>;
  try {
    return JSON.parse(raw) as Record<string, string>;
  } catch {
    return {} as Record<string, string>;
  }
}

function rfc3986(value: string) {
  return encodeURIComponent(value).replace(/[!'()*]/g, (char) => `%${char.charCodeAt(0).toString(16).toUpperCase()}`);
}

function base64(bytes: ArrayBuffer) {
  let binary = '';
  for (const byte of new Uint8Array(bytes)) binary += String.fromCharCode(byte);
  return btoa(binary);
}

async function oauthHeader(method: string, url: string, consumerKey: string, consumerSecret: string) {
  const params: Record<string, string> = {
    oauth_consumer_key: consumerKey,
    oauth_nonce: crypto.randomUUID().replaceAll('-', ''),
    oauth_signature_method: 'HMAC-SHA1',
    oauth_timestamp: Math.floor(Date.now() / 1000).toString(),
    oauth_version: '1.0',
  };

  const normalizedParams = Object.entries(params)
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([key, value]) => `${rfc3986(key)}=${rfc3986(value)}`)
    .join('&');

  const baseString = [method.toUpperCase(), rfc3986(url), rfc3986(normalizedParams)].join('&');
  const signingKey = `${rfc3986(consumerSecret)}&`;
  const key = await crypto.subtle.importKey(
    'raw',
    new TextEncoder().encode(signingKey),
    { name: 'HMAC', hash: 'SHA-1' },
    false,
    ['sign'],
  );
  const signature = base64(await crypto.subtle.sign('HMAC', key, new TextEncoder().encode(baseString)));

  return `OAuth ${Object.entries({ ...params, oauth_signature: signature })
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([key, value]) => `${rfc3986(key)}="${rfc3986(value)}"`)
    .join(', ')}`;
}

function text(value: unknown) {
  if (value === null || value === undefined) return null;
  const result = String(value).trim();
  return result || null;
}

function normalized(value: unknown) {
  return (text(value) || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();
}

function isEnabled(value: unknown) {
  if (value === null || value === undefined || value === '') return true;
  if (typeof value === 'boolean') return value;
  if (typeof value === 'number') return value !== 0;
  const lowered = String(value).trim().toLowerCase();
  return !['0', 'false', 'no', 'inactive', 'disabled', 'inactivo', 'deshabilitado'].includes(lowered);
}

function parseJsonString(value: unknown): unknown {
  let current = value;
  for (let i = 0; i < 3 && typeof current === 'string'; i += 1) {
    const candidate = current.trim();
    if (!candidate || (!candidate.startsWith('{') && !candidate.startsWith('[') && !candidate.startsWith('"'))) break;
    try {
      current = JSON.parse(candidate);
    } catch {
      break;
    }
  }
  return current;
}

function rowHasAnyKey(row: unknown, keys: string[]) {
  if (!row || typeof row !== 'object' || Array.isArray(row)) return false;
  return keys.some((key) => Object.prototype.hasOwnProperty.call(row, key));
}

function findRecordArray(
  input: unknown,
  preferredKeys: string[],
  signatureKeys: string[],
  depth = 0,
): Row[] {
  if (depth > 6) return [];
  const payload = parseJsonString(input);

  if (Array.isArray(payload)) {
    if (!payload.length) return [];
    if (payload.some((item) => rowHasAnyKey(item, signatureKeys))) return payload as Row[];
    for (const item of payload) {
      const nested = findRecordArray(item, preferredKeys, signatureKeys, depth + 1);
      if (nested.length) return nested;
    }
    return [];
  }

  if (!payload || typeof payload !== 'object') return [];
  const obj = payload as Row;

  for (const key of preferredKeys) {
    if (Object.prototype.hasOwnProperty.call(obj, key)) {
      const found = findRecordArray(obj[key], preferredKeys, signatureKeys, depth + 1);
      if (found.length) return found;
    }
  }

  for (const value of Object.values(obj)) {
    const found = findRecordArray(value, preferredKeys, signatureKeys, depth + 1);
    if (found.length) return found;
  }

  return [];
}

function describePayload(input: unknown, depth = 0): unknown {
  if (depth > 3) return 'max-depth';
  const payload = parseJsonString(input);
  if (Array.isArray(payload)) {
    return {
      type: 'array',
      length: payload.length,
      first_keys: payload[0] && typeof payload[0] === 'object' && !Array.isArray(payload[0])
        ? Object.keys(payload[0] as Row).slice(0, 30)
        : [],
    };
  }
  if (payload && typeof payload === 'object') {
    const obj = payload as Row;
    const keys = Object.keys(obj).slice(0, 30);
    const children: Record<string, unknown> = {};
    for (const key of keys.slice(0, 10)) {
      const value = obj[key];
      if (Array.isArray(value) || (value && typeof value === 'object') || typeof value === 'string') {
        children[key] = describePayload(value, depth + 1);
      } else {
        children[key] = typeof value;
      }
    }
    return { type: 'object', keys, children };
  }
  return { type: typeof payload };
}

async function geoPost(baseUrl: string, path: string, apiKey: string, apiSecret: string) {
  const url = new URL(path, baseUrl).toString();
  const authorization = await oauthHeader('POST', url, apiKey, apiSecret);
  const response = await fetch(url, {
    method: 'POST',
    headers: {
      Authorization: authorization,
      Accept: 'application/json',
      'Content-Type': 'application/json',
    },
    body: '{}',
  });

  const bodyText = await response.text();
  const payload = parseJsonString(bodyText);

  if (!response.ok) {
    throw new Error(`GeoVictoria ${path} respondio ${response.status}`);
  }
  return payload;
}

function supervisorMap(groups: Row[]) {
  const byDepartment = new Map<string, string[]>();
  const supervisorIds = new Set<string>();

  for (const group of groups) {
    const department = normalized(group.Description ?? group.description ?? group.GroupDescription);
    if (!department) continue;
    const supervisors = findRecordArray(
      group.Supervisors ?? group.supervisors ?? group.GroupLeaders ?? group.groupLeaders,
      ['Supervisors', 'supervisors', 'GroupLeaders', 'groupLeaders', 'Users', 'users', 'data'],
      ['Identifier', 'identifier', 'Id', 'id'],
    );
    const ids = supervisors
      .map((item) => text(item.Identifier ?? item.identifier ?? item.Id ?? item.id))
      .filter((value): value is string => Boolean(value));
    if (ids.length) byDepartment.set(department, ids);
    ids.forEach((id) => supervisorIds.add(id));
  }

  return { byDepartment, supervisorIds };
}

async function authorize(req: Request) {
  const configuredSyncSecret = Deno.env.get('GEOVICTORIA_SYNC_SECRET');
  const suppliedSyncSecret = req.headers.get('x-sync-secret');
  if (configuredSyncSecret && suppliedSyncSecret && suppliedSyncSecret === configuredSyncSecret) {
    return { ok: true, actor: 'sync-secret' };
  }

  const authorization = req.headers.get('Authorization') || '';
  if (!authorization.startsWith('Bearer ')) return { ok: false, reason: 'Missing authorization' };

  const publishableKeys = envJsonMap('SUPABASE_PUBLISHABLE_KEYS');
  const publishableKey = publishableKeys.default || Deno.env.get('SUPABASE_ANON_KEY') || '';
  if (!publishableKey) return { ok: false, reason: 'Supabase publishable key unavailable' };

  const userClient = createClient(Deno.env.get('SUPABASE_URL') || '', publishableKey, {
    global: { headers: { Authorization: authorization } },
    auth: { persistSession: false, autoRefreshToken: false },
  });

  const token = authorization.slice('Bearer '.length);
  const { data: userData, error: userError } = await userClient.auth.getUser(token);
  if (userError || !userData.user) return { ok: false, reason: 'Invalid user session' };

  const { data: employee, error: employeeError } = await userClient
    .from('employees')
    .select('id, role, active')
    .eq('auth_user_id', userData.user.id)
    .eq('active', true)
    .maybeSingle();

  if (employeeError || !employee || !['hr', 'admin'].includes(employee.role)) {
    return { ok: false, reason: 'Admin or HR role required' };
  }

  return { ok: true, actor: employee.id };
}

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });
  if (req.method !== 'POST') return json({ error: 'Method not allowed' }, 405);

  try {
    const access = await authorize(req);
    if (!access.ok) return json({ error: access.reason || 'Unauthorized' }, 401);

    const apiBase = Deno.env.get('GEOVICTORIA_API_BASE_URL');
    const apiKey = Deno.env.get('GEOVICTORIA_API_KEY');
    const apiSecret = Deno.env.get('GEOVICTORIA_API_SECRET');
    const usersPath = Deno.env.get('GEOVICTORIA_USERS_PATH') || '/api/User/List';
    const groupsPath = Deno.env.get('GEOVICTORIA_GROUPS_PATH');

    if (!apiBase || !apiKey || !apiSecret) {
      return json({ error: 'Faltan GEOVICTORIA_API_BASE_URL, GEOVICTORIA_API_KEY o GEOVICTORIA_API_SECRET' }, 503);
    }

    const secretKeys = envJsonMap('SUPABASE_SECRET_KEYS');
    const supabaseSecret = secretKeys.default || Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || '';
    if (!supabaseSecret) return json({ error: 'Supabase admin key unavailable in function environment' }, 503);

    const admin = createClient(Deno.env.get('SUPABASE_URL') || '', supabaseSecret, {
      auth: { persistSession: false, autoRefreshToken: false },
    });

    const usersPayload = await geoPost(apiBase, usersPath, apiKey, apiSecret);
    let groupsPayload: unknown = [];
    let groupsWarning: string | null = null;
    if (groupsPath) {
      try {
        groupsPayload = await geoPost(apiBase, groupsPath, apiKey, apiSecret);
      } catch (error) {
        groupsWarning = error instanceof Error ? error.message : 'No se pudo consultar grupos';
      }
    }

    const users = findRecordArray(
      usersPayload,
      ['data', 'users', 'Users', 'userList', 'UserList', 'result', 'Result', 'response', 'Response', '_message', 'message'],
      ['Identifier', 'identifier', 'Name', 'name', 'Email', 'email', 'GroupIdentifier', 'GroupDescription'],
    );
    const groups = findRecordArray(
      groupsPayload,
      ['data', 'groups', 'Groups', 'groupList', 'GroupList', 'result', 'Result', 'response', 'Response', '_message', 'message'],
      ['Description', 'description', 'CostCenter', 'Path', 'GroupIdentifier'],
    );

    if (!users.length) {
      return json({
        error: 'GeoVictoria respondio correctamente, pero la lista de usuarios viene en una estructura no reconocida',
        diagnostic: describePayload(usersPayload),
      }, 502);
    }

    const { byDepartment, supervisorIds } = supervisorMap(groups);
    const ids = users
      .map((user) => text(user.Identifier ?? user.identifier ?? user.Id ?? user.id))
      .filter((value): value is string => Boolean(value));

    const existingRoles = new Map<string, string>();
    if (ids.length) {
      const { data: existing, error: existingError } = await admin
        .from('employees')
        .select('geovictoria_id, role')
        .in('geovictoria_id', ids);
      if (existingError) throw existingError;
      for (const row of existing || []) {
        if (row.geovictoria_id) existingRoles.set(row.geovictoria_id, row.role);
      }
    }

    const now = new Date().toISOString();
    const records: EmployeeRecord[] = users
      .map((user) => {
        const externalId = text(user.Identifier ?? user.identifier ?? user.Id ?? user.id) || '';
        const department = text(user.GroupDescription ?? user.groupDescription ?? user.Department ?? user.department);
        const candidates = byDepartment.get(normalized(department)) || [];
        const supervisorExternalId = candidates.find((candidate) => candidate !== externalId) || null;
        const preservedRole = existingRoles.get(externalId);
        const role = ['hr', 'admin'].includes(preservedRole || '')
          ? preservedRole!
          : supervisorIds.has(externalId)
            ? 'supervisor'
            : 'employee';
        const firstName = text(user.Name ?? user.name) || '';
        const lastName = text(user.LastName ?? user.lastName) || '';
        const fullName = `${firstName} ${lastName}`.trim() || externalId;
        const email = text(user.Email ?? user.email)?.toLowerCase() || null;
        const position = text(
          user.positionName ??
          user.PositionName ??
          user.PositionDescription ??
          user.positionDescription ??
          user.positionIdentifier ??
          user.UserProfile ??
          user.userProfile,
        );

        return {
          geovictoria_id: externalId,
          email,
          full_name: fullName,
          department,
          position,
          supervisor_geovictoria_id: supervisorExternalId,
          active: isEnabled(user.Enabled ?? user.enabled ?? user.Active ?? user.active),
          role,
          synced_at: now,
          updated_at: now,
        };
      })
      .filter((row) => row.geovictoria_id);

    if (!records.length) {
      return json({
        error: 'Se encontro una lista, pero no contiene Identifier utilizable',
        diagnostic: describePayload(usersPayload),
      }, 502);
    }

    const { error: upsertError } = await admin
      .from('employees')
      .upsert(records, { onConflict: 'geovictoria_id' });
    if (upsertError) throw upsertError;

    const { data: relinked, error: relinkError } = await admin.rpc('relink_geovictoria_supervisors');
    if (relinkError) throw relinkError;

    return json({
      ok: true,
      synced: records.length,
      active: records.filter((row) => row.active).length,
      groups: groups.length,
      groups_warning: groupsWarning,
      supervisors_detected: supervisorIds.size,
      supervisors_relinked: relinked,
      actor: access.actor,
    });
  } catch (error) {
    console.error('GeoVictoria sync failed', error);
    return json({ error: error instanceof Error ? error.message : 'Unexpected sync error' }, 500);
  }
});
