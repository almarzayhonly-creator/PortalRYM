# Capacidades verificadas de GeoVictoria

Fecha de validacion: 2026-09-16.

La integracion se valido contra `https://customerapi.geovictoria.com` usando las Edge Functions `geovictoria-explorer` y `geovictoria-operational-sync`, con credenciales almacenadas como secretos de Supabase.

## Modulos verificados

| Modulo | Endpoint | Estado | Observaciones |
| --- | --- | --- | --- |
| Turnos | `/api/v1/Shift/List` | 200 | 21 turnos. Campos observados: `Id`, `StartTime`, `MaxStartTime`, `ExitTime`, `Type`, `FixedShiftHours`, `ShiftDisplay`, `BreakMinutes`, `BreakStart`, `BreakEnd`, `Status`, `Custom`. |
| Perfiles | `/api/v1/Profile/List` | 200 | 9 perfiles. Campos: `ProfileId`, `ProfileName`, `IsCommon`. |
| Cargos | `/api/v1/Position/List` | 200 | 17 cargos. Campos: `Identifier`, `PositionDescription`, `Critical`, `PositionState`. |
| Grupos | `/api/v1/Group/List` | 200 | 41 grupos. Campo observado: `Description`. |
| Tipos de permiso | `/api/v1/TimeOff/GetTypes` | 200 | 26 tipos. Incluye estado, si es pagable, parcial y duracion. |
| Motivos de horas extra | `/api/v1/OverTime/GetReasons` | 200 | Endpoint disponible; lista vacia en la validacion. |
| Libro de asistencia | `/api/v1/AttendanceBook` | 200 | Primera sincronizacion operativa: 142 empleados procesados y almacenados para el periodo 2026-09-10 a 2026-09-16. |
| Marcas | `/api/v1/Punch/ListByUsersDates` | 200 | Primera sincronizacion operativa: 1,233 marcas almacenadas. Las coordenadas `Longitude`, `Latitude` y `Accuracy` se eliminan antes de persistir. |
| Permisos | `/api/v1/TimeOff/Get` | 200 | Primera sincronizacion operativa: 28 permisos almacenados. Campos reales observados: `Id`, `UserIdentifier`, `Starts`, `Ends`, `StartTime`, `EndTime`, `TimeOffTypeId`, `TimeOffTypeDescription`, `AmountHours`, `TimeOffOrigin` y `Description` cuando aplica. |
| Horas extra | `/api/v1/OverTime/GetOvertime` | 200 | Primera sincronizacion operativa: 207 registros almacenados. Campos: `Date`, `UserIdentifier`, `ShiftExternalId`, `ExtraTimeBefore`, `ExtraTimeAfter`, `ApprovedOvertimeBefore`, `ApprovedOvertimeAfter`. |

## Resultado de la primera sincronizacion integral

La ejecucion con `mode: all` y `days: 7` completo correctamente el periodo `20260910000000` a `20260916235959`:

- 21 turnos.
- 9 perfiles.
- 17 cargos.
- 41 grupos.
- 26 tipos de permiso.
- 142 registros agregados de asistencia.
- 1,233 marcas.
- 28 permisos/licencias.
- 207 registros de horas extra.

La base contiene 218 empleados vinculados a GeoVictoria, de los cuales 147 estan activos. En la primera ventana de siete dias se observaron marcas para 139 empleados y asistencia agregada para 142.

## Formatos importantes

Los endpoints operativos usan fechas en formato `yyyyMMddHHmmss`.

Ejemplo:

```json
{
  "StartDate": "20260910000000",
  "EndDate": "20260916235959"
}
```

`TimeOff/Get` devuelve las fechas efectivas del permiso en `Starts` y `Ends`. La sincronizacion las normaliza a `start_at` y `end_at`. Los 28 registros de la primera carga quedaron con ambas fechas parseadas y descripcion de tipo de permiso completa.

## Estrategia de almacenamiento

No se debe copiar ciegamente toda la API a tablas publicas. La estrategia es:

1. Mantener GeoVictoria como fuente de verdad.
2. Sincronizar a Supabase solo los datos necesarios para el producto.
3. Proteger asistencia, marcas, permisos y horas extra con RLS por empleado y jerarquia de gestion.
4. Exponer al frontend solo la informacion que corresponda al usuario autenticado.
5. No almacenar coordenadas de marcas mientras no exista una necesidad funcional explicita.

## Casos de uso prioritarios

- Dashboard diario de asistencia.
- Tardanzas y ausencias.
- Horas trabajadas y horas extra.
- Cobertura de departamentos antes de aprobar vacaciones.
- Permisos/licencias junto con vacaciones.
- Turnos y estructura organizacional.
- Reportes agregados para RRHH y supervisores.

## Seguridad

- Nunca exponer `GEOVICTORIA_API_KEY`, `GEOVICTORIA_API_SECRET` ni `GEOVICTORIA_SYNC_SECRET` al navegador.
- Las funciones de sincronizacion se ejecutan del lado servidor.
- La Edge Function acepta el secreto de sincronizacion o una sesion Supabase de un empleado activo con rol `hr` o `admin`.
- Las coordenadas de marcas se descartan antes de persistir y se verifico que no quedaron almacenadas en `raw_data`.
