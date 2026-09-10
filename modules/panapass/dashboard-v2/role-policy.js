/* Portal RYM - Panapass Dashboard V2 role policy. Prepared, not wired. */
(function(w){
  'use strict';
  if(w.RYM_PANAPASS_DASHBOARD_V2_POLICY) return;

  const norm=s=>String(s||'').trim().toUpperCase();
  const cleanGalera=s=>{
    const x=norm(s);
    return ['VCARS','VCOMP','VIPCO','VINDU'].includes(x)?x:'';
  };

  const RULES=Object.freeze({
    ADMIN_TOTAL:Object.freeze({
      role:'ADMIN_TOTAL',scope:'company',view:'admin-total',
      canSeeCompany:true,canOpenOtherGaleras:true,canSeeAllSupervisorRows:true,
      canOpenOtherSupervisorUnits:true,canCompareOtherGaleras:true,
      canSeeGlobalSupervisorComparison:true,companyComparison:'full'
    }),
    ADMIN:Object.freeze({
      role:'ADMIN',scope:'galera',view:'galera',
      canSeeCompany:false,canOpenOtherGaleras:false,canSeeAllSupervisorRows:false,
      canOpenOtherSupervisorUnits:false,canCompareOtherGaleras:true,
      canSeeGlobalSupervisorComparison:false,companyComparison:'aggregate-only'
    }),
    GERENTE_GALERA:Object.freeze({
      role:'GERENTE_GALERA',scope:'galera',view:'galera',
      canSeeCompany:false,canOpenOtherGaleras:false,canSeeAllSupervisorRows:false,
      canOpenOtherSupervisorUnits:false,canCompareOtherGaleras:true,
      canSeeGlobalSupervisorComparison:false,companyComparison:'aggregate-only'
    }),
    SUPERVISORA:Object.freeze({
      role:'SUPERVISORA',scope:'personal',view:'supervisora',
      canSeeCompany:false,canOpenOtherGaleras:false,canSeeAllSupervisorRows:false,
      canOpenOtherSupervisorUnits:false,canCompareOtherGaleras:false,
      canSeeGlobalSupervisorComparison:true,companyComparison:'position-only'
    })
  });

  function galerasFromProfile(profile){
    const p=profile||{};
    const source=Array.isArray(p.galeras_scope)?p.galeras_scope:[p.galera,p.galera_codigo,p.galera_asignada];
    return [...new Set(source.map(cleanGalera).filter(Boolean))];
  }

  function visibleRole(){
    if(typeof document==='undefined')return '';
    const roles=[...document.querySelectorAll('.user span,.top .pill')].map(x=>norm(x.textContent));
    return roles.find(x=>Object.prototype.hasOwnProperty.call(RULES,x))||'';
  }

  function visibleName(){
    if(typeof document==='undefined')return '';
    return String(document.querySelector('.user strong')?.textContent||'').trim();
  }

  function identity(session){
    const s=session||{},p=s.profile||{},role=norm(s.role||p.rol)||visibleRole();
    return Object.freeze({
      role,
      userId:String(s.userId||p.id||p.user_id||''),
      supervisoraId:String(p.supervisora_id||''),
      name:String(p.nombre||p.name||visibleName()).trim(),
      galeras:Object.freeze(galerasFromProfile(p))
    });
  }

  function forSession(session){
    const id=identity(session),base=RULES[id.role];
    if(!base) throw new Error('Rol no soportado por Panapass Dashboard V2: '+(id.role||'SIN_ROL'));
    return Object.freeze({...base,identity:id,primaryGalera:id.galeras[0]||''});
  }

  function can(policy,capability){return Boolean(policy&&policy[capability]===true)}

  w.RYM_PANAPASS_DASHBOARD_V2_POLICY=Object.freeze({RULES,identity,forSession,can,cleanGalera});
})(window);

