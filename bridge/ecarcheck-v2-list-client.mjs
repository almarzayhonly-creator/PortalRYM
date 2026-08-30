import { normalisePage, parseReviewedRsc } from './ecarcheck-v2-rsc.mjs';

const V2_ORIGIN = 'https://v2.ecarcheck.net';

function panamaDate(offsetDays = 0, now = new Date()) {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'America/Panama', year: 'numeric', month: '2-digit', day: '2-digit'
  }).formatToParts(now).reduce((out, part) => ({ ...out, [part.type]: part.value }), {});
  const date = new Date(`${parts.year}-${parts.month}-${parts.day}T12:00:00-05:00`);
  date.setUTCDate(date.getUTCDate() + offsetDays);
  return date.toISOString().slice(0, 10);
}

function listUrl({ page, startDate, endDate, rscNonce = Date.now().toString(36) }) {
  const url = new URL('/dashboard/revisados', V2_ORIGIN);
  url.searchParams.set('status', 'APROBADO');
  url.searchParams.set('page', String(page));
  url.searchParams.set('startDate', startDate);
  url.searchParams.set('endDate', endDate);
  url.searchParams.set('_rsc', rscNonce);
  return url;
}

class SessionRequiredError extends Error {
  constructor(detail = 'La sesión eCarCheck V2 no es válida.') {
    super(detail);
    this.name = 'SessionRequiredError';
  }
}

async function fetchReviewedPage(fetchImpl, options) {
  const response = await fetchImpl(listUrl(options), {
    method: 'GET', credentials: 'include', redirect: 'manual',
    headers: { Accept: 'text/x-component', RSC: '1' }
  });
  const raw = await response.text();
  if (response.status === 401 || response.status === 403 || response.type === 'opaqueredirect' || /\/login(?:[/?#]|$)/i.test(response.headers.get('location') || '')) {
    throw new SessionRequiredError();
  }
  if (!response.ok) throw new Error(`LISTADO_HTTP_${response.status}`);
  return normalisePage(parseReviewedRsc(raw));
}

async function fetchReviewedList(fetchImpl, { lookbackDays = 1, now, maxPages = 100 } = {}) {
  const endDate = panamaDate(0, now);
  const startDate = panamaDate(-Math.max(0, Number(lookbackDays) || 0), now);
  const first = await fetchReviewedPage(fetchImpl, { page: 1, startDate, endDate });
  const totalPages = Math.min(Math.max(1, first.pagination.totalPages), maxPages);
  const pages = [first];
  for (let page = 2; page <= totalPages; page += 1) {
    pages.push(await fetchReviewedPage(fetchImpl, { page, startDate, endDate }));
  }
  const known = new Set();
  const data = pages.flatMap((item) => item.data).filter((row) => {
    if (known.has(row.inspectionId)) return false;
    known.add(row.inspectionId);
    return true;
  });
  return { data, pagination: { ...first.pagination, currentPage: 1, totalPages, totalRecords: data.length }, range: { startDate, endDate } };
}

async function bridgeRequest(fetchImpl, bridgeUrl, bridgeId, bridgeToken, action, body = {}) {
  const response = await fetchImpl(bridgeUrl, {
    method: 'POST', headers: {
      'content-type': 'application/json', 'x-bridge-id': bridgeId, 'x-bridge-token': bridgeToken
    }, body: JSON.stringify({ action, ...body })
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok || !data.ok) throw new Error(data.detail || data.error || `BRIDGE_HTTP_${response.status}`);
  return data;
}

/**
 * Runs only the React Flight list action. Existing bridge handlers retain
 * ownership of VEHICULO_BOLETAS and all individual checks.
 */
async function processReviewedList({ fetchImpl = fetch, bridgeUrl, bridgeId, bridgeToken, item, lookbackDays = 1, now }) {
  if (String(item?.tipo_consulta || '').toUpperCase() !== 'LISTADO_REVISADOS') return false;
  try {
    const payload = await fetchReviewedList(fetchImpl, { lookbackDays, now });
    await bridgeRequest(fetchImpl, bridgeUrl, bridgeId, bridgeToken, 'complete_list', {
      queue_id: item.id, payload, bridge_version: 'rym-rsc-list-1'
    });
    return { ok: true, rows: payload.data.length, range: payload.range };
  } catch (error) {
    const sessionRequired = error instanceof SessionRequiredError;
    await bridgeRequest(fetchImpl, bridgeUrl, bridgeId, bridgeToken, 'fail', {
      queue_id: item.id,
      code: sessionRequired ? 'SESION_REQUERIDA' : 'RESPUESTA_LISTADO_INVALIDA',
      detail: String(error.message || error).slice(0, 1000),
      session_required: sessionRequired
    });
    throw error;
  }
}

export { SessionRequiredError, fetchReviewedList, processReviewedList };
