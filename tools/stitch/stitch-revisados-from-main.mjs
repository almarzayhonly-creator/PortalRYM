import fs from 'node:fs/promises';
import path from 'node:path';
import process from 'node:process';
import { stitch, StitchError } from '@google/stitch-sdk';

const root = path.resolve(process.cwd(), '../..');
const mainHtmlPath = process.env.MAIN_INDEX_HTML || path.join(root, '.stitch', 'main-index-reference.html');
const activeProjectPath = path.join(root, '.stitch', 'active-project.json');

let projectId = String(process.env.STITCH_PROJECT_ID || '').trim();
if (!projectId) {
  const active = JSON.parse(await fs.readFile(activeProjectPath, 'utf8'));
  projectId = String(active?.projectId || '').trim();
}
if (!projectId) throw new Error('No Stitch project ID available');

const main = await fs.readFile(mainHtmlPath, 'utf8');

for (const marker of [
  "setHead('Avance mensual'",
  'Avance mensual por galera',
  'Matriz ejecutiva de cobertura',
  'Copiar resumen',
  'Imprimir / PDF',
  'Cobertura acumulada',
  'Pendientes acumulados'
]) {
  if (!main.includes(marker)) throw new Error('main contract changed; missing: ' + marker);
}

const reference = `<!doctype html>
<html lang="es">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>Revisados RYM · Avance mensual</title>
<style>
:root{
  --navy:#0A1B4D;--blue:#244AA5;--sky:#53B7E8;--orange:#F47C20;
  --soft:#F4F7FB;--border:#D8E3F2;--text:#10224E;--muted:#62708C;
  --green:#047857;--red:#DC2626;--amber:#B7791F
}
*{box-sizing:border-box}body{margin:0;font-family:Inter,Segoe UI,Arial,sans-serif;background:var(--soft);color:var(--text)}
.app{min-height:100vh;display:grid;grid-template-columns:250px 1fr}
.side{background:#fff;border-right:1px solid var(--border);padding:18px 14px;display:flex;flex-direction:column}
.brand{display:flex;align-items:center;gap:10px;padding:5px 6px 18px;border-bottom:1px solid #edf2f7}
.logo{width:46px;height:46px;border:1px solid var(--border);border-radius:14px;background:#fff;display:grid;place-items:center;font-weight:900;color:var(--blue)}
.brand h2{margin:0;font-size:18px}.brand p{margin:4px 0 0;font-size:10px;color:var(--muted)}
.user{margin:16px 4px;padding:13px;border:1px solid var(--border);border-radius:14px;background:#f9fbff}
.user b{display:block;font-size:12px}.user span{display:block;margin-top:4px;font-size:9px;color:var(--muted)}
.nav{display:grid;gap:6px}.nav button{border:0;background:transparent;text-align:left;padding:11px 12px;border-radius:10px;color:#4d5f7a;font-weight:800}
.nav button.active{background:#eaf4ff;color:var(--blue);box-shadow:inset 3px 0 0 var(--orange)}
.back{margin-top:auto;border:1px solid var(--border);background:#f7faff;color:var(--blue);padding:11px;border-radius:10px;font-weight:800}
.main{padding:24px 28px 34px;min-width:0}
.top{display:flex;align-items:flex-start;justify-content:space-between;gap:16px;margin-bottom:18px}
.top h1{margin:0;color:var(--navy);font-size:31px;letter-spacing:-.02em}.top p{margin:6px 0 0;color:var(--muted);font-size:12px}
.actions{display:flex;align-items:center;gap:8px}.scope{padding:9px 12px;border:1px solid var(--border);background:#fff;border-radius:999px;color:var(--blue);font-size:10px;font-weight:900}
.btn{border:1px solid var(--border);background:#fff;color:var(--blue);border-radius:10px;padding:10px 13px;font-weight:900}.btn.primary{background:var(--blue);color:#fff;border-color:var(--blue)}
.hero{background:#fff;border:1px solid var(--border);border-radius:18px;padding:18px 20px;display:flex;justify-content:space-between;gap:20px;align-items:flex-start;box-shadow:0 10px 28px rgba(10,27,77,.06)}
.kicker{font-size:9px;font-weight:900;letter-spacing:.12em;color:var(--blue);text-transform:uppercase}.hero h2{margin:6px 0;font-size:24px;color:var(--navy)}.hero p{margin:0;color:var(--muted);font-size:11px;line-height:1.5}
.meta{display:flex;gap:10px;flex-wrap:wrap;margin-top:12px}.meta span{padding:7px 9px;background:#f7faff;border:1px solid var(--border);border-radius:8px;font-size:9px;color:var(--muted)}.meta b{color:var(--text)}
.score{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:12px;margin:14px 0}
.score article{background:#fff;border:1px solid var(--border);border-radius:16px;padding:14px 15px;box-shadow:0 8px 22px rgba(10,27,77,.045)}
.score span{display:block;font-size:9px;text-transform:uppercase;font-weight:900;color:var(--muted)}.score strong{display:block;font-size:25px;margin:6px 0 2px;color:var(--navy)}.score small{font-size:9px;color:var(--muted)}
.score .danger{border-top:3px solid var(--red)}.score .good{border-top:3px solid var(--green)}
.report{background:#fff;border:1px solid var(--border);border-radius:18px;overflow:hidden;box-shadow:0 10px 28px rgba(10,27,77,.055)}
.report-head{display:flex;justify-content:space-between;gap:18px;align-items:center;padding:15px 16px;background:#f8fbff;border-bottom:1px solid var(--border)}
.report-head h3{margin:0;font-size:17px;color:var(--navy)}.report-head p{margin:4px 0 0;font-size:10px;color:var(--muted)}
.legend{display:flex;gap:8px;flex-wrap:wrap}.legend span{padding:6px 8px;border-radius:999px;font-size:9px;font-weight:900;border:1px solid var(--border);background:#fff}.legend .ok{color:var(--green)}.legend .warn{color:var(--amber)}.legend .bad{color:var(--red)}
.table-wrap{overflow:auto}table{width:100%;border-collapse:separate;border-spacing:0;min-width:950px}
th,td{border-right:1px solid #edf2f7;border-bottom:1px solid #edf2f7;padding:9px;text-align:center}thead th{background:var(--blue);color:#fff;font-size:10px;position:sticky;top:0}tbody th,tfoot th{background:#f8fbff;color:var(--navy);font-size:10px;text-align:left}
.cell{display:grid;gap:4px;padding:7px;border-radius:10px;background:#f9fbff;border:1px solid var(--border);text-align:left}.cell b{font-size:11px}.cell span{font-size:10px;font-weight:900}.cell small{font-size:8px;color:var(--muted)}.cell strong{font-size:9px}
.cell.ok{background:#f0fdf4;border-color:#bbf7d0}.cell.warn{background:#fffaf0;border-color:#fbd38d}.cell.bad{background:#fff5f5;border-color:#feb2b2}
.total{display:grid;gap:3px;padding:7px;border-radius:10px;background:#f7faff;border:1px solid var(--border);text-align:left}.total b{font-size:10px}.total strong{font-size:10px;color:var(--blue)}.total span{font-size:8px;color:var(--muted)}
.note{padding:12px 16px;background:#fffdf7;border-top:1px solid #f5e8c8;color:#6b5a3b;font-size:9px}
@media(max-width:1100px){.app{grid-template-columns:210px 1fr}.score{grid-template-columns:repeat(2,1fr)}} 
</style>
</head>
<body>
<div class="app">
<aside class="side">
  <div class="brand"><div class="logo">RYM</div><div><h2>Revisados RYM</h2><p>Control legal vehicular</p></div></div>
  <div class="user"><b>Yhonly Almarza</b><span>ADMIN_TOTAL</span><span>Todas las galeras</span></div>
  <nav class="nav">
    <button>Dashboard</button><button>Operaciones</button><button class="active">Avance mensual</button><button>Reporte diario</button><button>Historial</button><button>Estadísticas</button><button>Boletas</button><button>Cupos</button>
  </nav>
  <button class="back">← Volver al Portal</button>
</aside>
<main class="main">
  <header class="top">
    <div><h1>Avance mensual</h1><p>Reporte ejecutivo de cobertura por ciclo y galera. Haz clic en cualquier celda para ver el detalle.</p></div>
    <div class="actions"><span class="scope">Todas las galeras</span><button class="btn primary">Actualizar vista</button></div>
  </header>

  <section class="hero">
    <div>
      <span class="kicker">REVISADOS · REPORTE EJECUTIVO</span>
      <h2>Avance mensual por galera</h2>
      <p>Vista consolidada para revisión gerencial, captura o impresión. Los colores reflejan automáticamente la cobertura de cada ciclo.</p>
      <div class="meta"><span><b>Corte</b> Enero – Octubre</span><span><b>Alcance</b> Todas las galeras</span><span><b>Actualizado</b> hoy</span></div>
    </div>
    <div class="actions"><button class="btn">Copiar resumen</button><button class="btn primary">Imprimir / PDF</button></div>
  </section>

  <section class="score">
    <article><span>Cobertura acumulada</span><strong>92%</strong><small>1,744 de 1,897 ciclos cubiertos</small></article>
    <article class="danger"><span>Pendientes acumulados</span><strong>153</strong><small>Suma de pendientes de los ciclos mostrados</small></article>
    <article><span>Mayor carga pendiente</span><strong>VINDU</strong><small>61 pendientes acumulados</small></article>
    <article class="good"><span>Galera mejor cubierta</span><strong>VCARS</strong><small>96% acumulado</small></article>
  </section>

  <section class="report">
    <div class="report-head"><div><h3>Matriz ejecutiva de cobertura</h3><p>Haz clic en una celda para abrir las unidades pendientes de ese mes y galera.</p></div><div class="legend"><span class="ok">100% completo</span><span class="warn">85–99%</span><span class="bad">&lt;85%</span></div></div>
    <div class="table-wrap">
      <table>
        <thead><tr><th>Mes / ciclo</th><th>VCOMP</th><th>VIPCO</th><th>VINDU</th><th>VCARS</th></tr></thead>
        <tbody>
          <tr><th>Enero</th><td><div class="cell ok"><b>96 / 96</b><span>100%</span><small>cobertura</small><strong>✓ Completo</strong></div></td><td><div class="cell ok"><b>144 / 144</b><span>100%</span><small>cobertura</small><strong>✓ Completo</strong></div></td><td><div class="cell warn"><b>201 / 205</b><span>98%</span><small>cobertura</small><strong>4 pendientes</strong></div></td><td><div class="cell ok"><b>219 / 219</b><span>100%</span><small>cobertura</small><strong>✓ Completo</strong></div></td></tr>
          <tr><th>Febrero</th><td><div class="cell ok"><b>102 / 102</b><span>100%</span><small>cobertura</small><strong>✓ Completo</strong></div></td><td><div class="cell warn"><b>139 / 141</b><span>99%</span><small>cobertura</small><strong>2 pendientes</strong></div></td><td><div class="cell warn"><b>187 / 191</b><span>98%</span><small>cobertura</small><strong>4 pendientes</strong></div></td><td><div class="cell ok"><b>215 / 215</b><span>100%</span><small>cobertura</small><strong>✓ Completo</strong></div></td></tr>
          <tr><th>Marzo</th><td><div class="cell warn"><b>166 / 169</b><span>98%</span><small>cobertura</small><strong>3 pendientes</strong></div></td><td><div class="cell warn"><b>136 / 140</b><span>97%</span><small>cobertura</small><strong>4 pendientes</strong></div></td><td><div class="cell bad"><b>143 / 160</b><span>89%</span><small>cobertura</small><strong>17 pendientes</strong></div></td><td><div class="cell warn"><b>203 / 211</b><span>96%</span><small>cobertura</small><strong>8 pendientes</strong></div></td></tr>
        </tbody>
        <tfoot><tr><th>TOTAL ACUMULADO</th><td><div class="total"><b>19 pendientes</b><strong>95% cobertura</strong><span>364 / 383 ciclos cubiertos</span></div></td><td><div class="total"><b>24 pendientes</b><strong>94% cobertura</strong><span>419 / 443 ciclos cubiertos</span></div></td><td><div class="total"><b>61 pendientes</b><strong>89% cobertura</strong><span>531 / 592 ciclos cubiertos</span></div></td><td><div class="total"><b>49 pendientes</b><strong>96% cobertura</strong><span>637 / 686 ciclos cubiertos</span></div></td></tr></tfoot>
      </table>
    </div>
    <div class="note"><b>Lectura correcta:</b> los pendientes del TOTAL son acumulados por ciclo. Una misma unidad puede aparecer pendiente en más de un mes; por eso no representan vehículos únicos.</div>
  </section>
</main>
</div>
</body>
</html>`;

