import { useState } from 'react';
import { formatDate } from '../utils/formatters.js';

function ApprovalCard({ request, onDecision }) {
  const [note, setNote] = useState('');
  const [busy, setBusy] = useState(false);

  async function decide(decision) {
    setBusy(true);
    await onDecision(request.id, decision, note);
    setBusy(false);
  }

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
      {request.employee_note && <p className="employee-note">“{request.employee_note}”</p>}
      <input type="text" maxLength="300" value={note} onChange={(event) => setNote(event.target.value)} placeholder="Nota opcional para la decision" />
      <div className="action-row action-row--compact">
        <button className="button button--ghost-danger" disabled={busy} onClick={() => decide('rejected')}>Rechazar</button>
        <button className="button button--primary" disabled={busy} onClick={() => decide('approved')}>Aprobar</button>
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
