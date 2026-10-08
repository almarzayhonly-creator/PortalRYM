/* Read-only presentation of the authenticated RYM sources. No time thresholds here. */
(function(w){
  const text=v=>String(v??'').trim();
  const upper=v=>text(v).normalize('NFD').replace(/[\u0300-\u036f]/g,'').toUpperCase();
  function revisado(rev={},operation={},legacy=''){
    if(upper(operation.estado_revisado)==='VENCIDO')return 'VENCIDO';
    const source=upper(rev.estado||operation.estado_revisado);
    if(source==='VENCIDO'||source==='EXPIRADO')return 'VENCIDO';
    // revisados-final supplies the official overdue count; pending color/workshop
    // actions with no confirmed overdue period remain pending.
    if(source==='PENDIENTE')return Number(rev.meses_atraso)>0?'VENCIDO':'PENDIENTE';
    if(source==='VIGENTE')return 'VIGENTE';
    if(source==='SIN_MES')return 'SIN MES';
    const raw=upper(legacy);
    return /VENCID|EXPIR/.test(raw)?'VENCIDO':/PENDIENT|NO VIGENTE/.test(raw)?'PENDIENTE':/VIGENTE|AL DIA|OK|VALIDO/.test(raw)?'VIGENTE':'PENDIENTE';
  }
  function gps(row){
    if(!row)return {level:'SIN INFORMACIÓN',tone:'unknown',reason:'Sin respuesta GPS disponible'};
    const devices=[row.gps1,row.gps2];
    const complete=devices.every(g=>typeof g?.installed==='boolean'&&typeof g?.ok==='boolean');
    let level=upper(row.nivel),reason=text(row.razon||row.diagnostico);
    const historical=['CERRADO','CERRADA','CANIBALIZADO','CANIBALIZADA'].includes(upper(row.estatus_control));
    if(level==='HISTORICO'||row.historico||historical)return {level:'SIN INFORMACIÓN',tone:'unknown',reason:reason||'Información GPS histórica'};
    // Parity with gps-rym-admin v13 (audit source fixture). Reuse backend ok;
    // do not reinterpret timestamps or introduce reporting thresholds.
    if(complete&&level!=='HISTORICO'&&!row.historico){
      const installed=devices.filter(g=>g.installed).length,reporting=devices.filter(g=>g.installed&&g.ok).length;
      level=!installed||!reporting?'CRITICO':installed===2&&reporting===1?'ALERTA':'OK';
      if(level!==upper(row.nivel))reason=installed===1&&reporting===1?'1 GPS instalado y reportando':reason;
    }
    const states={OK:['NORMAL','normal'],ALERTA:['ALERTA','alert'],CRITICO:['CRÍTICO','critical']};
    const [label,tone]=states[level]||['SIN INFORMACIÓN','unknown'];
    return {level:label,tone,reason};
  }
  function compare(left,right){
    const norm=v=>upper(v).replace(/[\s-]+/g,'');
    const a=norm(left),b=norm(right);
    const missing=v=>!v||['—','–','N/A','NULL','SIN DATO','SIN DATOS'].includes(upper(v));
    return missing(left)||missing(right)?'missing':a===b?'match':'diff';
  }
  function balance(raw){
    const value=text(raw).replace(/^(?:B\/\.|\$)\s*/i,'');
    return /^[+-]?(?:\d+|\d{1,3}(?:,\d{3})+)(?:\.\d+)?$/.test(value)?Number(value.replaceAll(',','')):NaN;
  }
  w.RYM_VALIDATOR_PRESENTATION=Object.freeze({revisado,gps,compare,balance});
})(window);
