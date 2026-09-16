import { formatNumber } from '../utils/formatters.js';

function CoverageSummary({ coverage }) {
  if (!coverage?.scope) return null;

  return (
    <div className="coverage-block">
      <div className="coverage-heading">
        <strong>Cobertura del equipo</strong>
        <span>{coverage.scope.label || 'Equipo'}</span>
      </div>
      <div className="coverage-grid">
        <div><span>Activos</span><strong>{formatNumber(coverage.scope.active_employees || 0)}</strong></div>
        <div><span>Disponibles mínimo</span><strong>{formatNumber(coverage.projected_available_min ?? 0)}</strong></div>
        <div><span>Con pendientes</span><strong>{formatNumber(coverage.projected_if_pending_approved_min ?? 0)}</strong></div>
        <div><span>Con marcas 7d</span><strong>{formatNumber(coverage.recently_observed_with_punches_7d || 0)}</strong></div>
      </div>
      {coverage.own_time_off_conflicts > 0 && (
        <p className="coverage-conflict">GeoVictoria registra un permiso o licencia que se cruza con este rango.</p>
      )}
    </div>
  );
}

export function AvailabilityPanel({ availability, checking }) {
  if (checking) {
    return <div className="availability-card availability-card--checking"><span className="pulse-dot" /> Revisando fechas, permisos y cobertura...</div>;
  }
  if (!availability) {
    return <div className="availability-card"><strong>Selecciona las fechas</strong><span>La disponibilidad se validara automaticamente.</span></div>;
  }

  return (
    <div className={`availability-card ${availability.available ? 'availability-card--ok' : 'availability-card--no'}`}>
      <div className="availability-title">
        <span className="availability-icon">{availability.available ? '✓' : '!'}</span>
        <div>
          <strong>{availability.available ? 'Fechas disponibles' : 'Hay condiciones por ajustar'}</strong>
          <span>{formatNumber(availability.business_days)} dias laborables</span>
        </div>
      </div>
      {typeof availability.remaining_after_request !== 'undefined' && (
        <div className="availability-stat">
          <span>Saldo despues</span>
          <strong>{formatNumber(availability.remaining_after_request)} dias</strong>
        </div>
      )}
      <CoverageSummary coverage={availability.coverage} />
      {availability.warnings?.length > 0 && (
        <ul className="warning-list">{availability.warnings.map((warning) => <li key={warning}>{warning}</li>)}</ul>
      )}
      {availability.reasons?.length > 0 && (
        <ul className="reason-list">{availability.reasons.map((reason) => <li key={reason}>{reason}</li>)}</ul>
      )}
    </div>
  );
}
