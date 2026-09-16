import { createClient } from '@supabase/supabase-js';

type FieldMap = {
  externalId: string;
  email: string;
  fullName: string;
  department: string;
  position: string;
  supervisorExternalId: string;
  active: string;
};

const defaults: FieldMap = {
  externalId: 'id',
  email: 'email',
  fullName: 'name',
  department: 'department',
  position: 'position',
  supervisorExternalId: 'supervisor_id',
  active: 'active',
};

const pick = (row: Record<string, unknown>, path: string) => path.split('.').reduce<unknown>((value, key) => (value && typeof value === 'object' ? (value as Record<string, unknown>)[key] : undefined), row);

Deno.serve(async (req: Request) => {
  if (req.method !== 'POST') return new Response('Method not allowed', { status: 405 });

  const expectedSecret = Deno.env.get('GEOVICTORIA_SYNC_SECRET');
  if (!expectedSecret || req.headers.get('x-sync-secret') !== expectedSecret) {
    return new Response('Unauthorized', { status: 401 });
  }

  const apiBase = Deno.env.get('GEOVICTORIA_API_BASE_URL');
  const employeesPath = Deno.env.get('GEOVICTORIA_EMPLOYEES_PATH');
  const apiToken = Deno.env.get('GEOVICTORIA_API_TOKEN');
  if (!apiBase || !employeesPath || !apiToken) return new Response('GeoVictoria configuration is incomplete', { status: 500 });

  const map: FieldMap = { ...defaults, ...(JSON.parse(Deno.env.get('GEOVICTORIA_FIELD_MAP') || '{}') as Partial<FieldMap>) };
  const response = await fetch(new URL(employeesPath, apiBase), {
    headers: {
      Authorization: `Bearer ${apiToken}`,
      Accept: 'application/json',
    },
  });

  if (!response.ok) return new Response(`GeoVictoria returned ${response.status}`, { status: 502 });

  const payload = await response.json();
  const rows = Array.isArray(payload) ? payload : payload.data || payload.employees || [];
  if (!Array.isArray(rows)) return new Response('Unsupported GeoVictoria payload', { status: 502 });

  const records = rows.map((row: Record<string, unknown>) => ({
    geovictoria_id: String(pick(row, map.externalId) ?? ''),
    email: pick(row, map.email) ? String(pick(row, map.email)).trim().toLowerCase() : null,
    full_name: String(pick(row, map.fullName) ?? 'Sin nombre'),
    department: pick(row, map.department) ? String(pick(row, map.department)) : null,
    position: pick(row, map.position) ? String(pick(row, map.position)) : null,
    supervisor_geovictoria_id: pick(row, map.supervisorExternalId) ? String(pick(row, map.supervisorExternalId)) : null,
    active: pick(row, map.active) !== false,
    synced_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  })).filter((row: { geovictoria_id: string }) => row.geovictoria_id);

  const supabase = createClient(
    Deno.env.get('SUPABASE_URL') || '',
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || '',
    { auth: { persistSession: false, autoRefreshToken: false } },
  );

  const { error: upsertError } = await supabase.from('employees').upsert(records, { onConflict: 'geovictoria_id' });
  if (upsertError) return Response.json({ error: upsertError.message }, { status: 500 });

  const { data: relinked, error: relinkError } = await supabase.rpc('relink_geovictoria_supervisors');
  if (relinkError) return Response.json({ error: relinkError.message }, { status: 500 });

  return Response.json({ ok: true, synced: records.length, supervisors_relinked: relinked });
});
