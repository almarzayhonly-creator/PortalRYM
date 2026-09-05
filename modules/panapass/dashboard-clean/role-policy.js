/* Portal RYM - Panapass Dashboard V2 Clean role policy. */
(function(w){
  'use strict';
  if(w.RYM_PANAPASS_CLEAN_POLICY) return;
  const norm=s=>String(s||'').trim().toUpperCase();
  const cleanGalera=s=>['VCARS','VCOMP','VIPCO','VINDU'].includes(norm(s))?norm(s):'';

  const RULES=Object.freeze({
    ADMIN_TOTAL:Object.freeze({role:'ADMIN_TOTAL',scope:'company',view:'admin-total',canOpenAll:true,companyComparison:'full'}),
    ADMIN:Object.freeze({role:'ADMIN',scope:'galera',view:'galera',canOpenAll:false,companyComparison:'aggregate-only'}),
    GERENTE_GALERA:Object.freeze({role:'GERENTE_GALERA',scope:'galera',view:'galera',canOpenAll:false,companyComparison:'aggregate-only'}),
    SUPERVISORA:Object.freeze({role:'SUPERVISORA',scope:'personal',view:'supervisora',canOpenAll:false,companyComparison:'position-only'})
  });

  function identity(session){
    const s=session||{},p=s.profile||{};
    const source=Array.isArray(p.galeras_scope)?p.galeras_scope:[p.galera,p.galera_codigo,p.galera_asignada];
    return Object.freeze({
      role:norm(s.role||p.rol),
      userId:String(s.userId||p.id||p.user_id||''),
      supervisoraId:String(p.supervisora_id||p.id_supervisora||''),
      name:String(p.nombre||p.name||p.usuario||'').trim(),
      galeras:Object.freeze([...new Set(source.map(cleanGalera).filter(Boolean))])
    });
  }
  function forSession(session){
    const id=identity(session),base=RULES[id.role];
    if(!base)throw new Error('Rol no soportado: '+(id.role||'SIN_ROL'));
    return Object.freeze({...base,identity:id,primaryGalera:id.galeras[0]||''});
  }

  w.RYM_PANAPASS_CLEAN_POLICY=Object.freeze({RULES,identity,forSession,cleanGalera});
})(window);
