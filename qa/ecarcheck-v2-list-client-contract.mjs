import assert from 'node:assert/strict';
import { fetchReviewedList, processReviewedList } from '../bridge/ecarcheck-v2-list-client.mjs';

const rsc = (id, plate, page, totalPages) => `2:["$","$Lb",null,{"data":[{"inspectionId":${id},"revId":"R${id}","plate":"${plate}","status":"APROBADO"}],"pagination":{"currentPage":${page},"recordsPerPage":10,"totalRecords":2,"totalPages":${totalPages}}}]`;
const calls = [];
const mockFetch = async (url, init = {}) => {
  calls.push({ url: String(url), init });
  if (String(url).startsWith('https://bridge.example')) return new Response(JSON.stringify({ ok: true }), { status: 200 });
  const page = Number(new URL(url).searchParams.get('page'));
  return new Response(rsc(page === 1 ? 3566438 : 3566030, page === 1 ? 'EV6587' : 'EM3624', page, 2), { status: 200 });
};

const result = await fetchReviewedList(mockFetch, { now: new Date('2026-08-29T12:00:00-05:00') });
assert.deepEqual(result.data.map((row) => row.inspectionId), [3566438, 3566030]);
assert.equal(calls.filter((call) => String(call.url).includes('/dashboard/revisados')).length, 2);
const handled = await processReviewedList({ fetchImpl: mockFetch, bridgeUrl: 'https://bridge.example', bridgeId: 'test', bridgeToken: 'test', item: { id: 'queue-1', tipo_consulta: 'LISTADO_REVISADOS' }, now: new Date('2026-08-29T12:00:00-05:00') });
assert.equal(handled.rows, 2);
const complete = calls.find((call) => JSON.parse(call.init.body || '{}').action === 'complete_list');
assert.equal(JSON.parse(complete.init.body).payload.data.length, 2);
console.log('ECARCHECK_V2_LIST_CLIENT_CONTRACT_OK');
