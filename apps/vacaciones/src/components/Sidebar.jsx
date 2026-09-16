import appConfig from '../config/app.json';

export function Sidebar({ employee, onSignOut }) {
  const items = appConfig.navigation.filter((item) => !item.roles || item.roles.includes(employee?.role));

  return (
    <aside className="sidebar">
      <div className="brand">
        <span className="brand-symbol brand-symbol--small">R</span>
        <div>
          <strong>{appConfig.appName}</strong>
          <small>Gestion inteligente</small>
        </div>
      </div>
      <nav className="nav-list" aria-label="Navegacion principal">
        {items.map((item) => <a href={`#${item.id}`} key={item.id}>{item.label}</a>)}
      </nav>
      <div className="sidebar-profile">
        <span>{employee?.full_name || 'Usuario'}</span>
        <small>{employee?.position || employee?.role || 'Colaborador'}</small>
      </div>
      <button className="button button--ghost button--wide" onClick={onSignOut}>Cerrar sesion</button>
    </aside>
  );
}
