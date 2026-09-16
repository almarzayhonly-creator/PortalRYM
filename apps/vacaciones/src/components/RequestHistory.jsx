import appConfig from '../config/app.json';
import { formatDate } from '../utils/formatters.js';

function StatusChip({ status }) {
  return <span className={`status status--${status}`}>{appConfig.statusLabels[status] || status}</span>;
}

export function RequestHistory({ requests }) {
  return (
    <article id="history" className="panel">
      <div className="panel-heading">
        <div>
          <p className="eyebrow">Seguimiento</p>
          <h2>Mis solicitudes</h2>
        </div>
        <span className="counter-badge">{requests.length}</span>
      </div>
      <div className="request-list">
        {requests.length === 0 ? (
          <div className="empty-state"><strong>Aun no hay solicitudes</strong><span>Cuando envies una aparecera aqui con su estado.</span></div>
        ) : requests.slice(0, 8).map((request) => (
          <div className="request-row" key={request.id}>
            <div className="request-row-main">
              <strong>{formatDate(request.start_date)} <span>→</span> {formatDate(request.end_date)}</strong>
              <small>{request.business_days} dias laborables</small>
              {request.review_note && <small className="review-note">Nota: {request.review_note}</small>}
            </div>
            <StatusChip status={request.status} />
          </div>
        ))}
      </div>
    </article>
  );
}
