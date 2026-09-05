-- BORRADOR NO APLICADO.
-- Objetivo: comparacion agregada entre galeras para Admin/Gerente sin exponer detalle operativo.
-- Revisar y aplicar mediante migracion controlada solo cuando se apruebe la activacion V2.

create or replace function public.panapass_dashboard_company_compare_v2()
returns table(
  galera text,
  unidades bigint,
  negativos bigint,
  unidades_pagadas bigint,
  monto_pagado numeric
)
language sql
stable
security definer
set search_path to 'public','private','auth'
as $function$
with me as (
  select private.current_profile_role() rol
), guard as (
  select 1 ok
  from me
  where auth.uid() is not null
    and private.module_can_view('dashboard')
    and me.rol in ('ADMIN_TOTAL','ADMIN','GERENTE_GALERA')
), p as (
  select (timezone('America/Panama',now()))::date hoy
), active_units as materialized (
  select u.id,u.unidad,upper(trim(s.galera)) galera
  from public.unidades u
  join public.supervisoras s on s.id=u.supervisora_id
  cross join guard
  where upper(trim(coalesce(s.galera,''))) in ('VCARS','VCOMP','VIPCO','VINDU')
    and upper(trim(coalesce(u.estatus,''))) not in ('CERRADO','CANIBALIZADO')
), latest_balance as materialized (
  select au.galera,ss.unidad,ss.saldo,
         row_number() over(
           partition by upper(trim(ss.unidad))
           order by case upper(trim(coalesce(ss.periodo,''))) when 'PM' then 2 when 'AM' then 1 else 0 end desc,ss.id desc
         ) rn
  from public.snapshots_saldos ss
  join active_units au on upper(trim(au.unidad))=upper(trim(ss.unidad))
  join p on ss.fecha=p.hoy
), neg as (
  select galera,count(*) filter(where rn=1 and coalesce(saldo,0)<0)::bigint negativos
  from latest_balance group by galera
), pay as (
  select au.galera,
         count(distinct upper(trim(pg.unidad)))::bigint unidades_pagadas,
         coalesce(sum(pg.a_pagar),0)::numeric monto_pagado
  from public.pagos pg
  join active_units au on upper(trim(au.unidad))=upper(trim(pg.unidad))
  join p on pg.fecha_recarga=p.hoy
  where coalesce(pg.a_pagar,0)>0
  group by au.galera
), units as (
  select galera,count(*)::bigint unidades from active_units group by galera
), gals(galera) as (
  values ('VCARS'::text),('VCOMP'::text),('VIPCO'::text),('VINDU'::text)
)
select g.galera,
       coalesce(u.unidades,0),
       coalesce(n.negativos,0),
       coalesce(py.unidades_pagadas,0),
       coalesce(py.monto_pagado,0)
from gals g
left join units u using(galera)
left join neg n using(galera)
left join pay py using(galera)
order by case g.galera when 'VCARS' then 1 when 'VCOMP' then 2 when 'VIPCO' then 3 when 'VINDU' then 4 else 9 end;
$function$;

-- Antes de aplicar: revisar GRANT/REVOKE segun el patron vigente del proyecto.
