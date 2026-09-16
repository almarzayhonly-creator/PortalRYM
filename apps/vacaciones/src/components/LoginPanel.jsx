import { useState } from 'react';
import { supabase } from '../lib/supabase.js';

export function LoginPanel() {
  const [email, setEmail] = useState('');
  const [message, setMessage] = useState('');
  const [busy, setBusy] = useState(false);

  async function submit(event) {
    event.preventDefault();
    setBusy(true);
    setMessage('');
    const redirectTo = `${window.location.origin}${window.location.pathname}`;
    const { error } = await supabase.auth.signInWithOtp({
      email: email.trim(),
      options: { emailRedirectTo: redirectTo },
    });
    setBusy(false);
    setMessage(error ? error.message : 'Te enviamos un enlace seguro. Revisa tu correo para continuar.');
  }

  return (
    <main className="login-shell">
      <section className="login-visual" aria-hidden="true">
        <div className="orb orb--one" />
        <div className="orb orb--two" />
        <div className="login-copy">
          <span className="brand-symbol">R</span>
          <p className="eyebrow">Tiempo bien gestionado</p>
          <h1>Vacaciones simples para personas y equipos.</h1>
          <p>Disponibilidad, saldo, aprobaciones y seguimiento en un solo portal.</p>
        </div>
      </section>
      <section className="login-card-wrap">
        <form className="login-card glass-card" onSubmit={submit}>
          <p className="eyebrow">Acceso corporativo</p>
          <h2>Bienvenido a RYM Vacaciones</h2>
          <p className="muted">Usa el correo registrado para recibir un enlace de acceso de un solo uso.</p>
          <label>
            Correo corporativo
            <input
              type="email"
              autoComplete="email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              placeholder="nombre@empresa.com"
              required
            />
          </label>
          <button className="button button--primary button--wide" disabled={busy}>
            {busy ? 'Enviando enlace...' : 'Entrar con enlace seguro'}
          </button>
          {message && <p className="form-message" role="status">{message}</p>}
          <small>El acceso al portal se habilita solo si tu correo coincide con un empleado activo.</small>
        </form>
      </section>
    </main>
  );
}
