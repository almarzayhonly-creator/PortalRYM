<script setup lang="ts">
import type { CanonicalRevisadoRow } from '../types/revisados.types'
import RymIcon from '../components/RymIcon.vue'

defineProps<{
  rows: CanonicalRevisadoRow[]
}>()

const emit = defineEmits<{
  open: [row: CanonicalRevisadoRow]
}>()

function text(v: unknown) {
  return String(v ?? '—')
}

function formatDate(v: unknown) {
  try {
    return v
      ? new Intl.DateTimeFormat('es-PA', { dateStyle: 'medium' }).format(new Date(String(v)))
      : '—'
  } catch {
    return text(v)
  }
}

function vehicleModel(r: CanonicalRevisadoRow) {
  return [r.marca, r.modelo].filter(Boolean).join(' ') || String(r.empresa || 'Vehículo RYM')
}

function stateTone(r: CanonicalRevisadoRow) {
  if (r.bloqueado) return 'danger'
  const pending = String(r.pendiente_tipo || r.status2 || '').toUpperCase()
  if (pending.includes('COLOR')) return 'warning'
  if (r.emitido) return 'success'
  return 'pending'
}

function stateLabel(r: CanonicalRevisadoRow) {
  if (r.bloqueado) {
    const reason = String(r.pendiente_tipo || r.status2 || '').trim()
    return reason || 'Incidencia'
  }
  if (r.emitido) return 'Vigente'
  return String(r.pendiente_tipo || r.status2 || '').trim() || 'Pendiente'
}

function vehicleSignals(r: CanonicalRevisadoRow) {
  const signals: Array<{ label: string; tone: string }> = []

  if (r.boleta_empresa) signals.push({ label: 'Boleta empresa', tone: 'danger' })
  else if (r.boleta_pendiente) signals.push({ label: 'Boleta placa', tone: 'danger' })
  else signals.push({ label: 'Sin boleta', tone: 'success' })

  const colorDiff = Boolean(
    r.ficha_ecarcheck_at &&
    r.color_control &&
    r.color_ecarcheck &&
    String(r.color_control).trim().toUpperCase() !== String(r.color_ecarcheck).trim().toUpperCase(),
  )
  signals.push({
    label: colorDiff ? 'Color difiere' : 'Color OK',
    tone: colorDiff ? 'warning' : 'success',
  })

  const cupo = String(r.cupo_ecarcheck || r.cupo_control || '').trim().toUpperCase()
  const withoutCupo = !cupo || ['NO APLICA', 'N/A', 'NA', 'SIN CUPO'].includes(cupo)
  signals.push({
    label: withoutCupo ? 'Sin cupo' : 'Cupo OK',
    tone: withoutCupo ? 'warning' : 'info',
  })

  return signals.slice(0, 3)
}
</script>

<template>
  <div class="ops-table-shell">
    <table class="ops-table">
      <thead>
        <tr>
          <th>Unidad</th>
          <th>Placa</th>
          <th>Galera / supervisora</th>
          <th>Estado</th>
          <th>Alertas y validaciones</th>
          <th>Último revisado</th>
          <th class="ops-action-col">Acción</th>
        </tr>
      </thead>
      <tbody>
        <tr
          v-for="row in rows"
          :key="String(row.unidad_id || row.placa || row.unidad)"
          tabindex="0"
          @dblclick="emit('open', row)"
          @keydown.enter="emit('open', row)"
        >
          <td>
            <div class="ops-unit">
              <span class="ops-unit-mark"><RymIcon name="directions_car" :size="16" /></span>
              <span>
                <b>{{ row.unidad || '—' }}</b>
                <small>{{ vehicleModel(row) }}</small>
              </span>
            </div>
          </td>
          <td><span class="ops-plate">{{ row.placa || '—' }}</span></td>
          <td>
            <div class="ops-location">
              <b>{{ row.galera || '—' }}</b>
              <small>{{ row.supervisora || '—' }}</small>
            </div>
          </td>
          <td>
            <span class="ops-state" :data-tone="stateTone(row)">
              <i></i>{{ stateLabel(row) }}
            </span>
          </td>
          <td>
            <div class="ops-signals">
              <span v-for="signal in vehicleSignals(row)" :key="signal.label" :data-tone="signal.tone">
                {{ signal.label }}
              </span>
            </div>
          </td>
          <td>
            <div class="ops-date">
              <b>{{ formatDate(row.ultimo_revisado) }}</b>
              <small v-if="row.emitido">Vigente</small>
              <small v-else>Requiere revisión</small>
            </div>
          </td>
          <td class="ops-action-col">
            <button type="button" class="ops-open" @click="emit('open', row)">
              Ficha <RymIcon name="arrow_forward" :size="15" />
            </button>
          </td>
        </tr>
        <tr v-if="!rows.length">
          <td colspan="7">
            <div class="ops-empty">
              <span><RymIcon name="search_off" :size="22" /></span>
              <div>
                <b>No hay unidades para estos filtros</b>
                <small>Prueba quitando un filtro o cambiando la búsqueda.</small>
              </div>
            </div>
          </td>
        </tr>
      </tbody>
    </table>
  </div>
