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

const defaultMap: FieldMap = {
  externalId: 'id',
  email: 'email',
  fullName: 'name',
  department: 'department',
  position: 'position',
  supervisorExternalId: 'supervisor_id',
  active: 'active',
};

function pick(row: Record<string, unknown>, path: string) {
  return path.split('.').reduce<unknown>((value, key) => {
    if (!value || typeof value !== 'object') return undefined;
    return (value as Record<string, unknown>)[key];
  }, row);
}

Deno.serve(async (req: Request) => {
  if (req.method !== 'POST') return new Response('Method not allowed', { status: 405 });

  const expectedSecret = Deno.env.get('GEOVICTORIA_SYNC_SECRET');
  if (!expectedSecret || req.headers.get('x-sync-secret') !== expectedSecret) {
    return new Response('Unauthorized', { status: 401 });
  }

  const apiBase = Deno.env.get('GEOVICTORIA_API_BASE_URL');
  const employeesPath = Deno.env.get('GEOVICTORIA_EMPLOYEES_PATH');
  const apiToken = Deno.env.get('GEOVICTORIA_API_TOKEN');
  if (!apiBase || !employeesPath || !apiToken) {
    return Response.json({ error: 'GeoVictoria configuration is incomplete' }, { status: 503 });
  }

  const map: FieldMap = {
    ...defaultMap,
    ...(JSON.parse(Deno.env.get('GEOVICTORIA_FIELD_MAP') || '{}') as Partial<FieldMap>),
  };

  const response = await fetch(new URL(employeesPath, apiBase), {
    headers: {
      Authorization: `Bearer ${apiToken}`,
      Accept: 'application/json',
    },
  });

  if (!response.ok) {
    return Response.json({ error: `GeoVictoria returned ${response.status}` }, { status: 502 });
  }

  const payload = await response.json();
  const sourceRows = Array.isArray(payload) ? payload : payload.data || payload.employees || [];
  if (!Array.isArray(sourceRows)) {
    return Response.json({ error: 'Unsupported GeoVictoria payload' }, { status: 502 });
  }

  const records = sourceRows
    .map((row: Record<string, unknown>) => ({
      geovictoria_id: String(pick(row, map.externalId) ?? ''),
      email: pick(row, map.email) ? String(pick(row, map.email)).trim().toLowerCase() : null,
      full_name: String(pick(row, map.fullName) ?? 'Sin nombre'),
      department: pick(row, map.department) ? String(pick(row, map.department)) : null,
      position: pick(row, map.position) ? String(pick(row, map.position)) : null,
      supervisor_geovictoria_id: pick(row, map.supervisorExternalId)
        ? String(pick(row, map.supervisorExternalId))
        : null,
      active: pick(row, map.active) !== false,
      synced_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    }))
    .filter((row: { geovictoria_id: string }) => row.geovictoria_id);

  const supabase = createClient(
    Deno.env.get('SUPABASE_URL') || '',
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || '',
    { auth: { persistSession: false, autoRefreshToken: false } },
  );

  const { error: upsertError } = await supabase
    .from('employees')
    .upsert(records, { onConflict: 'geovictoria_id' });

  if (upsertError) return Response.json({ error: upsertError.message }, { status: 500 });

  const { data: relinked, error: relinkError } = await supabase.rpc('relink_geovictoria_supervisors');
  if (relinkError) return Response.json({ error: relinkError.message }, { status: 500 });

  return Response.json({ ok: true, synced: records.length, supervisors_relinked: relinked });
});
