import type { RevisadoRecord } from '../types/revisados.types'

export interface RevisadosDataSource {
  list(): Promise<RevisadoRecord[]>
}

export function createRevisadosService(source: RevisadosDataSource) {
  return {
    list: () => source.list(),
  }
}

// Intentionally no Supabase or legacy global calls here yet.
// The next migration step is to bind this interface to the existing
// canonical Revisados data contract instead of duplicating business rules.
