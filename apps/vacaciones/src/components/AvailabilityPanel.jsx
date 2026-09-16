import { formatNumber } from '../utils/formatters.js';

export function AvailabilityPanel({ availability, checking }) {
  if (checking) {
    return <div className="availability-card availability-card--checking"><span className="pulse-dot" /> Revisando fechas y reglas...</div>;
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
      {availability.reasons?.length > 0 && (
        <ul className="reason-list">{availability.reasons.map((reason) => <li key={reason}>{reason}</li>)}</ul>
      )}
    </div>
  );
}
