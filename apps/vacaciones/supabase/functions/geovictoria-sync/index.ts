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
  return !['0', 'false', 'no', 'inactive', 'disabled', 'inactivo', 'deshabilitado']
    .includes(String(value).trim().toLowerCase());
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

function parseStructured(value: unknown): unknown {
  let current = value;
  for (let i = 0; i < 4 && typeof current === 'string'; i += 1) {
    const candidate = current.replace(/^\uFEFF/, '').trim();
    if (!candidate) return candidate;
    try {
      current = JSON.parse(candidate);
      continue;
    } catch {
      return candidate;
    }
  }
  return current;
}

function rowHasAnyKey(row: unknown, keys: string[]) {
  if (!row || typeof row !== 'object' || Array.isArray(row)) return false;
  return keys.some((key) => Object.prototype.hasOwnProperty.call(row, key));
}

function findRecordArray(input: unknown, preferredKeys: string[], signatureKeys: string[], depth = 0): Row[] {
  if (depth > 8) return [];
  const payload = parseStructured(input);

  if (Array.isArray(payload)) {
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

function safeUrl(value: string) {
  try {
    const url = new URL(value);
    return `${url.origin}${url.pathname}`;
  } catch {
    return value;
  }
}

function htmlTitle(raw: string) {
  return raw.match(/<title[^>]*>([\s\S]*?)<\/title>/i)?.[1]
    ?.replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;/gi, ' ')
    .replace(/\s+/g, ' ')
    .trim() || null;
}

function visibleHtmlText(raw: string) {
  return raw
    .replace(/<script[\s\S]*?<\/script>/gi, ' ')
    .replace(/<style[\s\S]*?<\/style>/gi, ' ')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;/gi, ' ')
    .replace(/&amp;/gi, '&')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, 260);
}

