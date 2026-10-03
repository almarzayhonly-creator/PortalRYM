import { computed, ref, type Ref } from 'vue'
import type { RevisadoRecord, RevisadosFilters, RevisadosMetrics, RevisadoEstado } from '../types/revisados.types'

function matchesStatus(row: RevisadoRecord, status: RevisadoEstado) {
  if (status === 'vigente') return row.vigente
  if (status === 'pendiente_ciclo') return row.requiereAtencion
  if (status === 'pendiente_cambio_color') return row.cambioColor
  if (status === 'incidencia') return row.tieneAlertas
  if (status === 'no_aplica') return !row.vigente && !row.requiereAtencion
  return false
}

export function useRevisados(records: Ref<RevisadoRecord[]>) {
  const filters = ref<RevisadosFilters>({
    galeras: [],
    supervisoras: [],
    estados: [],
    search: '',
  })

  const filtered = computed(() => {
    const q = filters.value.search.trim().toLowerCase()

    return records.value.filter((row) => {
      if (filters.value.galeras.length && !filters.value.galeras.includes(row.galera)) return false
      if (filters.value.supervisoras.length && !filters.value.supervisoras.includes(row.supervisora ?? '')) return false
      if (filters.value.estados.length && !filters.value.estados.some((status) => matchesStatus(row, status))) return false
      if (
        q &&
        ![row.unidad, row.placa, row.galera, row.supervisora ?? '', row.detalleEstado ?? '']
          .join(' ')
          .toLowerCase()
          .includes(q)
      ) return false
      return true
    })
  })

  const metrics = computed<RevisadosMetrics>(() => {
    const rows = filtered.value
    return {
      total: rows.length,
      vigentes: rows.filter((row) => row.vigente).length,
      pendientesCiclo: rows.filter((row) => row.requiereAtencion).length,
      cambiosColor: rows.filter((row) => row.cambioColor).length,
      incidencias: rows.filter((row) => row.tieneAlertas).length,
    }
  })

  const options = computed(() => ({
    galeras: [...new Set(records.value.map((row) => row.galera).filter(Boolean))].sort(),
    supervisoras: [...new Set(records.value.map((row) => row.supervisora).filter(Boolean))].sort() as string[],
  }))

  function clearFilters() {
    filters.value = { galeras: [], supervisoras: [], estados: [], search: '' }
  }

  return { filters, filtered, metrics, options, clearFilters }
}
