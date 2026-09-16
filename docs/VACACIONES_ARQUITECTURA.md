# RYM Vacaciones — arquitectura inicial

## Objetivo
Portal de vacaciones moderno, móvil y seguro, separado del `index.html` histórico de PortalRYM. La primera versión vive en `apps/vacaciones` para poder desplegarla y evolucionarla de forma independiente.

## Stack
- Frontend: React + Vite, con `index.html` mínimo y CSS separado en `tokens.css`, `base.css` y `app.css`.
- Configuración editable: `src/config/app.json` para textos, navegación, zona horaria y feature flags.
- Datos/Auth: Supabase Auth + Postgres + RLS.
- Integración GeoVictoria: Supabase Edge Function `geovictoria-sync`; el token nunca llega al navegador.
- Hosting: Cloudflare Pages conectado a GitHub. Build: `npm run build`; salida: `dist`; root del proyecto: `apps/vacaciones`.

## Flujo de usuario
1. El colaborador entra por magic link con su correo corporativo.
2. `claim_employee_profile()` enlaza su usuario de Auth con el empleado sincronizado desde GeoVictoria usando el correo del usuario autenticado.
3. El colaborador selecciona fechas.
4. `check_vacation_availability()` valida días laborables, feriados, cruces, saldo, anticipación y capacidad del departamento.
5. La solicitud se guarda en estado `pending`.
6. El supervisor directo la ve por RLS y decide mediante `review_vacation_request()`.
7. Cada cambio queda registrado en `vacation_request_events`.

## Seguridad
- Nunca incluir `service_role`, tokens GeoVictoria ni secretos en `app.json`, `.env` del navegador o el repositorio.
- El frontend solo usa `VITE_SUPABASE_PUBLISHABLE_KEY`.
- Todas las tablas públicas tienen RLS.
- Los roles `hr/admin` se almacenan en `employees.role`, alimentados únicamente por procesos de confianza; no se usan metadatos editables por el usuario para autorizar.
- La Edge Function GeoVictoria usa `SUPABASE_SERVICE_ROLE_KEY` solo del lado servidor y requiere `x-sync-secret` propio. Al desplegarla, `verify_jwt` debe quedar desactivado únicamente porque existe esa autenticación por secreto compartido.

## GeoVictoria
La forma exacta del payload depende de tu API. La función permite configurar los campos con `GEOVICTORIA_FIELD_MAP`, por ejemplo:

```json
{
  "externalId": "Identifier",
  "email": "Email",
  "fullName": "Name",
  "department": "Department.Name",
  "position": "Position.Name",
  "supervisorExternalId": "Boss.Identifier",
  "active": "Enabled"
}
```

Variables servidor requeridas: `GEOVICTORIA_API_BASE_URL`, `GEOVICTORIA_EMPLOYEES_PATH`, `GEOVICTORIA_API_TOKEN`, `GEOVICTORIA_SYNC_SECRET` y opcionalmente `GEOVICTORIA_FIELD_MAP`.

## Supabase
`supabase/schema/vacaciones.sql` es un borrador revisable, no una migración aplicada. Antes de producción se debe generar la migración real con Supabase CLI, probarla en desarrollo, ejecutar Security/Performance Advisors y después promoverla.

## Próximas mejoras
- Calendario visual de disponibilidad del equipo sin revelar motivos privados.
- Saldos por política/antigüedad y arrastre anual.
- Notificaciones de aprobación/rechazo.
- Reglas por sede/departamento y cierres operativos.
- Realtime para actualizar aprobaciones sin refrescar la pantalla.
- PWA instalable y experiencia móvil.
