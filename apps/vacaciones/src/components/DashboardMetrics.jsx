import { formatNumber } from '../utils/formatters.js';

export function DashboardMetrics({ summary, balanceConfigured }) {
  return (
    <section id="dashboard" className="metric-grid">
      <article className="metric-card metric-card--accent">
        <span>Disponibles</span>
        <strong>{balanceConfigured ? formatNumber(summary.availableDays) : '—'}</strong>
        <small>{balanceConfigured ? 'dias para solicitar' : 'saldo anual pendiente de configurar'}</small>
      </article>
      <article className="metric-card">
        <span>Pendientes</span>
        <strong>{formatNumber(summary.pendingDays)}</strong>
        <small>dias esperando decision</small>
      </article>
      <article className="metric-card">
        <span>Aprobados</span>
        <strong>{formatNumber(summary.approvedDays)}</strong>
        <small>dias aprobados en el historial</small>
      </article>
      <article className="metric-card">
        <span>Por revisar</span>
        <strong>{summary.approvalCount}</strong>
        <small>solicitudes del equipo</small>
      </article>
    </section>
  );
}
