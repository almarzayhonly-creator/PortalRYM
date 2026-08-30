(() => {
  'use strict';
  if (!window.RYM173) throw new Error('V173 bootstrap missing');

  const sources = Object.freeze({
    ranking: 'panapass_ranking_pagos',
    recurrentes: 'panapass_recurrentes_entidad',
    bajas: 'panapass_bajas_listar_v5'
  });

  const text = v => String(v ?? '').trim();
  const number = v => Number.isFinite(Number(v)) ? Number(v) : 0;

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

  window.RYM173.register('panapass-contracts', { sources, rankingRow, recurrenteRow, bajaRow, bajaStatus });
})();