const workDir = path.join(root, '.stitch', 'generated');
await fs.mkdir(workDir, { recursive: true });
const referencePath = path.join(workDir, 'revisados-avance-mensual-main-reference.html');
await fs.writeFile(referencePath, reference);

const project = stitch.project(projectId);
const uploaded = await project.upload(referencePath, {
  title: 'Revisados RYM - Avance mensual - Main reference'
});
if (!uploaded?.length) throw new Error('Stitch upload returned no screen');

const source = uploaded[0];
const prompt = `
Refine this exact existing screen visually. Do NOT redesign its information architecture.

NON-NEGOTIABLE:
- Preserve every section, label, metric, action and table concept already present.
- Keep the light sidebar and the exact navigation names.
- Keep the main functional structure: page header, executive report hero, four summary metrics, month-by-gallery matrix, coverage legend, total accumulated row, note, Copy summary, Print/PDF, Update view.
- Do not add or remove KPIs, filters, actions, statuses, modules, technical terminology or workflows.
- Do not use Mission Control, RUV, Gateway, Telemetry, Node, Station, Dispatch or Core Online.
- Do not convert the matrix into generic monthly cards.
- Do not change the meaning of accumulated pending counts.
- Stay within Portal RYM colors: navy #0A1B4D, blue #244AA5, sky #53B7E8, orange #F47C20 accent, background #F4F7FB, border #D8E3F2.
- Visual improvements allowed: spacing, typography, card hierarchy, borders, shadows, table clarity, hover affordances, responsive proportions.
- Aim for a polished enterprise operations tool that looks like the same Portal RYM product, not another application.
`.trim();

