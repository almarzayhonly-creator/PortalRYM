import assert from 'node:assert/strict';
import { parseReviewedRsc, normalisePage } from '../bridge/ecarcheck-v2-rsc.mjs';

const capture = [
  '1:"$Sreact.fragment"',
  '2:["$","$Lb",null,{"data":[{"inspectionId":3566438,"revId":"17078447","plate":"EV6587","status":"APROBADO","year":2026},{"inspectionId":3566030,"revId":"17078019","plate":"EM3624","status":"APROBADO","year":2026}],"pagination":{"currentPage":1,"recordsPerPage":10,"totalRecords":2,"totalPages":1}}]'
].join('\n');

const page = normalisePage(parseReviewedRsc(capture));
assert.deepEqual(page.data.map((row) => row.inspectionId), [3566438, 3566030]);
assert.deepEqual(page.data.map((row) => row.plate), ['EV6587', 'EM3624']);
assert.deepEqual(page.pagination, { currentPage: 1, recordsPerPage: 10, totalRecords: 2, totalPages: 1 });
assert.throws(() => parseReviewedRsc('0:{"not":"a reviewed list"}'), /RESPUESTA_LISTADO_INVALIDA/);
console.log('ECARCHECK_V2_RSC_CONTRACT_OK', JSON.stringify({ inspections: page.data.length, pagination: page.pagination }));
