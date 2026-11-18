CREATE OR REPLACE FUNCTION public.panapass_recover_corte_json(p_tipo text, p_source_max timestamptz, p_rows jsonb, p_expected_count integer, p_expected_negatives integer, p_expected_sum numeric, p_run_fecha date)
RETURNS TABLE(corte_id bigint, total_registros integer, negativos integer, saldo_total numeric, source_max timestamptz, db_count integer, db_negativos integer, db_saldo_total numeric)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public','private'
SET statement_timeout TO '90s'
AS $function$
declare
  v_hoy date := (timezone('America/Panama', now()))::date;
  v_tipo text := upper(coalesce(p_tipo,''));
  v_count integer;
  v_neg integer;
  v_sum numeric;
  v_corte_id bigint;
  v_db_count integer;
  v_db_neg integer;
  v_db_sum numeric;
  v_sync record;
  v_corte record;
begin
  if p_run_fecha is null or p_run_fecha <> v_hoy then
    raise exception 'Recuperación rechazada: fecha operativa % no coincide con hoy %', p_run_fecha, v_hoy;
  end if;
  if v_tipo not in ('6AM','11AM') then
    raise exception 'Recuperación rechazada: tipo inválido %', v_tipo;
  end if;
  if p_source_max is null then
    raise exception 'Recuperación rechazada: source_max requerido';
  end if;
  if exists (
    select 1 from public.panapass_cortes_fuente cf
    where cf.fecha=p_run_fecha and cf.tipo=v_tipo
  ) then
    raise exception 'Recuperación rechazada: ya existe corte % %', p_run_fecha, v_tipo;
  end if;

  create temporary table tmp_recovery(
    panapass_numero bigint primary key,
    unidad text,
    saldo numeric
  ) on commit drop;

  insert into tmp_recovery(panapass_numero,unidad,saldo)
  select x.panapass_numero, nullif(btrim(x.unidad),''), x.saldo
  from jsonb_to_recordset(p_rows) as x(panapass_numero bigint, unidad text, saldo numeric)
  where x.panapass_numero is not null
    and nullif(btrim(x.unidad),'') is not null
    and x.saldo is not null
  on conflict(panapass_numero) do update
    set unidad=excluded.unidad, saldo=excluded.saldo;

  select count(*)::int,
         count(*) filter(where tr.saldo<0)::int,
         coalesce(sum(tr.saldo),0)
    into v_count,v_neg,v_sum
  from tmp_recovery tr;

  if v_count <> p_expected_count then
    raise exception 'Recuperación rechazada: conteo % != esperado %', v_count, p_expected_count;
  end if;
  if v_neg <> p_expected_negatives then
    raise exception 'Recuperación rechazada: negativos % != esperado %', v_neg, p_expected_negatives;
  end if;
  if abs(v_sum - p_expected_sum) > 0.005 then
    raise exception 'Recuperación rechazada: suma % != esperada %', v_sum, p_expected_sum;
  end if;

  select * into v_sync
  from public.panapass_sync_fuente_replace_json(p_rows);

  select * into v_corte
  from public.panapass_registrar_corte_json(v_tipo,p_source_max,p_rows);

  v_corte_id := v_corte.corte_id;

  select count(*)::int,
         count(*) filter(where sa.saldo<0)::int,
         coalesce(sum(sa.saldo),0)
    into v_db_count,v_db_neg,v_db_sum
  from public.saldos_actuales sa;

  if v_db_count <> p_expected_count
     or v_db_neg <> p_expected_negatives
     or abs(v_db_sum - p_expected_sum) > 0.005 then
    raise exception 'Verificación post-sync falló: count %, neg %, sum %',
      v_db_count,v_db_neg,v_db_sum;
  end if;

  if (select count(*) from public.panapass_corte_detalle d where d.corte_id=v_corte_id) <> p_expected_count then
    raise exception 'Verificación de detalle falló para corte %', v_corte_id;
  end if;

  update public.panapass_ena_runs r
     set estado='LISTO',
         source_max_detectado=p_source_max,
         finalizado_en=now(),
         filas_api=jsonb_array_length(p_rows),
         filas_validas=p_expected_count,
         corte_id=v_corte_id,
         error=null,
         detalle=coalesce(r.detalle,'{}'::jsonb) || jsonb_build_object(
           'modo','RECUPERACION_VALIDADA',
           'origen','ENA_DIRECTO_V16',
           'recovery_source_max',p_source_max,
           'recovery_expected_count',p_expected_count,
           'recovery_expected_negatives',p_expected_negatives,
           'recovery_expected_sum',p_expected_sum,
           'recovery_verified',true,
           'proteccion_duplicados',true
         ),
         updated_at=now()
   where r.fecha=p_run_fecha and r.tipo=v_tipo;

  if not found then
    raise exception 'Run ENA no encontrado para % %', p_run_fecha,v_tipo;
  end if;

  return query
  select v_corte_id,v_count,v_neg,v_sum,p_source_max,v_db_count,v_db_neg,v_db_sum;
end
$function$;

revoke all on function public.panapass_recover_corte_json(text,timestamptz,jsonb,integer,integer,numeric,date) from public;
revoke all on function public.panapass_recover_corte_json(text,timestamptz,jsonb,integer,integer,numeric,date) from anon;
revoke all on function public.panapass_recover_corte_json(text,timestamptz,jsonb,integer,integer,numeric,date) from authenticated;
grant execute on function public.panapass_recover_corte_json(text,timestamptz,jsonb,integer,integer,numeric,date) to service_role;