let finalScreen = source;
try {
  const edited = await source.edit(prompt);
  if (edited?.first) finalScreen = edited.first;
} catch (error) {
  if (!(error instanceof StitchError && error.code === 'CLARIFICATION_REQUIRED')) throw error;
}

const stamp = new Date().toISOString().replace(/[:.]/g, '-');
const html = await finalScreen.getHtml();
const image = await finalScreen.getImage();
await fs.writeFile(path.join(workDir, 'revisados-avance-mensual-main-refined-' + stamp + '.html'), html);
await fs.writeFile(path.join(workDir, 'revisados-avance-mensual-main-refined-' + stamp + '.png'), Buffer.from(image));
await fs.writeFile(path.join(workDir, 'latest-revisados-avance-mensual.json'), JSON.stringify({
  generatedAt: new Date().toISOString(),
  projectId,
  sourceScreenId: String(source.id || source.screenId || ''),
  finalScreenId: String(finalScreen.id || finalScreen.screenId || ''),
  method: 'upload-main-reference-then-edit',
  sourceBranch: 'main'
}, null, 2) + '\n');

console.log('Stitch monthly reference:', String(source.id || source.screenId || 'unknown'));
console.log('Stitch refined monthly:', String(finalScreen.id || finalScreen.screenId || 'unknown'));
