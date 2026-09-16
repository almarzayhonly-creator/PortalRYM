# Supabase - rym-vacaciones

Proyecto remoto: `uetfiohwdmehqayytxxm`.

La base contiene empleados, saldos, feriados, reglas de disponibilidad, solicitudes, auditoria y datos operativos de GeoVictoria. Las credenciales secretas nunca deben vivir en GitHub ni llegar al navegador.

## GeoVictoria

La integracion esta separada en tres Edge Functions:

- `functions/geovictoria-sync`: sincroniza empleados hacia `public.employees`. Esta integracion usa el flujo OAuth ya validado contra `apiv3.geovictoria.com`.
- `functions/geovictoria-explorer`: explorador de solo lectura para validar endpoints y estructuras de la API publica versionada.
- `functions/geovictoria-operational-sync`: sincroniza catalogos y datos operativos desde `customerapi.geovictoria.com/api/v1` hacia Supabase.

Secretos requeridos:

- `GEOVICTORIA_API_KEY`
- `GEOVICTORIA_API_SECRET`
- `GEOVICTORIA_SYNC_SECRET`

Variables opcionales usadas por la sincronizacion de empleados:

- `GEOVICTORIA_OAUTH_BASE_URL`
- `GEOVICTORIA_USERS_PATH`
- `GEOVICTORIA_GROUPS_PATH`

No se deben guardar estos valores en archivos del repositorio.

## Esquema operativo

La migracion `migrations/20260916175500_geovictoria_operational_schema.sql` documenta el esquema creado para:

- turnos, perfiles, cargos, grupos y tipos de permisos;
- libro de asistencia por empleado y periodo;
- marcas de entrada/salida;
- permisos/licencias;
- horas extra.

Todas las tablas publicas tienen RLS. Los catalogos son de lectura para usuarios autenticados. Asistencia, marcas, permisos y horas extra se limitan al propio empleado o a quien pueda administrarlo segun las funciones privadas de autorizacion existentes.

Las coordenadas de GeoVictoria (`Longitude`, `Latitude`, `Accuracy`) no se almacenan por defecto, ni siquiera dentro de `raw_data` de las marcas.

## Sincronizacion operativa

`geovictoria-operational-sync` acepta `POST` con autorizacion por `x-sync-secret` o por una sesion Supabase asociada a un empleado activo con rol `hr` o `admin`.

Ejemplo de body:

```json
{
  "mode": "all",
  "days": 7
}
```

Modos soportados:

- `all`: catalogos + datos operativos.
- `catalogs`: solo catalogos.
- `operational`: asistencia, marcas, permisos y horas extra.

`days` acepta de 1 a 31 dias y usa 7 por defecto.

## Seguridad

- El frontend usa solamente una publishable key.
- Las claves secretas de Supabase y GeoVictoria se usan solo del lado servidor.
- Los grants de Postgres y las politicas RLS se gestionan por separado.
- `private.integration_sync_log` tiene RLS y no esta disponible para `anon` ni `authenticated`.
- `@supabase/supabase-js` esta fijado a `2.116.0` en los import maps de las Edge Functions.

Ver tambien `../docs/GEOVICTORIA_CAPABILITIES.md`.