async function oauthPost(baseUrl: string, path: string, apiKey: string, apiSecret: string) {
  const requestUrl = new URL(path, baseUrl).toString();
  const authorization = await oauthHeader('POST', requestUrl, apiKey, apiSecret);
  const response = await fetch(requestUrl, {
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
  return {
    ok: response.ok,
    status: response.status,
    contentType: response.headers.get('content-type'),
    redirected: response.redirected,
    requestUrl: safeUrl(requestUrl),
    finalUrl: safeUrl(response.url),
    raw,
    payload: parseStructured(raw),
  };
}

async function loginProbe(baseUrl: string, apiKey: string, apiSecret: string) {
  const requestUrl = new URL('/api/v1/Login', baseUrl).toString();
  try {
    const response = await fetch(requestUrl, {
      method: 'POST',
      redirect: 'follow',
      headers: { Accept: 'application/json', 'Content-Type': 'application/json' },
      body: JSON.stringify({ User: apiKey, Password: apiSecret }),
    });
    const raw = await response.text();
    const parsed = parseStructured(raw);
    const token = typeof parsed === 'string' ? parsed : text((parsed as Row | null)?.token ?? (parsed as Row | null)?.Token);
    return {
      status: response.status,
      ok: response.ok,
      content_type: response.headers.get('content-type'),
      redirected: response.redirected,
      request_url: safeUrl(requestUrl),
      final_url: safeUrl(response.url),
      token_like: Boolean(token && /^[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+$/.test(token.replace(/^"|"$/g, ''))),
      html_title: /<html/i.test(raw) ? htmlTitle(raw) : null,
      html_text: /<html/i.test(raw) ? visibleHtmlText(raw) : null,
    };
  } catch (error) {
    return { ok: false, error: error instanceof Error ? error.message : 'Login probe failed' };
  }
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

  const publishableKey = envJsonMap('SUPABASE_PUBLISHABLE_KEYS').default || Deno.env.get('SUPABASE_ANON_KEY') || '';
  if (!publishableKey) return { ok: false, reason: 'Supabase publishable key unavailable' };

  const userClient = createClient(Deno.env.get('SUPABASE_URL') || '', publishableKey, {
    global: { headers: { Authorization: authorization } },
    auth: { persistSession: false, autoRefreshToken: false },
  });

  const { data: userData, error: userError } = await userClient.auth.getUser(authorization.slice(7));
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

    const adminKey = envJsonMap('SUPABASE_SECRET_KEYS').default || Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || '';
    if (!adminKey) return json({ error: 'Supabase admin key unavailable' }, 503);
    const admin = createClient(Deno.env.get('SUPABASE_URL') || '', adminKey, {
      auth: { persistSession: false, autoRefreshToken: false },
    });

    const usersResponse = await oauthPost(apiBase, usersPath, apiKey, apiSecret);
    if (!usersResponse.ok) {
      return json({
        error: `GeoVictoria ${usersPath} respondio HTTP ${usersResponse.status}`,
        endpoint: {
          request_url: usersResponse.requestUrl,
          final_url: usersResponse.finalUrl,
          redirected: usersResponse.redirected,
          content_type: usersResponse.contentType,
        },
      }, 502);
    }

    const users = findRecordArray(
      usersResponse.payload,
      ['data', 'users', 'Users', 'userList', 'UserList', 'result', 'Result', 'response', 'Response', '_message', 'message'],
      ['Identifier', 'identifier', 'Name', 'name', 'Email', 'email', 'GroupIdentifier', 'GroupDescription'],
    );

    if (!users.length) {
      const isHtml = /text\/html/i.test(usersResponse.contentType || '') || /<html/i.test(usersResponse.raw);
      return json({
        error: isHtml
          ? 'La URL configurada esta devolviendo una pagina web HTML, no la API de usuarios de GeoVictoria'
          : 'GeoVictoria respondio, pero aun no pude extraer la lista de usuarios',
        endpoint: {
          request_url: usersResponse.requestUrl,
          final_url: usersResponse.finalUrl,
          redirected: usersResponse.redirected,
          content_type: usersResponse.contentType,
          html_title: isHtml ? htmlTitle(usersResponse.raw) : null,
          html_text: isHtml ? visibleHtmlText(usersResponse.raw) : null,
        },
        login_probe: await loginProbe(apiBase, apiKey, apiSecret),
      }, 502);
    }

    let groups: Row[] = [];
    let groupsWarning: string | null = null;
    if (groupsPath) {
      try {
        const groupsResponse = await oauthPost(apiBase, groupsPath, apiKey, apiSecret);
        if (groupsResponse.ok) {
          groups = findRecordArray(
            groupsResponse.payload,
            ['data', 'groups', 'Groups', 'groupList', 'GroupList', 'result', 'Result', 'response', 'Response', '_message', 'message'],
            ['Description', 'description', 'CostCenter', 'Path', 'Identifier'],
          );
        } else {
          groupsWarning = `GeoVictoria ${groupsPath} respondio HTTP ${groupsResponse.status}`;
        }
      } catch (error) {
        groupsWarning = error instanceof Error ? error.message : 'No se pudo consultar grupos';
      }
    }

    const ids = users
      .map((u) => text(u.Identifier ?? u.identifier ?? u.Id ?? u.id))
      .filter((v): v is string => Boolean(v));

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

    const { byDepartment, supervisorIds } = supervisorMap(groups);
    const now = new Date().toISOString();
    const records: EmployeeRecord[] = users.map((u) => {
      const externalId = text(u.Identifier ?? u.identifier ?? u.Id ?? u.id) || '';
      const department = text(u.GroupDescription ?? u.groupDescription ?? u.Department ?? u.department);
      const candidates = byDepartment.get(normalized(department)) || [];
      const preservedRole = existingRoles.get(externalId);
      return {
        geovictoria_id: externalId,
        email: text(u.Email ?? u.email)?.toLowerCase() || null,
        full_name: `${text(u.Name ?? u.name) || ''} ${text(u.LastName ?? u.lastName) || ''}`.trim() || externalId,
        department,
        position: text(u.positionName ?? u.PositionName ?? u.PositionDescription ?? u.positionDescription ?? u.positionIdentifier ?? u.UserProfile ?? u.userProfile),
        supervisor_geovictoria_id: candidates.find((id) => id !== externalId) || null,
        active: isEnabled(u.Enabled ?? u.enabled ?? u.Active ?? u.active),
        role: ['hr', 'admin'].includes(preservedRole || '')
          ? preservedRole!
          : supervisorIds.has(externalId)
            ? 'supervisor'
            : 'employee',
        synced_at: now,
        updated_at: now,
      };
    }).filter((row) => row.geovictoria_id);

    if (!records.length) return json({ error: 'La lista no contiene Identifier utilizable' }, 502);

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
