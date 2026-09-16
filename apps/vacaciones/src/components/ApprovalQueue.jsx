import { useState } from 'react';
import { formatDate } from '../utils/formatters.js';

function CoverageStrip({ availability }) {
  const coverage = availability?.coverage;
  if (!coverage?.scope) return null;

  return (
    <div className="approval-coverage">
      <div className="approval-coverage__top">
        <span>{coverage.scope.label || 'Equipo'}</span>
        <strong>{coverage.projected_available_min ?? 0} disponibles min.</strong>
      </div>
      <div className="approval-coverage__meta">
        <span>{coverage.scope.active_employees || 0} activos</span>
        <span>{coverage.known_absent_max_without_request || 0} ausentes conocidos</span>
        <span>{coverage.pending_competition_max || 0} solicitudes pendientes</span>
      </div>
      {availability.warnings?.length > 0 && (
        <ul className="approval-warning-list">
          {availability.warnings.map((warning) => <li key={warning}>{warning}</li>)}
        </ul>
      )}
      {availability.reasons?.length > 0 && (
        <ul className="approval-blocker-list">
          {availability.reasons.map((reason) => <li key={reason}>{reason}</li>)}
        </ul>
      )}
    </div>
  );
}

function ApprovalCard({ request, onDecision }) {
  const [note, setNote] = useState('');
  const [busy, setBusy] = useState(false);

  async function decide(decision) {
    setBusy(true);
    await onDecision(request.id, decision, note);
    setBusy(false);
  }

  const approvalBlocked = request.availability && request.availability.available === false;

  return (
    <article className="approval-card">
      <div className="approval-person">
        <span className="avatar-letter">{(request.employees?.full_name || '?').charAt(0).toUpperCase()}</span>
        <div>
          <strong>{request.employees?.full_name || 'Colaborador'}</strong>
          <small>{request.employees?.position || request.employees?.department || 'Equipo'}</small>
        </div>
      </div>
      <div className="approval-period">
        <span>{formatDate(request.start_date)} → {formatDate(request.end_date)}</span>
        <strong>{request.business_days} dias</strong>
      </div>
      <CoverageStrip availability={request.availability} />
      {request.employee_note && <p className="employee-note">“{request.employee_note}”</p>}
      <input type="text" maxLength="300" value={note} onChange={(event) => setNote(event.target.value)} placeholder="Nota opcional para la decision" />
      <div className="action-row action-row--compact">
        <button className="button button--ghost-danger" disabled={busy} onClick={() => decide('rejected')}>Rechazar</button>
        <button
          className="button button--primary"
          disabled={busy || approvalBlocked}
          title={approvalBlocked ? 'Hay condiciones que impiden aprobar esta solicitud.' : undefined}
          onClick={() => decide('approved')}
        >
          Aprobar
        </button>
      </div>
    </article>
  );
}

export function ApprovalQueue({ approvals, employee, onDecision }) {
  const canApprove = ['supervisor', 'hr', 'admin'].includes(employee?.role);
  if (!canApprove) return null;

  return (
    <section id="approvals" className="panel approvals-panel">
      <div className="panel-heading">
        <div>
          <p className="eyebrow">Supervisor</p>
          <h2>Aprobaciones del equipo</h2>
        </div>
        <span className="counter-badge counter-badge--accent">{approvals.length}</span>
      </div>
      <div className="approval-grid">
        {approvals.length === 0 ? (
          <div className="empty-state"><strong>Todo al dia</strong><span>No tienes solicitudes pendientes de revision.</span></div>
        ) : approvals.map((request) => <ApprovalCard key={request.id} request={request} onDecision={onDecision} />)}
      </div>
    </section>
  );
}
