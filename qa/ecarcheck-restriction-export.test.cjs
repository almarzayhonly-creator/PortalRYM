const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const path = require('node:path');

const root = path.resolve(__dirname, '..');
const source = fs.readFileSync(path.join(root, 'modules/control-auto/ecarcheck-restriction-export.js'), 'utf8');
const sandbox = { window: {}, Blob, TextEncoder, URL, document: { createElement: () => ({ click(){}, remove(){}, set href(v){}, set download(v){} }), body: { appendChild(){} } }, setTimeout };
vm.runInNewContext(source, sandbox);
const api = sandbox.window.RYMRestrictionExport;
const fixture = galera => ({ tipo:'RESTRICCION_ECARCHECK', galera, unidad:'U-101', placa:'ABC-123', empresa:'Empresa '+galera, supervisora:'Supervisora '+galera, detalle:{ consultadoEn:'2026-10-24T10:30:00-05:00', boletas:{ boletasPorPlaca:{cantidad:1,desglose:[{tipo:'COLISIÓN Y FUGA',cantidad:1}]}, boletasPorDocumento:{cantidad:2,desglose:[{descripcion:'Boleta documental detallada',cantidad:2}]}, infraccionesEna:{cantidad:0,desglose:[]} } } });
const panel = { periodo:{label:'Quincena 2 · octubre 2026'}, alertas:['VCARS','VCOMP','VIPCO','VINDU'].map(fixture) };
function entries(buffer) {
  const out = {}; let offset = 0;
  while (offset + 30 < buffer.length && buffer.readUInt32LE(offset) === 0x04034b50) {
    const nameLen=buffer.readUInt16LE(offset+26), extra=buffer.readUInt16LE(offset+28), size=buffer.readUInt32LE(offset+18), name=buffer.toString('utf8',offset+30,offset+30+nameLen), start=offset+30+nameLen+extra;
    out[name]=buffer.toString('utf8',start,start+size); offset=start+size;
  }
  return out;
}

test('filters restrictions to each gallery and all galleries', () => {
  for (const gal of api.GALERAS) assert.deepEqual(api.rowsFromPanel(panel, gal).map(r=>r.galera), [gal]);
  assert.deepEqual(api.rowsFromPanel(panel, 'TODAS').map(r=>r.galera), Array.from(api.GALERAS));
  assert.equal(api.rowsFromPanel({alertas:[{...fixture('VCARS'),tipo:'SIN_FICHA'}]},'VCARS').length,1);
  assert.equal(api.rowsFromPanel({alertas:[{...fixture('VCARS'),tipo:'PENDIENTE_CONSULTA'}]},'TODAS').length,0);
});

test('exports a valid XLSX zip with scoped detailed data, metadata and filter', async () => {
  for (const gal of [...api.GALERAS, 'TODAS']) {
    const rows=api.rowsFromPanel(panel,gal), blob=api.makeXlsx(rows,{galera:gal,periodo:panel.periodo.label,fecha:'2026-10-24'}), data=entries(Buffer.from(await blob.arrayBuffer()));
    assert.ok(data['[Content_Types].xml']); assert.ok(data['xl/workbook.xml']);
    const sheet=data['xl/worksheets/sheet1.xml'];
    assert.match(sheet,/autoFilter ref="A4:H/); assert.match(sheet,/Motivo detallado eCarCheck V2/);
    assert.match(sheet,/COLISIÓN Y FUGA/); assert.match(sheet,/Boleta documental detallada/);
    assert.match(sheet,/última consulta registrada/); assert.match(sheet,/Quincena 2/);
    if(gal!=='TODAS') for(const other of api.GALERAS.filter(g=>g!==gal)) assert.ok(!sheet.includes('Empresa '+other));
  }
});

test('exports a valid multi-page PDF with all report details', async () => {
  for(const gal of [...api.GALERAS,'TODAS']){
    const rows=api.rowsFromPanel(panel,gal),blob=api.makePdf(rows,{galera:gal,periodo:panel.periodo.label,fecha:'2026-10-24'}),pdf=Buffer.from(await blob.arrayBuffer()).toString('latin1');
    assert.match(pdf,/^%PDF-1\.4/);assert.match(pdf,/%%EOF/);assert.match(pdf,new RegExp(gal==='TODAS'?'Empresa VCARS':`Empresa ${gal}`));
    if(gal!=='TODAS')for(const other of api.GALERAS.filter(x=>x!==gal))assert.ok(!pdf.includes('Empresa '+other));
  }
  const many=Array.from({length:70},(_,i)=>({...api.rowsFromPanel(panel,'VCARS')[0],unidad:'UNIT-'+i,motivo:'Restricción de prueba detallada '+i}));
  const blob=api.makePdf(many,{galera:'VCARS',periodo:'Quincena 2',fecha:'2026-10-24'}), pdf=Buffer.from(await blob.arrayBuffer()).toString('latin1');
  assert.match(pdf,/^%PDF-1\.4/); assert.match(pdf,/%%EOF/); assert.match(pdf,/\/Count [2-9]/);
  assert.match(pdf,/Portal RYM/); assert.match(pdf,/UNIT-69/); assert.match(pdf,/detallada 69/);
});

test('validator toolbar is independent of the exception section and inline scripts parse', () => {
  const html=fs.readFileSync(path.join(root,'index.html'),'utf8');
  assert.ok(html.indexOf('<script src="/modules/control-auto/ecarcheck-restriction-export.js"></script>') < html.indexOf('<script id="rym-v111-manual-ecar-js">'));
  const draw=html.slice(html.indexOf('function drawRestrictionExport111'),html.indexOf('async function enhanceGaleraManual',html.indexOf('function drawRestrictionExport111')));
  assert.doesNotMatch(draw,/if\(!ex\)return/);
  const enhance=html.slice(html.indexOf('async function enhanceGaleraManual(force=false){'),html.indexOf('const obs=new MutationObserver',html.indexOf('async function enhanceGaleraManual(force=false){')));
  assert.ok(enhance.indexOf('drawRestrictionExport111(root)')<enhance.indexOf('await loadManualPanel()'),'toolbar mounts before panel data is requested');
  assert.match(html,/e\.target\?\.id!=='v111ExportGal'[\s\S]*?row\.hidden=gal!=='TODAS'&&rowGal!==gal/);
  const inline=[...html.matchAll(/<script\b([^>]*)>([\s\S]*?)<\/script>/gi)].filter(m=>!/(?:src=|type=["'](?:application\/ld\+json|importmap))/i.test(m[1]));
  for(const script of inline) if(script[2].trim()) { try { new vm.Script(script[2]); } catch (e) { assert.fail(`inline script ${script[1]} syntax: ${e.message}`); } }
  assert.doesNotMatch(html,/replace\(\/\^\[=\+\\-@\\t\\r\]\/,["']async function enhanceGaleraManual/);
});
