from pathlib import Path

p = Path('panapass-v169-final.js')
s = p.read_text(encoding='utf-8')

css = r'''
      /* V169 ranking: true podium + compact positions table */
      .v169-podium{display:grid;grid-template-columns:minmax(0,1fr) minmax(0,1.12fr) minmax(0,1fr);gap:14px;align-items:end;max-width:980px;margin:14px auto 18px;padding:16px 18px 0}
      .v169-podium-card{position:relative;display:flex;flex-direction:column;align-items:center;justify-content:flex-end;min-width:0;text-align:center}
      .v169-podium-person{width:100%;min-height:112px;display:flex;flex-direction:column;align-items:center;justify-content:center;padding:13px 12px 11px;border:1px solid #d9e4f1;border-radius:17px 17px 0 0;background:#fff;box-shadow:0 10px 24px rgba(23,74,139,.07)}
      .v169-podium-person b{font-size:15px;color:#0b376f;max-width:100%;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}.v169-podium-person small{margin-top:4px;color:#718198;font-weight:900}.v169-podium-metric{margin-top:8px;font-size:13px;font-weight:1000;color:#0d356b}.v169-podium-aux{font-size:10px;color:#718198;font-weight:850;margin-top:2px}
      .v169-podium-step{width:100%;display:grid;place-items:center;font-weight:1000;color:#fff;border-radius:0 0 8px 8px;box-shadow:0 9px 18px rgba(11,55,111,.08)}
      .v169-place-1{order:2}.v169-place-2{order:3}.v169-place-3{order:1}.v169-place-1 .v169-podium-person{min-height:148px;border-color:#e3c85b;background:linear-gradient(180deg,#fffdf3,#fff8d7)}.v169-place-1 .v169-podium-step{height:82px;background:#9aac50;font-size:36px}.v169-place-2 .v169-podium-person{min-height:126px;border-color:#efb27a;background:linear-gradient(180deg,#fffaf5,#fff1e4)}.v169-place-2 .v169-podium-step{height:62px;background:#d36d00;font-size:29px}.v169-place-3 .v169-podium-person{min-height:118px;border-color:#9dd5ee;background:linear-gradient(180deg,#f8fdff,#eaf8ff)}.v169-place-3 .v169-podium-step{height:52px;background:#167aa6;font-size:25px}
      .v169-podium-icon{width:48px;height:48px;border-radius:50%;display:grid;place-items:center;margin-bottom:7px;font-size:24px;font-weight:1000;background:#edf4ff;color:#2454ad}.v169-place-1 .v169-podium-icon{width:58px;height:58px;font-size:30px;background:#eef3cf;color:#78922d}.v169-place-2 .v169-podium-icon{background:#fff0df;color:#e0770b}.v169-place-3 .v169-podium-icon{background:#e8f7fd;color:#1697ca}
      .v169-rank-table{border:1px solid #d9e4f1;border-radius:14px;overflow:auto;background:#fff;margin-top:8px}.v169-rank-table table{width:100%;border-collapse:collapse;min-width:680px}.v169-rank-table th{position:sticky;top:0;background:#174a8b;color:#fff;font-size:9px;text-transform:uppercase;padding:9px 10px;text-align:left}.v169-rank-table td{padding:8px 10px;border-bottom:1px solid #e7edf4;font-size:10px;color:#294a72}.v169-rank-table tr:last-child td{border-bottom:0}.v169-rank-table tbody tr:hover td{background:#f7fbff}.v169-rank-pos{font-weight:1000;color:#174a8b}.v169-rank-name{font-weight:1000;color:#0b376f;cursor:pointer}.v169-rank-num{text-align:right;font-weight:900;white-space:nowrap}

      /* V169 Panapass desktop sidebar: compact means genuinely compact. */
      @media(min-width:821px){
        .shell.side-collapsed{grid-template-columns:68px minmax(0,1fr)!important}
        .shell.side-collapsed .side{width:68px!important;min-width:68px!important;max-width:68px!important;padding:10px 7px!important;gap:7px!important;overflow-x:hidden!important}
        .shell.side-collapsed .brand-logo-app{width:54px!important;min-width:54px!important;min-height:48px!important;height:48px!important;padding:5px!important;margin:0 auto!important;border-radius:12px!important}
        .shell.side-collapsed .brand-logo-app img{max-width:44px!important;max-height:36px!important}
        .shell.side-collapsed .phase1-side-toggle{width:34px!important;height:31px!important;margin:0 auto 1px!important;border-radius:10px!important;font-size:17px!important}
        .shell.side-collapsed .nav{gap:5px!important;width:100%!important}
        .shell.side-collapsed .nav button,.shell.side-collapsed .v36-portal-home-btn{width:52px!important;min-width:52px!important;max-width:52px!important;height:42px!important;min-height:42px!important;padding:0!important;margin:0 auto!important;border-radius:11px!important;display:grid!important;place-items:center!important;overflow:hidden!important;box-shadow:none!important;transform:none!important}
        .shell.side-collapsed .nav button:before,.shell.side-collapsed .v36-portal-home-btn:before{left:50%!important;top:50%!important;transform:translate(-50%,-50%)!important;font-size:17px!important}
        .shell.side-collapsed .nav button.active:after{left:0!important;top:8px!important;bottom:8px!important;width:3px!important}
        .shell.side-collapsed .portal-name-side,.shell.side-collapsed .nav-section-v14,.shell.side-collapsed .user strong,.shell.side-collapsed .user span{display:none!important}
        .shell.side-collapsed .user{padding:5px!important;margin-top:auto!important;border-radius:10px!important}
        .shell.side-collapsed .side .logout{width:52px!important;min-width:52px!important;max-width:52px!important;height:38px!important;min-height:38px!important;padding:0!important;margin:0 auto!important;display:grid!important;place-items:center!important;border-radius:10px!important}
        .shell.side-collapsed .side .logout:before{font-size:16px!important}
      }
      @media(max-width:720px){.v169-podium{grid-template-columns:1fr 1fr;gap:8px;padding:8px 0 0}.v169-place-1{grid-column:1/-1;grid-row:1;order:1}.v169-place-2{order:2}.v169-place-3{order:3}.v169-place-1 .v169-podium-person{min-height:120px}.v169-place-1 .v169-podium-step{height:58px}.v169-place-2 .v169-podium-step,.v169-place-3 .v169-podium-step{height:46px}.v169-rank-table{margin-top:12px}}
'''

