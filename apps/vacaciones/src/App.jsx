import { LoginPanel } from './components/LoginPanel.jsx';
import { Sidebar } from './components/Sidebar.jsx';
import { DashboardMetrics } from './components/DashboardMetrics.jsx';
import { VacationRequestForm } from './components/VacationRequestForm.jsx';
import { RequestHistory } from './components/RequestHistory.jsx';
import { ApprovalQueue } from './components/ApprovalQueue.jsx';
import { useVacationPortal } from './hooks/useVacationPortal.js';

function App() {
  const portal = useVacationPortal();

  if (!portal.authReady) {
    return <main className="loading-screen"><span className="loader-ring" /> Preparando acceso...</main>;
  }

  if (!portal.session) return <LoginPanel />;

  if (portal.loading && !portal.employee) {
    return <main className="loading-screen"><span className="loader-ring" /> Preparando tu calendario...</main>;
  }

  if (!portal.employee) {
    return (
      <main className="access-shell">
        <section className="access-card glass-card">
          <span className="brand-symbol">R</span>
          <p className="eyebrow">Perfil no vinculado</p>
          <h1>Tu acceso existe, pero aun no encontramos tu ficha de empleado.</h1>
          <p className="muted">Esto se resolvera cuando tu correo corporativo este sincronizado desde GeoVictoria.</p>
          {portal.error && <div className="alert">{portal.error}</div>}
          <div className="action-row">
            <button className="button button--secondary" onClick={portal.reload}>Reintentar</button>
            <button className="button button--primary" onClick={portal.signOut}>Cerrar sesion</button>
          </div>
        </section>
      </main>
    );
  }

  return (
    <div className="app-shell">
      <Sidebar employee={portal.employee} onSignOut={portal.signOut} />
      <main className="content">
        <header className="topbar">
          <div>
            <p className="eyebrow">Hola, {portal.employee.full_name}</p>
            <h1>Tu tiempo, tu equipo, una sola vista.</h1>
            <p className="topbar-copy">Solicita vacaciones con reglas claras y seguimiento en tiempo real.</p>
          </div>
          <div className="profile-pill">
            <span>{portal.employee.department || 'Sin departamento'}</span>
            <strong>{portal.employee.position || 'Colaborador'}</strong>
            <small>{portal.employee.role}</small>
          </div>
        </header>

        {portal.error && <div className="alert" role="alert"><span>{portal.error}</span><button onClick={() => portal.setError('')}>×</button></div>}

        <DashboardMetrics summary={portal.summary} balanceConfigured={Boolean(portal.balance)} />

        <section className="two-column">
          <VacationRequestForm
            form={portal.form}
            setForm={portal.setForm}
            availability={portal.availability}
            checkingAvailability={portal.checkingAvailability}
            saving={portal.saving}
            onSubmit={portal.submitRequest}
          />
          <RequestHistory requests={portal.requests} />
        </section>

        <ApprovalQueue approvals={portal.approvals} employee={portal.employee} onDecision={portal.decide} />
      </main>
    </div>
  );
}

export default App;
