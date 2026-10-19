export interface PanapassDay {
  date: string
  amount: number
  units: number
  weekend: boolean
}

export interface PanapassGallery {
  name: string
  units: number
  negatives: number
  paidUnits: number
  negativeBalance: number
  paidAmount: number
  averageUnits: number
  days: PanapassDay[]
  rank?: 'best' | 'watch'
}

export interface PanapassRankRow {
  id: string
  name: string
  gallery: string
  position: number
  total: number
  paidUnits: number
  amount: number
  mine: boolean
}

export interface PanapassSnapshot {
  state: 'ready' | 'stale'
  error?: string
  role: string
  updatedAt: string
  metrics: {
    activeUnits: number
    negatives: number
    paidUnits: number
    paidAmount: number
    recurrentes: number
    pendingBajas: number
    processedBajas: number
    noPanapass: number
    controlActive: number | null
    controlOther: number | null
    average7d: number
  }
  galleries: PanapassGallery[]
  ranking: PanapassRankRow[]
  rankingKind: 'supervisor' | 'gallery'
}
