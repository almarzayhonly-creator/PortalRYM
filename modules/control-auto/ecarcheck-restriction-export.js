(function (global) {
  'use strict';
  const GALERAS = ['VCARS', 'VCOMP', 'VIPCO', 'VINDU'];
  const COLUMNS = ['Galera', 'Empresa dueña', 'Supervisora', 'Unidad', 'Placa', 'Tipo de restricción / boleta', 'Motivo detallado eCarCheck V2', 'Fecha y hora de la última consulta'];
  const text = value => value == null ? '' : String(value).trim();
  const first = (...values) => values.map(text).find(Boolean) || '';
  const detailText = value => {
    if (typeof value === 'string') return value.trim();
    if (Array.isArray(value)) return value.map(detailText).filter(Boolean).join('; ');
    if (!value || typeof value !== 'object') return '';
    return first(value.motivo, value.descripcion, value.detalle, value.nombre, value.mensaje, value.concepto, value.tipo);
  };
  function rowsFromPanel(panel, selected = 'TODAS') {
    const alerts = Array.isArray(panel?.alertas) ? panel.alertas : [];
    return alerts.filter(a => text(a.tipo).toUpperCase() === 'RESTRICCION_ECARCHECK')
      .map(a => {
        const d = a.detalle && typeof a.detalle === 'object' ? a.detalle : {}, v2 = a.boletas || a.resultado?.boletas || d.boletas || d.resultado?.boletas || d.ecarcheck?.boletas || d;
        const groups = [
          ['Boletas por placa', v2.boletasPorPlaca],
          ['Boletas por documento', v2.boletasPorDocumento],
          ['Infracciones ENA', v2.infraccionesEna]
        ];
        const reasons = [];
        for (const [label, node] of groups) {
          const count = node?.cantidad;
          const items = Array.isArray(node?.desglose) ? node.desglose : [];
          for (const item of items) {
            const reason = detailText(item);
            if (reason) reasons.push(`${label}${item?.cantidad > 1 ? ` (${item.cantidad})` : ''}: ${reason}`);
          }
          if (!items.length && count != null && Number(count) > 0) reasons.push(`${label}: ${count}`);
        }
        const galera = first(a.galera, d.galera).toUpperCase();
        const fecha = first(d.consultadoEn, d.consultado_en, d.consultado_at, d.consultado_en_at, a.consultadoEn, a.consultado_en);
        return {
          galera: galera.toUpperCase(), empresa: first(a.empresa_duena, a.empresa, d.empresa_duena, d.empresa, d.empresaDuena),
          supervisora: first(a.supervisora, d.supervisora), unidad: first(a.unidad, d.unidad),
          placa: first(a.placa, d.placa), tipo: groups.map(([n, x]) => x?.cantidad > 0 ? n : '').filter(Boolean).join(' · ') || first(d.tipo, a.tipo),
          motivo: reasons.join('\n') || first(d.motivo, d.mensaje, a.mensaje, a.motivo), fecha,
          raw: a
        };
      })
      .filter(r => GALERAS.includes(r.galera) && (selected === 'TODAS' || selected === r.galera));
  }
  const xml = s => text(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&apos;');
  const colName = n => { let s = ''; for (n++; n; n = Math.floor((n - 1) / 26)) s = String.fromCharCode(65 + ((n - 1) % 26)) + s; return s; };
  function crc32(bytes) { let c = -1; for (const b of bytes) { c ^= b; for (let k = 0; k < 8; k++) c = (c >>> 1) ^ (-(c & 1) & 0xedb88320); } return (c ^ -1) >>> 0; }
  function zip(files) {
    const enc = new TextEncoder(), local = [], central = []; let offset = 0;
    for (const [name, content] of Object.entries(files)) {
      const n = enc.encode(name), data = enc.encode(content), crc = crc32(data);
      const lh = new Uint8Array(30 + n.length + data.length), lv = new DataView(lh.buffer);
      lv.setUint32(0, 0x04034b50, true); lv.setUint16(4, 20, true); lv.setUint16(6, 0x800, true); lv.setUint32(14, crc, true); lv.setUint32(18, data.length, true); lv.setUint32(22, data.length, true); lv.setUint16(26, n.length, true); lh.set(n, 30); lh.set(data, 30 + n.length); local.push(lh);
      const ch = new Uint8Array(46 + n.length), cv = new DataView(ch.buffer);
      cv.setUint32(0, 0x02014b50, true); cv.setUint16(4, 20, true); cv.setUint16(6, 20, true); cv.setUint16(8, 0x800, true); cv.setUint32(16, crc, true); cv.setUint32(20, data.length, true); cv.setUint32(24, data.length, true); cv.setUint16(28, n.length, true); cv.setUint32(42, offset, true); ch.set(n, 46); central.push(ch); offset += lh.length;
    }
    const size = central.reduce((s, x) => s + x.length, 0), end = new Uint8Array(22), ev = new DataView(end.buffer); ev.setUint32(0, 0x06054b50, true); ev.setUint16(8, central.length, true); ev.setUint16(10, central.length, true); ev.setUint32(12, size, true); ev.setUint32(16, offset, true);
    return new Blob([...local, ...central, end], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
  }
  function makeXlsx(rows, metadata) {
    const all = [['Portal RYM · Reporte de restricciones eCarCheck'], [`Galera: ${metadata.galera}`, `Período: ${metadata.periodo}`, `Generado: ${metadata.fecha}`], ['Restricciones de la última consulta registrada; no necesariamente vigentes al abrir este archivo.'], COLUMNS, ...rows.map(r => [r.galera, r.empresa, r.supervisora, r.unidad, r.placa, r.tipo, r.motivo, r.fecha])];
    const sheet = `<worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships"><dimension ref="A1:H${all.length}"/><sheetViews><sheetView workbookViewId="0"><pane ySplit="4" topLeftCell="A5" activePane="bottomLeft" state="frozen"/></sheetView></sheetViews><cols>${[14,24,22,16,16,26,58,25].map((w,i)=>`<col min="${i+1}" max="${i+1}" width="${w}" customWidth="1"/>`).join('')}</cols><sheetData>${all.map((row,ri)=>`<row r="${ri+1}">${row.map((v,ci)=>`<c r="${colName(ci)}${ri+1}" t="inlineStr"${ri===3?' s="1"':''}><is><t xml:space="preserve">${xml(v)}</t></is></c>`).join('')}</row>`).join('')}</sheetData><autoFilter ref="A4:H${all.length}"/></worksheet>`;
    const styles = '<styleSheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main"><fonts count="2"><font><sz val="11"/><name val="Calibri"/></font><font><b/><color rgb="FFFFFFFF"/><sz val="11"/><name val="Calibri"/></font></fonts><fills count="3"><fill><patternFill patternType="none"/></fill><fill><patternFill patternType="gray125"/></fill><fill><patternFill patternType="solid"><fgColor rgb="FF173B73"/><bgColor indexed="64"/></patternFill></fill></fills><borders count="1"><border><left/><right/><top/><bottom/><diagonal/></border></borders><cellStyleXfs count="1"><xf numFmtId="0" fontId="0" fillId="0" borderId="0"/></cellStyleXfs><cellXfs count="2"><xf numFmtId="0" fontId="0" fillId="0" borderId="0" xfId="0" applyAlignment="1"><alignment vertical="top" wrapText="1"/></xf><xf numFmtId="0" fontId="1" fillId="2" borderId="0" xfId="0" applyAlignment="1"><alignment vertical="center" wrapText="1"/></xf></cellXfs><cellStyles count="1"><cellStyle name="Normal" xfId="0" builtinId="0"/></cellStyles></styleSheet>';
    return zip({ '[Content_Types].xml':'<?xml version="1.0" encoding="UTF-8"?><Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/><Override PartName="/xl/workbook.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/><Override PartName="/xl/worksheets/sheet1.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/><Override PartName="/xl/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.styles+xml"/></Types>', '_rels/.rels':'<?xml version="1.0" encoding="UTF-8"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="xl/workbook.xml"/></Relationships>', 'xl/workbook.xml':`<?xml version="1.0" encoding="UTF-8"?><workbook xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships"><sheets><sheet name="Restricciones" sheetId="1" r:id="rId1"/></sheets></workbook>`, 'xl/_rels/workbook.xml.rels':'<?xml version="1.0" encoding="UTF-8"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet1.xml"/><Relationship Id="rId2" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/styles" Target="styles.xml"/></Relationships>', 'xl/styles.xml':styles, 'xl/worksheets/sheet1.xml':sheet });
  }
  function pdfEscape(s) { const cp = new Map([['·',0xb7],['–',0x96],['—',0x97],['á',0xe1],['é',0xe9],['í',0xed],['ó',0xf3],['ú',0xfa],['Á',0xc1],['É',0xc9],['Í',0xcd],['Ó',0xd3],['Ú',0xda],['ñ',0xf1],['Ñ',0xd1],['ü',0xfc],['Ü',0xdc],['¿',0xbf],['¡',0xa1]]); return [...String(s)].map(ch => { const n=ch.codePointAt(0),b=n<128?n:cp.get(ch); return b==null?'?':b===40||b===41||b===92?'\\'+String.fromCharCode(b):b<32||b>126?'\\'+b.toString(8).padStart(3,'0'):String.fromCharCode(b); }).join(''); }
  function wrap(s, width=148) { const words=String(s).split(/\s+/),out=[];let line='';for(const word of words){if((line+' '+word).trim().length>width&&line){out.push(line);line=word}else line=(line+' '+word).trim()}if(line)out.push(line);return out; }
  function makePdf(rows, metadata) {
    const label = `Portal RYM · Reporte de restricciones eCarCheck | ${metadata.galera} | ${metadata.periodo} | ${metadata.fecha}`;
    const widths=[8,17,14,9,11,18,48,22], headers=['Galera','Empresa dueña','Supervisora','Unidad','Placa','Tipo restricción','Motivo eCarCheck V2','Última consulta'];
    const wrapCell=(v,w)=>wrap(v||'—',w),tableRows=[];
    tableRows.push(headers.map((v,i)=>wrapCell(v,widths[i])));
    for(const r of rows){const vals=[r.galera,r.empresa,r.supervisora,r.unidad,r.placa,r.tipo,r.motivo,r.fecha],cells=vals.map((v,i)=>wrapCell(v,widths[i])),height=Math.max(...cells.map(x=>x.length));for(let n=0;n<height;n++)tableRows.push(cells.map((x,i)=>(x[n]||'').padEnd(widths[i]).slice(0,widths[i])));tableRows.push(widths.map(w=>'-'.repeat(w)));}
    const renderRow=row=>'| '+row.map((cell,i)=>String(cell||'').padEnd(widths[i]).slice(0,widths[i])).join(' | ')+' |';
    const pages=[];let lines=[label,'Advertencia: última consulta registrada; no confirma una deuda vigente.','',renderRow(headers.map((v,i)=>v.padEnd(widths[i]))),'-'.repeat(154)];
    for(const row of tableRows.slice(1)){if(lines.length>=43){pages.push(lines);lines=[label,'Continuación · restricciones eCarCheck',renderRow(headers.map((v,i)=>v.padEnd(widths[i]))),'-'.repeat(154)];}lines.push(renderRow(row));}
    if(!rows.length)lines.push('Sin restricciones registradas.');pages.push(lines);
    const objs = ['<< /Type /Catalog /Pages 2 0 R >>'];
    objs.push(`<< /Type /Pages /Kids [${pages.map((_,i)=>`${3+i*2} 0 R`).join(' ')}] /Count ${pages.length} >>`);
    pages.forEach((page,i)=>{const p=3+i*2,c=p+1,stream=`BT /F1 5.8 Tf 20 570 Td 9 TL ${page.map((line,j)=>`${j?'T* ':''}(${pdfEscape(line)}) Tj`).join(' ')} ET`;objs.push(`<< /Type /Page /Parent 2 0 R /MediaBox [0 0 842 595] /Resources << /Font << /F1 ${3+pages.length*2} 0 R >> >> /Contents ${c} 0 R >>`);objs.push(`<< /Length ${stream.length} >>\nstream\n${stream}\nendstream`);});
    objs.push('<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica /Encoding /WinAnsiEncoding >>'); let out='%PDF-1.4\n', offsets=[0]; objs.forEach((o,i)=>{offsets.push(out.length);out+=`${i+1} 0 obj\n${o}\nendobj\n`;}); const xref=out.length;out+=`xref\n0 ${objs.length+1}\n0000000000 65535 f \n${offsets.slice(1).map(n=>String(n).padStart(10,'0')+' 00000 n \n').join('')}trailer\n<< /Size ${objs.length+1} /Root 1 0 R >>\nstartxref\n${xref}\n%%EOF`;return new Blob([out],{type:'application/pdf'});
  }
  function download(blob, name) { const a=document.createElement('a'),url=URL.createObjectURL(blob);a.href=url;a.download=name;document.body.appendChild(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(url),30000); }
  global.RYMRestrictionExport = { GALERAS, COLUMNS, rowsFromPanel, makeXlsx, makePdf, download };
})(window);
