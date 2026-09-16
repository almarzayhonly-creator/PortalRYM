import { AvailabilityPanel } from './AvailabilityPanel.jsx';

export function VacationRequestForm({ form, setForm, availability, checkingAvailability, saving, onSubmit }) {
  async function submit(event) {
    event.preventDefault();
    await onSubmit();
  }

  return (
    <article id="request" className="panel panel--request glass-card">
      <div className="panel-heading">
        <div>
          <p className="eyebrow">Nueva solicitud</p>
          <h2>Planifica tu proximo descanso</h2>
        </div>
        <span className="live-badge">Validacion en vivo</span>
      </div>
      <form className="request-form" onSubmit={submit}>
        <div className="date-grid">
          <label>
            Desde
            <input type="date" value={form.start} onChange={(event) => setForm({ ...form, start: event.target.value })} required />
          </label>
          <label>
            Hasta
            <input type="date" value={form.end} onChange={(event) => setForm({ ...form, end: event.target.value })} required />
          </label>
        </div>
        <AvailabilityPanel availability={availability} checking={checkingAvailability} />
        <label>
          Nota para tu supervisor
          <textarea rows="3" maxLength="500" value={form.note} onChange={(event) => setForm({ ...form, note: event.target.value })} placeholder="Opcional: agrega contexto sobre tu solicitud" />
        </label>
        <div className="action-row">
          <span className="muted mini-copy">No se enviara la solicitud si las reglas actuales no permiten esas fechas.</span>
          <button className="button button--primary" disabled={!availability?.available || checkingAvailability || saving}>
            {saving ? 'Enviando...' : 'Enviar solicitud'}
          </button>
        </div>
      </form>
    </article>
  );
}
