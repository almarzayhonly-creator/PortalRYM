(() => {
  'use strict';
  if (!window.RYM173) throw new Error('V173 bootstrap missing');

  const sources = Object.freeze({
    dashboard: 'dashboard_resumen',
    galeras: 'panapass_dashboard_galeras',
    negativos: 'panapass_negativos_fecha_v2',
    pagos: 'panapass_pagos_fecha_v2',
    historialResumen: 'panapass_historial_resumen_v2',
    historialLista: 'panapass_historial_lista_v2',
    ranking: 'panapass_ranking_pagos',
    recurrentes: 'panapass_recurrentes_entidad',
    bajas: 'panapass_bajas_listar_v5'
  });

  const text = v => String(v ?? '').trim();
  const number = v => Number.isFinite(Number(v)) ? Number(v) : 0;

  function dashboardRow(row = {}) {
    return Object.freeze({
      fecha: text(row.fecha),
      unidades: Math.max(0, number(row.unidades_visibles)),
      negativos: Math.max(0, number(row.negativos_hoy)),
      pagos: Math.max(0, number(row.pagos_hoy)),
      recurrentes: Math.max(0, number(row.recurrentes_mes)),
      montoMes: number(row.monto_pagos_mes)
    });
  }

  function galeraRow(row = {}) {
    return Object.freeze({
      galera: text(row.galera),
      unidades: Math.max(0, number(row.unidades)),
      negativos: Math.max(0, number(row.negativos)),
      pagadas: Math.max(0, number(row.unidades_pagadas)),
      saldoNegativo: number(row.saldo_negativo),
      montoPagado: number(row.monto_pagado)
    });
  }

  function negativoRow(row = {}) {
    return Object.freeze({
      fecha: text(row.fecha), status: text(row.status), unidad: text(row.unidad),
      placa: text(row.placa), panapass: text(row.panapass_numero ?? row.panapass),
      galera: text(row.galera), supervisora: text(row.supervisora),
      empresa: text(row.empresa), neg7: Math.max(0, number(row.neg7)), saldo: number(row.saldo)
    });
  }

  function pagoRow(row = {}) {
    return Object.freeze({
      fecha: text(row.fecha), unidad: text(row.unidad),
      panapass: text(row.panapass_numero ?? row.panapass), galera: text(row.galera),
      supervisora: text(row.supervisora), empresa: text(row.empresa),
      aPagar: number(row.a_pagar), boleta: number(row.boleta),
      pag7: Math.max(0, number(row.pag7)), nOp: text(row.n_op),
      operador: text(row.operador), cobrador: text(row.cobrador),
      tipo: text(row.tipo), estadoCobra: text(row.estado_cobra)
    });
  }

  function historialResumen(row = {}) {
    return Object.freeze({
      registros: Math.max(0, number(row.registros)),
      unidades: Math.max(0, number(row.unidades)),
      total: number(row.total_a_pagar),
      pendiente: number(row.monto_pendiente),
      revisar: Math.max(0, number(row.revisar))
    });
  }

  function rankingRow(row = {}) {
    return Object.freeze({
      id: text(row.supervisora_id ?? row.id),
      supervisora: text(row.supervisora_nombre ?? row.supervisora) || 'SIN SUPERVISORA',
      galera: text(row.galera),
      unidades: Math.max(0, number(row.unidades_pagadas ?? row.unidades)),
      monto: number(row.monto_pagado ?? row.monto),
      racha: Math.max(0, number(row.racha)),
      fechaDesde: text(row.fecha_desde ?? row.fechaDesde)
    });
  }

  function recurrenteRow(row = {}) {
    return Object.freeze({
      tipo: text(row.tipo_entidad ?? row.tipo).toUpperCase() === 'OPERADOR' ? 'OPERADOR' : 'UNIDAD',
      identificador: text(row.identificador), nombre: text(row.nombre), unidad: text(row.unidad),
      supervisora: text(row.supervisora), galera: text(row.galera),
      pagos: Math.max(0, number(row.pagos)), dias: Math.max(0, number(row.dias_con_pago ?? row.dias)),
      total: Math.max(0, number(row.total_pagado ?? row.total)), nivel: text(row.nivel) || 'RECURRENTE'
    });
  }

  function bajaRow(row = {}) {
    const tags = Array.isArray(row.tags_ena ?? row.tags) ? (row.tags_ena ?? row.tags).map(text).filter(Boolean) : text(row.tags_ena ?? row.tags).split(',').map(text).filter(Boolean);
    return Object.freeze({
      unidad: text(row.unidad), galera: text(row.galera), empresa: text(row.empresa), placa: text(row.placa),
      panapass: text(row.panapass_numero ?? row.panapass), tags: Object.freeze(tags),
      cantidadTags: Math.max(0, number(row.cantidad_tags ?? row.cantidadTags ?? tags.length)), saldo: number(row.saldo),
      enaConsultadoAt: text(row.ena_consultado_at ?? row.enaConsultadoAt), alertaAdmin: Boolean(row.alerta_admin ?? row.alertaAdmin)
    });
  }

  function bajaStatus(row) {
    const r = bajaRow(row);
    if (r.alertaAdmin) return 'REVISION_ADMIN';
    if (r.cantidadTags > 0) return r.saldo > 0 ? 'BAJA_PENDIENTE_DEVOLUCION' : 'PENDIENTE_BAJA';
    return 'SIN_TAG_ACTIVO';
  }

  window.RYM173.register('panapass-contracts', {
    sources, dashboardRow, galeraRow, negativoRow, pagoRow, historialResumen,
    rankingRow, recurrenteRow, bajaRow, bajaStatus
  });
})();
