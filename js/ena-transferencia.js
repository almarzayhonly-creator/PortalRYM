/* Portal RYM - ENA transferencia de saldo positivo
 * Isolated layout/config module. Production remains untouched until integration is tested.
 * Coordinates are normalized against the official one-page ENA template.
 */
(function (global) {
  'use strict';

  const TEMPLATE_URL = 'https://ena.com.pa/wp-content/uploads/2020/12/TRANSFERENCIA-DE-SALDO-POSITIVO.pdf';

  // Coordinates measured from the official ENA page preview (768 x 1024).
  // The adapter converts these normalized top-left coordinates to PDF points.
  const FIELDS = Object.freeze({
    nombre:      { x: 290/768, y: 249/1024, w: 216/768, font: 10, minFont: 7 },
    cedulaTop:   { x: 154/768, y: 273/1024, w: 109/768, font: 10, minFont: 7 },
    cuentaOrigen:{ x: 465/768, y: 273/1024, w: 105/768, font: 10, minFont: 7 },
    saldo:       { x: 95/768,  y: 294/1024, w: 75/768,  font: 10, minFont: 7 },
    cuentaDestino:{x: 555/768, y: 294/1024, w: 105/768, font: 10, minFont: 7 },
    empresa:     { x: 177/768, y: 318/1024, w: 211/768, font: 10, minFont: 7 },
    motivo:      { x: 230/768, y: 361/1024, w: 425/768, font: 9,  minFont: 6.5, maxLines: 1 },
    dia:         { x: 188/768, y: 423/1024, w: 25/768,  font: 10, minFont: 8 },
    mes:         { x: 236/768, y: 423/1024, w: 74/768,  font: 10, minFont: 7 },
    anio:        { x: 337/768, y: 423/1024, w: 41/768,  font: 10, minFont: 8 },
    telefono:    { x: 238/768, y: 483/1024, w: 224/768, font: 10, minFont: 7 },
    firma:       { x: 238/768, y: 530/1024, w: 216/768, h: 34/1024 },
    cedulaBottom:{ x: 238/768, y: 609/1024, w: 216/768, font: 10, minFont: 7 }
  });

  const MONTHS = ['enero','febrero','marzo','abril','mayo','junio','julio','agosto','septiembre','octubre','noviembre','diciembre'];

  function clean(value) { return String(value == null ? '' : value).trim(); }
  function money(value) {
    const n = Number(String(value == null ? '' : value).replace(/[^0-9.-]/g, ''));
    return Number.isFinite(n) ? n.toFixed(2) : '';
  }
  function dateParts(value) {
    const d = value ? new Date(value) : new Date();
    const ok = !Number.isNaN(d.getTime()) ? d : new Date();
    return { dia: String(ok.getDate()), mes: MONTHS[ok.getMonth()], anio: String(ok.getFullYear()) };
  }

  function normalize(data) {
    const f = dateParts(data && data.fecha);
    return {
      nombre: clean(data && data.nombre),
      cedulaTop: clean(data && data.cedula),
      cuentaOrigen: clean(data && data.cuentaOrigen),
      saldo: money(data && data.saldo),
      cuentaDestino: clean(data && data.cuentaDestino),
      empresa: clean(data && data.empresa),
      motivo: clean(data && data.motivo),
      dia: f.dia, mes: f.mes, anio: f.anio,
      telefono: clean(data && data.telefono),
      firma: data && data.firma ? data.firma : null,
      cedulaBottom: clean(data && data.cedula)
    };
  }

  function validate(data) {
    const d = normalize(data || {});
    const required = ['nombre','cedulaTop','cuentaOrigen','saldo','cuentaDestino','empresa','motivo'];
    const missing = required.filter(k => !d[k]);
    return { ok: missing.length === 0, missing, data: d };
  }

  global.RYM_ENA_TRANSFERENCIA = Object.freeze({
    version: 'v170-ena-layout-1',
    templateUrl: TEMPLATE_URL,
    fields: FIELDS,
    normalize,
    validate
  });
})(window);
