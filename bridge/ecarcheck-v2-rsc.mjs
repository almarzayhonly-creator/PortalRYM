/*
 * eCarCheck V2 bridge helper.
 *
 * The revisados page is a Next.js React Flight response, not a JSON API.
 * This module extracts the serialised `Reviewed` payload without relying on
 * volatile chunk IDs, cookies, or session data.
 */
function asObject(value) {
  return value && typeof value === 'object' && !Array.isArray(value) ? value : null;
}

function isInspection(row) {
  const value = asObject(row);
  return !!value && Number.isFinite(Number(value.inspectionId)) && typeof value.plate === 'string';
}

function findReviewedPayload(value, seen = new Set()) {
  if (!value || typeof value !== 'object' || seen.has(value)) return null;
  seen.add(value);
  const object = asObject(value);
  if (object && Array.isArray(object.data) && object.data.some(isInspection)) {
    return { data: object.data, pagination: asObject(object.pagination) || {} };
  }
  for (const child of Array.isArray(value) ? value : Object.values(value)) {
    const found = findReviewedPayload(child, seen);
    if (found) return found;
  }
  return null;
}

/** Turns a `text/x-component` Flight response into the stable sync contract. */
function parseReviewedRsc(body) {
  if (typeof body !== 'string' || !body.trim()) throw new Error('RSC_VACIO');
  for (const line of body.split(/\r?\n/)) {
    const delimiter = line.indexOf(':');
    if (delimiter < 1) continue;
    const encoded = line.slice(delimiter + 1);
    if (!encoded.startsWith('[') && !encoded.startsWith('{')) continue;
    try {
      const found = findReviewedPayload(JSON.parse(encoded));
      if (found) return found;
    } catch (_) {
      // Flight lines can contain unresolved references such as $L2.
    }
  }
  throw new Error('RESPUESTA_LISTADO_INVALIDA');
}

function normalisePage(payload) {
  const raw = payload || {};
  const records = Array.isArray(raw.data) ? raw.data.filter(isInspection) : [];
  const pagination = asObject(raw.pagination) || {};
  return {
    data: records.map((row) => ({
      inspectionId: Number(row.inspectionId), revId: row.revId == null ? null : String(row.revId),
      garageId: Number(row.garageId) || null, garageCode: row.garageCode == null ? null : String(row.garageCode),
      garageName: row.garageName == null ? null : String(row.garageName), plate: String(row.plate).trim().toUpperCase(),
      externalId: row.externalId == null ? null : String(row.externalId), plateType: row.plateType == null ? null : String(row.plateType),
      type: row.type == null ? null : String(row.type), status: row.status == null ? null : String(row.status),
      year: Number(row.year) || null, date: row.date == null ? null : String(row.date),
      soapAtttSendAt: row.soapAtttSendAt == null ? null : String(row.soapAtttSendAt)
    })),
    pagination: {
      currentPage: Number(pagination.currentPage) || 1,
      recordsPerPage: Number(pagination.recordsPerPage) || records.length,
      totalRecords: Number(pagination.totalRecords) || records.length,
      totalPages: Number(pagination.totalPages) || 1
    }
  };
}

export { parseReviewedRsc, normalisePage };
