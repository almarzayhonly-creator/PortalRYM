import { useEffect, useMemo, useState } from 'react';
import appConfig from './config/app.json';
import { supabase } from './lib/supabase.js';
import {
  checkAvailability,
  claimEmployeeProfile,
  createVacationRequest,
  getMyEmployee,
  listMyRequests,
  listPendingApprovals,
  reviewVacationRequest,
} from './services/vacations.js';

const formatDate = (value) => value ? new Intl.DateTimeFormat(appConfig.locale, { day: '2-digit', month: 'short', year: 'numeric' }).format(new Date(`${value}T12:00:00`)) : '—';

function StatusChip({ status }) {
  return <span className={`status status--${status}`}>{appConfig.statusLabels[status] || status}</span>;
}

function Login() {
  const [email, setEmail] = useState('');
  const [message, setMessage] = useState('');
  const [busy, setBusy] = useState(false);

  async function submit(event) {
    event.preventDefault();
    setBusy(true);
    setMessage('');
    const redirectTo = `${window.location.origin}${window.location.pathname}`;
    const { error } = await supabase.auth.signInWithOtp({ email, options: { emailRedirectTo: redirectTo } });
    setBusy(false);
    setMessage(error ? error.message : 'Te enviamos un enlace seguro de acceso a tu correo.');
  }

  return (
    <main className="login-shell">
      <section className="login-card glass-card">
        <div className="brand-mark">R</div>
        <p className="eyebrow">Portal interno</p>
        <h1>Vacaciones, sin correos ni hojas de cálculo.</h1>
        <p className="muted">Solicita, revisa disponibilidad y sigue la aprobación desde un solo lugar.</p>
        <form onSubmit={submit} className="login-form">
          <label>Correo corporativo</label>
          <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="nombre@empresa.com" required />
          <button className="button button--primary" disabled={busy}>{busy ? 'Enviando…' : 'Entrar con enlace seguro'}</button>
        </form>
        {message && <p className="form-message">{message}</p>}
      </section>
    </main>
  );
}