</template>

<style scoped>
.ops-table-shell{
  overflow:auto;
  border:1px solid #D8E3F2;
  border-radius:14px;
  background:#fff;
  box-shadow:0 10px 28px rgba(10,27,77,.045);
}
.ops-table{width:100%;min-width:1040px;border-collapse:separate;border-spacing:0}
.ops-table th{
  position:sticky;top:0;z-index:2;
  padding:11px 14px;
  border-bottom:1px solid #D8E3F2;
  background:#F8FAFD;
  color:#66758E;
  font-size:10px;font-weight:800;letter-spacing:.035em;text-align:left;text-transform:uppercase;
}
.ops-table td{
  padding:12px 14px;
  border-bottom:1px solid #EDF2F7;
  color:#203253;
  font-size:12px;
  vertical-align:middle;
}
.ops-table tbody tr:last-child td{border-bottom:0}
.ops-table tbody tr{outline:0;transition:background .16s ease,box-shadow .16s ease}
.ops-table tbody tr:hover,.ops-table tbody tr:focus{background:#F8FBFF}
.ops-table tbody tr:focus{box-shadow:inset 3px 0 0 #244AA5}
.ops-unit{display:flex;align-items:center;gap:9px;min-width:150px}
.ops-unit-mark{
  width:31px;height:31px;display:grid;place-items:center;flex:0 0 auto;
  border:1px solid #C9DCF4;border-radius:9px;background:#EEF5FF;color:#244AA5;
}
.ops-unit>span:last-child,.ops-location,.ops-date{display:grid;gap:2px}
.ops-unit b,.ops-location b,.ops-date b{color:#10224E;font-size:12px}
.ops-unit small,.ops-location small,.ops-date small{color:#7B899C;font-size:10px}
.ops-plate{
  display:inline-flex;align-items:center;justify-content:center;
  min-width:74px;padding:6px 8px;
  border:1px solid #BFCDE0;border-radius:7px;background:#F8FAFD;
  color:#17366F;font:800 11px/1 ui-monospace,SFMono-Regular,Menlo,monospace;
  letter-spacing:.07em;
}
.ops-state{
  display:inline-flex;align-items:center;gap:6px;max-width:170px;
  padding:6px 8px;border:1px solid transparent;border-radius:999px;
  font-size:10px;font-weight:800;line-height:1.1;
}
.ops-state i{width:6px;height:6px;border-radius:50%;background:currentColor;flex:0 0 auto}
.ops-state[data-tone="success"]{background:#ECFDF3;border-color:#ABEFC6;color:#067647}
.ops-state[data-tone="pending"]{background:#EEF5FF;border-color:#C9DCF4;color:#244AA5}
.ops-state[data-tone="warning"]{background:#FFF7ED;border-color:#FED7AA;color:#B54708}
.ops-state[data-tone="danger"]{background:#FEF3F2;border-color:#FECDCA;color:#B42318}
.ops-signals{display:flex;flex-wrap:wrap;gap:5px;min-width:190px}
.ops-signals span{
  display:inline-flex;padding:4px 6px;border-radius:5px;
  font-size:9px;font-weight:750;line-height:1;
}
.ops-signals span[data-tone="success"]{background:#ECFDF3;color:#067647}
.ops-signals span[data-tone="info"]{background:#EEF5FF;color:#244AA5}
.ops-signals span[data-tone="warning"]{background:#FFF7ED;color:#B54708}
.ops-signals span[data-tone="danger"]{background:#FEF3F2;color:#B42318}
.ops-action-col{text-align:right!important}
.ops-open{
  display:inline-flex;align-items:center;gap:5px;
  padding:7px 9px;border:1px solid #C9DCF4;border-radius:8px;
  background:#fff;color:#244AA5;font:800 10px/1 Inter,system-ui,sans-serif;cursor:pointer;
}
.ops-open:hover{background:#EEF5FF;border-color:#AFC9EB}
.ops-empty{
  min-height:140px;display:flex;align-items:center;justify-content:center;gap:10px;
  color:#62708C;text-align:left;
}
.ops-empty>span{width:38px;height:38px;display:grid;place-items:center;border-radius:11px;background:#F4F7FB;color:#8290A4}
.ops-empty>div{display:grid;gap:3px}
.ops-empty b{color:#10224E}
.ops-empty small{font-size:11px}
</style>
