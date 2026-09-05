# Panapass Dashboard V2 - especificacion canonica

Estado: preparado, NO activado.
Rama: `architecture-v2-panapass-pilot`.
Baseline funcional verificado antes de este trabajo: `6322c17` (`fix(panapass): align supervisor rankings`).

## Objetivo

Reemplazar progresivamente el dashboard Panapass basado en render + transformaciones DOM por una sola vista canonica basada en:

`datos -> politica de rol -> view model -> vista -> componentes`

No se permite seguir agregando parches visuales, buscar tarjetas por texto, transformar DOM ya renderizado ni inyectar CSS desde JavaScript.

## Contrato de roles aprobado

### ADMIN_TOTAL

Alcance: empresa completa.

Puede ver y abrir:
- KPIs globales;
- las cuatro galeras;
- negativos, pagos, montos, recurrentes, bajas y Sin Panapass;
- tendencias;
- comparacion y ranking de galeras;
- ranking completo de supervisoras;
- mejor/peor galera y mejor/mayor incidencia de supervisora;
- detalles y reportes de cualquier galera y supervisora.

Vista aprobada: ejecutiva + operativa + analitica en una sola pantalla, sin saturar el primer viewport.

### ADMIN / GERENTE_GALERA

Alcance: su galera o galeras asignadas.

Puede ver y abrir:
- KPIs de su propia galera;
- negativos, pagos, montos, recurrentes, bajas y Sin Panapass de su alcance;
- ranking de supervisoras de su galera;
- tendencias de su galera;
- acciones operativas de su galera.

Puede COMPARAR de forma resumida con otras galeras, pero NO abrir ni administrar detalles operativos de galeras ajenas.

La comparacion externa debe ser solo agregada: posicion, promedio empresa y diferencia. Comparar no significa tener acceso.

### SUPERVISORA

Alcance: sus unidades.

Puede ver y abrir:
- sus unidades activas;
- sus negativos;
- pagos y monto de sus unidades;
- recurrentes;
- bajas y Sin Panapass;
- incidencias que requieren su atencion;
- su tendencia personal.

Puede comparar:
- contra sus companeras de la misma galera;
- su posicion global dentro de la empresa.

No puede abrir ni administrar unidades de otra supervisora. El ranking global es una herramienta de comparacion, no una ampliacion de permisos.

## Regla de seguridad principal

`ver comparacion != abrir detalle`

La UI nunca debe usar datos recibidos de un RPC mas amplio para habilitar acciones que el rol no posee.

## Vista 1 - Admin Total

Orden visual aprobado:

1. Header
   - PANAPASS;
   - fase AM/PM;
   - `Dashboard Panapass`;
   - fecha y estado de actualizacion;
   - boton Actualizar;
   - etiqueta `Vista: Admin Total`.

2. KPIs globales compactos
   - Unidades activas;
   - Negativos hoy;
   - Requirieron pago;
   - Monto pagado hoy;
   - Sin Panapass;
   - Bajas Panapass.

3. Rendimiento destacado
   - Mejor galera;
   - Mayor incidencia de galera;
   - Mejor supervisora;
   - Supervisora con mayor incidencia.

4. Pendientes prioritarios
   - Sin Panapass;
   - bajas;
   - recurrentes/pendientes relevantes;
   - acciones directas.

5. Resumen por galera
   - VCARS, VCOMP, VIPCO, VINDU;
   - unidades;
   - negativos;
   - requirieron pago;
   - monto;
   - tendencia 7 dias;
   - promedio;
   - accion `Ver galera`.

6. Ranking de supervisoras - empresa
   - posicion;
   - supervisora;
   - galera;
   - unidades pagadas;
   - monto;
   - posicion global;
   - tendencia cuando exista;
   - buscar/exportar se puede agregar al activar V2.

## Vista 2 - Admin / Gerente de galera

1. Header
   - `Dashboard de galera`;
   - galera actual;
   - fecha;
   - Actualizar.

2. KPIs de la galera
   - Unidades activas;
   - Negativos hoy;
   - Requirieron pago;
   - Sin Panapass;
   - Bajas Panapass;
   - Monto pagado hoy.

3. Requieren atencion hoy
   - negativos;
   - Sin Panapass;
   - bajas;
   - recurrentes/pendientes.

4. Supervisoras de la galera
   - ranking local completo;
   - unidades pagadas;
   - monto;
   - posicion.

5. Resumen de la galera
   - tendencia 7 dias;
   - total/promedio;
   - contexto.

6. Comparativo con empresa
   - posicion de la galera;
   - promedio de empresa;
   - diferencia porcentual o absoluta;
   - SIN enlaces a detalles de otras galeras.

7. Acciones rapidas
   - Negativos;
   - Pagos;
   - Bajas;
   - Recurrentes.

## Vista 3 - Supervisora

1. Header personal
   - `Mi Dashboard Panapass`;
   - nombre;
   - galera;
   - fecha;
   - Actualizar.

2. Resumen personal
   - posicion en galera;
   - posicion global;
   - unidades activas;
   - monto pagado hoy.

3. KPIs personales
   - Mis negativos;
   - Requirieron pago;
   - Recurrentes;
   - Sin Panapass;
   - Bajas/Pendientes.

4. Requiere atencion
   - solo sus unidades.

5. Mi ranking en la galera
   - companeras de su galera;
   - marcar `Tu` en su fila;
   - no habilitar apertura de unidades ajenas.

6. Empresa
   - mostrar posicion global y total;
   - comparacion resumida;
   - no mostrar operacion de otras supervisoras.

7. Tendencia personal 7 dias.

8. Comparacion vs promedio de galera.

## AM / PM

La estructura no cambia por fase. Cambia el contenido/prioridad:

- AM: prioridad a negativos e incidencias por resolver.
- PM: prioridad a pagos y rendimiento.

No se debe reconstruir el DOM con una segunda capa. La fase es un dato del view model.

## Arquitectura preparada

`modules/panapass/dashboard-v2/`
- `role-policy.js`: alcance y permisos;
- `data.js`: lectura de APIs/RPCs;
- `view-model.js`: normalizacion y calculos;
- `components/common.js`: componentes HTML puros;
- `views/admin-total.js`;
- `views/galera.js`;
- `views/supervisora.js`;
- `index.js`: orquestador V2, desactivado por defecto.

CSS separado y namespaced en `css/panapass/dashboard-v2/`.

## No negociable al activar

- No borrar legacy en el mismo commit que activa V2.
- Activar V2 detras de flag/switch temporal.
- Validar los tres roles con sesion real.
- Confirmar que cada KPI coincide con su vista detalle.
- Solo despues retirar `experience-v2.js`, transformaciones de `ops-v3.js` y CSS legacy que queden sin propietario.