anchor = '      @media(max-width:1000px){'
if '/* V169 ranking: true podium + compact positions table */' not in s:
    if anchor not in s:
        raise SystemExit('CSS anchor missing')
    s = s.replace(anchor, css + '\n' + anchor, 1)

start = s.find('      const med=[')
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
        const icon=place===1?'★':place===2?'◆':'●';
        return `<article class="v169-podium-card v169-place-${place}"><div class="v169-podium-person"><span class="v169-podium-icon">${icon}</span><b class="profile-link" data-sup-id="${E(x.supervisora_id||'')}">${E(x.supervisora_nombre||'')}</b><small>${E(x.galera||'')}</small><span class="v169-podium-metric">${value}</span><span class="v169-podium-aux">${aux}</span></div><div class="v169-podium-step">${place}</div></article>`;
      }).join('');
      const rest=rows.slice(3);
      const restTable=`<div class="v169-rank-table"><table><thead><tr><th>Pos.</th><th>Supervisora</th><th>Galera</th><th style="text-align:right">Unidades</th><th style="text-align:right">Monto</th></tr></thead><tbody>${rest.map((x,i)=>{const rank=metric==='UNIDADES'?(Number(x[positionKey])||i+4):(i+4);return `<tr><td class="v169-rank-pos">#${rank}</td><td><span class="v169-rank-name profile-link" data-sup-id="${E(x.supervisora_id||'')}">${E(x.supervisora_nombre||'')}</span></td><td>${E(x.galera||'')}</td><td class="v169-rank-num">${Number(x.unidades_pagadas||0)}</td><td class="v169-rank-num">B/. ${M(x.monto_pagado)}</td></tr>`}).join('')}</tbody></table></div>`;
      out.innerHTML=`<div class="v93-rank-head"><h3>Ranking · ${label}</h3><span>${rows.length} supervisoras · ${periodLabel}</span></div><div class="v169-podium">${podium}</div>${restTable}`;
'''

s = s[:start] + block + s[end:]
p.write_text(s, encoding='utf-8')
