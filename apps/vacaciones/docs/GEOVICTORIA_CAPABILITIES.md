# Capacidades verificadas de GeoVictoria

Fecha de validacion: 2026-09-16.

La integracion se valido contra `https://customerapi.geovictoria.com` usando la Edge Function `geovictoria-explorer` y credenciales almacenadas como secretos de Supabase.

## Modulos verificados

| Modulo | Endpoint | Estado | Observaciones |
| --- | --- | --- | --- |
| Turnos | `/api/v1/Shift/List` | 200 | 21 turnos. Campos observados: `Id`, `StartTime`, `MaxStartTime`, `ExitTime`, `Type`, `FixedShiftHours`, `ShiftDisplay`, `BreakMinutes`, `BreakStart`, `BreakEnd`, `Status`, `Custom`. |
| Perfiles | `/api/v1/Profile/List` | 200 | 9 perfiles. Campos: `ProfileId`, `ProfileName`, `IsCommon`. |
| Cargos | `/api/v1/Position/List` | 200 | 17 cargos. Campos: `Identifier`, `PositionDescription`, `Critical`, `PositionState`. |
| Grupos | `/api/v1/Group/List` | 200 | 41 grupos. Campo observado: `Description`. |
| Tipos de permiso | `/api/v1/TimeOff/GetTypes` | 200 | 26 tipos. Incluye estado, si es pagable, parcial y duracion. |
| Motivos de horas extra | `/api/v1/OverTime/GetReasons` | 200 | Endpoint disponible; lista vacia en la validacion. |
| Libro de asistencia | `/api/v1/AttendanceBook` | 200 | Incluye horas trabajadas, dias trabajados/no trabajados, ausencias, vacaciones, permisos con/sin pago y detalle planificado. |
| Marcas | `/api/v1/Punch/ListByUsersDates` | 200 | Incluye fecha, origen, tipo de marca, usuario, grupo y, cuando existe, longitud/latitud/precision. |
| Permisos | `/api/v1/TimeOff/Get` | 200 | Endpoint disponible; sin registros para el periodo probado. |
| Horas extra | `/api/v1/OverTime/GetOvertime` | 200 | Validado con tres empleados. Campos: `Date`, `UserIdentifier`, `ShiftExternalId`, `ExtraTimeBefore`, `ExtraTimeAfter`, `ApprovedOvertimeBefore`, `ApprovedOvertimeAfter`. |

## Formato importante

`OverTime/GetOvertime` requiere `StartDate` y `EndDate` con formato `yyyyMMddHHmmss`.

Ejemplo:

```json
{
  "StartDate": "20260910000000",
  "EndDate": "20260916235959"
}
```

## Estrategia de almacenamiento

No se debe copiar ciegamente toda la API a tablas publicas. La estrategia recomendada es:

1. Mantener GeoVictoria como fuente de verdad.
2. Sincronizar a Supabase solo los datos necesarios para el producto.
3. Guardar datos sensibles de asistencia y geolocalizacion en tablas internas con acceso restringido.
4. Exponer al frontend solo vistas/RPC o tablas con RLS especifica para cada rol.
5. Evitar almacenar coordenadas de marcas si no existe una necesidad funcional definida.

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
- Las funciones de sincronizacion deben ejecutarse del lado servidor.
- Las coordenadas de marcas son datos sensibles y deben tratarse con controles mas estrictos que los datos agregados de asistencia.
