from pathlib import Path

p = Path('panapass-v169-final.js')
s = p.read_text(encoding='utf-8')

css_marker = '/* V169 ranking: true podium + split positions tables */'
css = r'''
      /* V169 ranking: true podium + split positions tables */
      .v169-podium{display:grid;grid-template-columns:minmax(0,1fr) minmax(0,1.12fr) minmax(0,1fr);gap:14px;align-items:end;max-width:980px;margin:14px auto 18px;padding:16px 18px 0}
      .v169-podium-card{position:relative;display:flex;flex-direction:column;align-items:center;justify-content:flex-end;min-width:0;text-align:center}
      .v169-podium-person{width:100%;min-height:112px;display:flex;flex-direction:column;align-items:center;justify-content:center;padding:13px 12px 11px;border:1px solid #d9e4f1;border-radius:17px 17px 0 0;background:#fff;box-shadow:0 10px 24px rgba(23,74,139,.07)}
      .v169-podium-person b{font-size:15px;color:#0b376f;max-width:100%;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}.v169-podium-person small{margin-top:4px;color:#718198;font-weight:900}.v169-podium-metric{margin-top:8px;font-size:13px;font-weight:1000;color:#0d356b}.v169-podium-aux{font-size:10px;color:#718198;font-weight:850;margin-top:2px}
      .v169-podium-step{width:100%;display:grid;place-items:center;font-weight:1000;color:#fff;border-radius:0 0 8px 8px;box-shadow:0 9px 18px rgba(11,55,111,.08)}
      .v169-place-1{order:2}.v169-place-2{order:3}.v169-place-3{order:1}.v169-place-1 .v169-podium-person{min-height:148px;border-color:#e3c85b;background:linear-gradient(180deg,#fffdf3,#fff8d7)}.v169-place-1 .v169-podium-step{height:82px;background:#9aac50;font-size:36px}.v169-place-2 .v169-podium-person{min-height:126px;border-color:#efb27a;background:linear-gradient(180deg,#fffaf5,#fff1e4)}.v169-place-2 .v169-podium-step{height:62px;background:#d36d00;font-size:29px}.v169-place-3 .v169-podium-person{min-height:118px;border-color:#9dd5ee;background:linear-gradient(180deg,#f8fdff,#eaf8ff)}.v169-place-3 .v169-podium-step{height:52px;background:#167aa6;font-size:25px}
      .v169-podium-icon{display:grid;place-items:center;margin-bottom:7px;font-size:34px;line-height:1}.v169-place-1 .v169-podium-icon{font-size:42px}.v169-rank-tables{display:grid;grid-template-columns:minmax(0,1fr) minmax(0,1fr);gap:12px;align-items:start;margin-top:10px}.v169-rank-group{min-width:0}.v169-rank-group h4{margin:0 0 6px;color:#174a8b;font-size:11px;font-weight:1000}.v169-rank-table{border:1px solid #d9e4f1;border-radius:14px;overflow:auto;background:#fff}.v169-rank-table table{width:100%;border-collapse:collapse;min-width:520px}.v169-rank-table th{position:sticky;top:0;background:#174a8b;color:#fff;font-size:9px;text-transform:uppercase;padding:9px 10px;text-align:left}.v169-rank-table td{padding:8px 10px;border-bottom:1px solid #e7edf4;font-size:10px;color:#294a72}.v169-rank-table tr:last-child td{border-bottom:0}.v169-rank-table tbody tr:hover td{background:#f7fbff}.v169-rank-pos{font-weight:1000;color:#174a8b}.v169-rank-name{font-weight:1000;color:#0b376f;cursor:pointer}.v169-rank-num{text-align:right;font-weight:900;white-space:nowrap}
      @media(max-width:820px){.v169-rank-tables{grid-template-columns:1fr}}
      @media(max-width:720px){.v169-podium{grid-template-columns:1fr 1fr;gap:8px;padding:8px 0 0}.v169-place-1{grid-column:1/-1;grid-row:1;order:1}.v169-place-2{order:2}.v169-place-3{order:3}.v169-place-1 .v169-podium-person{min-height:120px}.v169-place-1 .v169-podium-step{height:58px}.v169-place-2 .v169-podium-step,.v169-place-3 .v169-podium-step{height:46px}}
'''

if css_marker not in s:
    anchor = '      @media(max-width:1000px){'
    if anchor not in s:
        raise SystemExit('CSS anchor missing')
    s = s.replace(anchor, css + '\n' + anchor, 1)

render_marker = 'const renderRankGroup=(items,startRank,title)=>'
if render_marker not in s:
    start = s.find("      const label=metric==='UNIDADES'?")
    end = s.find('      out.onclick=e=>', start)
    if start < 0 or end < 0:
        raise SystemExit('ranking render block not found')

    block = r'''      const label=metric==='UNIDADES'?'Menos unidades pagadas':'Menor monto pagado';
      const periodLabel=per.value==='DIA'?'último cierre':'mes';
      const top=rows.slice(0,3);
      const podium=top.map((x,i)=>{
        const place=i+1,units=Number(x.unidades_pagadas||0),amount=Number(x.monto_pagado||0);
        const value=metric==='UNIDADES'?`${units} unid.`:`B/. ${M(amount)}`;
        const aux=metric==='UNIDADES'?`B/. ${M(amount)}`:`${units} unid.`;
        const icon=place===1?'🥇':place===2?'🥈':'🥉';
        return `<article class="v169-podium-card v169-place-${place}"><div class="v169-podium-person"><span class="v169-podium-icon" aria-label="Posición ${place}">${icon}</span><b class="profile-link" data-sup-id="${E(x.supervisora_id||'')}">${E(x.supervisora_nombre||'')}</b><small>${E(x.galera||'')}</small><span class="v169-podium-metric">${value}</span><span class="v169-podium-aux">${aux}</span></div><div class="v169-podium-step">${place}</div></article>`;
      }).join('');
      const renderRankGroup=(items,startRank,title)=>`<section class="v169-rank-group"><h4>${title}</h4><div class="v169-rank-table"><table><thead><tr><th>Pos.</th><th>Supervisora</th><th>Galera</th><th style="text-align:right">Unidades</th><th style="text-align:right">Monto</th></tr></thead><tbody>${items.map((x,i)=>{const fallback=startRank+i;const rank=metric==='UNIDADES'?(Number(x[positionKey])||fallback):fallback;return `<tr><td class="v169-rank-pos">#${rank}</td><td><span class="v169-rank-name profile-link" data-sup-id="${E(x.supervisora_id||'')}">${E(x.supervisora_nombre||'')}</span></td><td>${E(x.galera||'')}</td><td class="v169-rank-num">${Number(x.unidades_pagadas||0)}</td><td class="v169-rank-num">B/. ${M(x.monto_pagado)}</td></tr>`}).join('')}</tbody></table></div></section>`;
      const groupA=renderRankGroup(rows.slice(3,14),4,'Posiciones 4–14');
      const groupB=renderRankGroup(rows.slice(14,25),15,'Posiciones 15–25');
      out.innerHTML=`<div class="v93-rank-head"><h3>Ranking · ${label}</h3><span>${rows.length} supervisoras · ${periodLabel}</span></div><div class="v169-podium">${podium}</div><div class="v169-rank-tables">${groupA}${groupB}</div>`;
'''
    s = s[:start] + block + s[end:]

p.write_text(s, encoding='utf-8')
