# Supabase - rym-vacaciones

Proyecto remoto: `uetfiohwdmehqayytxxm`.

La base ya contiene empleados, saldos, feriados, reglas de disponibilidad, solicitudes y auditoria con RLS. Las credenciales secretas nunca deben vivir en GitHub.

## GeoVictoria

La funcion `functions/geovictoria-sync` queda preparada, pero no se despliega hasta conocer el endpoint real, autenticacion y payload de GeoVictoria.

Variables requeridas en el entorno de la Edge Function:

- `GEOVICTORIA_API_BASE_URL`
- `GEOVICTORIA_EMPLOYEES_PATH`
- `GEOVICTORIA_API_TOKEN`
- `GEOVICTORIA_SYNC_SECRET`
- `GEOVICTORIA_FIELD_MAP` (opcional)

El navegador no recibe ninguna de estas variables.
