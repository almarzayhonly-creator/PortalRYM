(() => {
  'use strict';
  const app=window.RYM173;if(!app)throw new Error('V173 bootstrap missing');
  const norm=v=>String(v??'').trim().toLowerCase();
  const PAN=new Set(['dashboard','negativos_hoy','pagos_hoy','cargar_pagos','historial','recurrentes','ranking','operaciones','operacion_am','operacion_pm','reportes','bajas_panapass','recorrido']);

  function projects(codes=[],role=''){
    const src=[...new Set((codes||[]).map(String))],low=src.map(norm),out=new Set();
    if(low.includes('portal.panapass')||low.some(x=>PAN.has(x)))out.add('PANAPASS');
    if(low.includes('portal.revisados')||low.some(x=>x.startsWith('revisados.')))out.add('REVISADOS');
    if(low.includes('portal.control_auto')||low.some(x=>x.startsWith('control_auto.')))out.add('CONTROL_AUTO');
    if(low.includes('portal.gps')||low.some(x=>x.startsWith('gps.')))out.add('GPS');
    if(low.includes('portal.validador')||low.some(x=>x.startsWith('validador.')))out.add('VALIDADOR');
    if(String(role).trim().toUpperCase()==='ADMIN_TOTAL'&&low.includes('admin.usuarios'))out.add('USUARIOS');
    return Object.freeze([...out]);
  }
  app.register('permissions',{projects});
})();
