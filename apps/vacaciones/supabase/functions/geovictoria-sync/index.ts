import { createClient } from '@supabase/supabase-js';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-sync-secret',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

type GeoUser = Record<string, unknown>;
type GeoGroup = Record<string, unknown>;

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

function asArray(payload: unknown, keys: string[]) {
  if (Array.isArray(payload)) return payload as Record<string, unknown>[];
  if (!payload || typeof payload !== 'object') return [];
  const obj = payload as Record<string, unknown>;
  for (const key of keys) {
    if (Array.isArray(obj[key])) return obj[key] as Record<string, unknown>[];
  }
  return [];
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
  let payload: unknown = null;
  try {
    payload = bodyText ? JSON.parse(bodyText) : null;
  } catch {
    payload = bodyText;
  }

  if (!response.ok) {
    throw new Error(`GeoVictoria ${path} respondio ${response.status}: ${typeof payload === 'string' ? payload.slice(0, 240) : JSON.stringify(payload).slice(0, 240)}`);
  }
  return payload;
}

function supervisorMap(groups: GeoGroup[]) {
  const byDepartment = new Map<string, string[]>();
  const supervisorIds = new Set<string>();

  for (const group of groups) {
    const department = normalized(group.Description ?? group.description);
    if (!department) continue;
    const supervisors = asArray(group.Supervisors ?? group.supervisors, ['data', 'users']);
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

    const users = asArray(usersPayload, ['data', 'users', 'Users', 'result', 'Result']);
    const groups = asArray(groupsPayload, ['data', 'groups', 'Groups', 'result', 'Result']);
    if (!users.length) return json({ error: 'GeoVictoria no devolvio usuarios en un formato reconocido' }, 502);

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
      .map((user: GeoUser) => {
        const externalId = text(user.Identifier ?? user.identifier ?? user.Id ?? user.id) || '';
        const department = text(user.GroupDescription ?? user.groupDescription ?? user.Department ?? user.department);
        const departmentKey = normalized(department);
        const candidates = byDepartment.get(departmentKey) || [];
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