function App() {
  const [session, setSession] = useState(null);
  const [employee, setEmployee] = useState(null);
  const [requests, setRequests] = useState([]);
  const [approvals, setApprovals] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [availability, setAvailability] = useState(null);
  const [form, setForm] = useState({ start: '', end: '', note: '' });
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => setSession(data.session));
    const { data: subscription } = supabase.auth.onAuthStateChange((_event, nextSession) => setSession(nextSession));
    return () => subscription.subscription.unsubscribe();
  }, []);

  useEffect(() => {
    if (!session?.user) {
      setEmployee(null);
      setLoading(false);
      return;
    }
    loadDashboard();
  }, [session?.user?.id]);

  async function loadDashboard() {
    try {
      setLoading(true);
      setError('');
      await claimEmployeeProfile();
      const currentEmployee = await getMyEmployee(session.user.id);
      const [myRequests, pending] = await Promise.all([
        listMyRequests(currentEmployee.id),
        listPendingApprovals(),
      ]);
      setEmployee(currentEmployee);
      setRequests(myRequests);
      setApprovals(pending);
    } catch (err) {
      setError(err.message || 'No se pudo cargar el portal.');
    } finally {
      setLoading(false);
    }
  }

  const approvedDays = useMemo(() => requests.filter((r) => r.status === 'approved').reduce((total, r) => total + Number(r.business_days || 0), 0), [requests]);
  const pendingDays = useMemo(() => requests.filter((r) => r.status === 'pending').reduce((total, r) => total + Number(r.business_days || 0), 0), [requests]);

  async function evaluateDates() {
    if (!employee || !form.start || !form.end) return;
    try {
      setAvailability(await checkAvailability(employee.id, form.start, form.end));
    } catch (err) {
      setError(err.message);
    }
  }

  async function submitRequest(event) {
    event.preventDefault();
    if (!availability?.available) return;
    try {
      setSaving(true);
      await createVacationRequest(employee.id, form.start, form.end, form.note);
      setForm({ start: '', end: '', note: '' });
      setAvailability(null);
      await loadDashboard();
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  }

  async function decide(id, decision) {
    try {
      await reviewVacationRequest(id, decision, null);
      await loadDashboard();
    } catch (err) {
      setError(err.message);
    }
  }

  if (!session) return <Login />;
  if (loading) return <main className="loading-screen">Preparando tu calendario…</main>;

  return (
    <div className="app-shell">
      <aside className="sidebar">
        <div className="brand"><span className="brand-mark brand-mark--small">R</span><div><strong>{appConfig.appName}</strong><small>Gestión inteligente</small></div></div>
        <nav>{appConfig.navigation.map((item) => <a href={`#${item.id}`} key={item.id}>{item.label}</a>)}</nav>
        <button className="button button--ghost" onClick={() => supabase.auth.signOut()}>Cerrar sesión</button>
      </aside>

      <main className="content">
        <header className="topbar">
          <div><p className="eyebrow">Hola, {employee?.full_name || session.user.email}</p><h1>Tu tiempo también se planifica bien.</h1></div>
          <div className="profile-pill"><span>{employee?.department || 'Equipo'}</span><strong>{employee?.position || 'Colaborador'}</strong></div>
        </header>

        {error && <div className="alert">{error}</div>}

        <section id="dashboard" className="metric-grid">
          <article className="metric-card"><span>Días aprobados</span><strong>{approvedDays}</strong><small>en solicitudes registradas</small></article>
          <article className="metric-card"><span>Días pendientes</span><strong>{pendingDays}</strong><small>esperando decisión</small></article>
          <article className="metric-card metric-card--accent"><span>Aprobaciones por revisar</span><strong>{approvals.length}</strong><small>de tu equipo directo</small></article>
        </section>

        <section className="two-column">
          <article id="request" className="panel glass-card">
            <div className="panel-heading"><div><p className="eyebrow">Nueva solicitud</p><h2>¿Cuándo quieres desconectarte?</h2></div>{availability && <span className={`availability ${availability.available ? 'availability--ok' : 'availability--no'}`}>{availability.available ? 'Fechas disponibles' : 'Requiere ajuste'}</span>}</div>
            <form onSubmit={submitRequest} className="request-form">
              <div className="date-grid"><label>Desde<input type="date" value={form.start} onChange={(e) => setForm({ ...form, start: e.target.value })} required /></label><label>Hasta<input type="date" value={form.end} onChange={(e) => setForm({ ...form, end: e.target.value })} required /></label></div>
              <label>Nota opcional<textarea rows="3" value={form.note} onChange={(e) => setForm({ ...form, note: e.target.value })} placeholder="Contexto para tu supervisor" /></label>
              <div className="action-row"><button type="button" className="button button--secondary" onClick={evaluateDates}>Comprobar disponibilidad</button><button className="button button--primary" disabled={!availability?.available || saving}>{saving ? 'Enviando…' : 'Solicitar'}</button></div>
            </form>
            {availability?.reasons?.length > 0 && <ul className="reason-list">{availability.reasons.map((reason) => <li key={reason}>{reason}</li>)}</ul>}
          </article>

          <article className="panel">
            <div className="panel-heading"><div><p className="eyebrow">Historial</p><h2>Mis solicitudes</h2></div></div>
            <div className="request-list">{requests.length === 0 ? <p className="empty">Todavía no tienes solicitudes.</p> : requests.slice(0, 6).map((request) => <div className="request-row" key={request.id}><div><strong>{formatDate(request.start_date)} → {formatDate(request.end_date)}</strong><small>{request.business_days} días laborables</small></div><StatusChip status={request.status} /></div>)}</div>
          </article>
        </section>

        <section id="approvals" className="panel approvals-panel">
          <div className="panel-heading"><div><p className="eyebrow">Supervisor</p><h2>Solicitudes pendientes de tu equipo</h2></div></div>
          <div className="approval-grid">{approvals.length === 0 ? <p className="empty">No tienes aprobaciones pendientes.</p> : approvals.map((request) => <article className="approval-card" key={request.id}><div><strong>{request.employees?.full_name || 'Colaborador'}</strong><small>{request.employees?.department || ''}</small></div><p>{formatDate(request.start_date)} → {formatDate(request.end_date)} · {request.business_days} días</p><div className="action-row"><button className="button button--ghost-danger" onClick={() => decide(request.id, 'rejected')}>Rechazar</button><button className="button button--primary" onClick={() => decide(request.id, 'approved')}>Aprobar</button></div></article>)}</div>
        </section>
      </main>
    </div>
  );
}

export default App;
