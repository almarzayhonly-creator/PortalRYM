import { computed, ref, type Ref } from 'vue'
import type {
  RevisadoRecord,
  RevisadosFilters,
  RevisadosMetrics,
} from '../types/revisados.types'

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
      if (
        filters.value.supervisoras.length &&
        !filters.value.supervisoras.includes(row.supervisora ?? '')
      ) return false
      if (filters.value.estados.length && !filters.value.estados.includes(row.estado)) return false
      if (
        q &&
        ![row.unidad, row.placa, row.galera, row.supervisora ?? '']
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
      vigentes: rows.filter((row) => row.estado === 'vigente').length,
      pendientesCiclo: rows.filter((row) => row.estado === 'pendiente_ciclo').length,
      cambiosColor: rows.filter((row) => row.estado === 'pendiente_cambio_color').length,
      incidencias: rows.filter((row) => row.estado === 'incidencia').length,
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
