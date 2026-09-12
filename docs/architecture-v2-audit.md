# Architecture V2 - Fase 1 audit

Fecha: 2026-09-10
Rama: codex/architecture-v2-phase1 (base: sandbox/panapass-v2).
Alcance: inventario, fronteras de core/legacy y aislamiento existente; sin cambios de datos, permisos, RPC ni visuales.

## Estado actual

| Área | Estado | Frontera actual |
|---|---|---|
| Shell, login, navegación y sesión | Legacy | index.html conserva state, login, shell y render. |
| Core V2 | Modular | Registro, estilos, eventos, contexto, bridge y bootstrap en modules/core/. |
| Panapass operativo | Híbrido | Módulo V2 delega al bridge legacy; dashboard legacy y Dashboard V2 permanecen separados. |
| GPS, Revisados, Control Auto, Usuarios | Híbrido | Módulos registrados, con entradas legacy encapsulables en el bridge. |
| eCarCheck | Legacy | Dependencias y comportamiento siguen en index.html. |
| CSS | Parcialmente aislado | style-manager.js activa estilos por dominio; el shell conserva estilos inline globales. |

## Inventario de index.html

- Tamaño: 1,568,385 bytes.
- Bloques inline: 89 etiquetas style, 74 etiquetas script.
- Shell global: token/sesión, login, sidebar, shell() y render() histórico.
- Dominios mezclados: Panapass, GPS, Revisados, Usuarios, Control Auto, eCarCheck, cupos y utilidades históricas.
- Legacy imprescindible: autenticación por usuario, estado de sesión, navegación y funciones canónicas v*.

No se mueve código desde el HTML durante Fase 1: extraerlo sin pruebas de regresión por dominio sería alto riesgo.

## Mapa de dependencias

    index.html (shell/session/legacy)
      ↓
    v171-loader
      ↓
    core: registry + styles + events + context
      ↓
    legacy-route-bridge
      ↓
    bootstrap
      ↓
    module boundary (Panapass/GPS/Revisados/...)
      ↓
    canonical legacy renderer mientras continúa la migración

## Panapass y dashboards

- Legacy dashboard: modules/panapass/dashboard/ y CSS panapass-proposal2*, ops-v3* y date-window-v4.
- Dashboard V2: modules/panapass/dashboard-v2/ y CSS css/panapass/dashboard-v2/.
- El flag RYM_PANAPASS_DASHBOARD_V2_ENABLED selecciona uno u otro. Ninguno fue eliminado.
- modules/panapass/index.js no introduce nuevas llamadas globales: usa RYM_LEGACY_ROUTES.open('panapass').

## Riesgos

| Nivel | Riesgo | Mitigación en Fase 2 |
|---|---|---|
| Alto | index.html concentra shell, sesión y módulos históricos. | Extraer solo bloques con contrato y smoke test por módulo. |
| Alto | Contexto V2 lee estado disponible en runtime legacy; no debe inferir permisos del DOM. | Crear adaptador de sesión desde el shell antes de activar Dashboard V2 canónico. |
| Medio | Algunos módulos aún llaman globals v* directamente. | Migrar un módulo por vez hacia RYM_LEGACY_ROUTES.open(). |
| Medio | CSS inline global puede competir con módulos. | Mover reglas de bajo riesgo por namespace, con navegación cruzada de prueba. |
| Bajo | Bootstrap nuevo solo coordina servicios existentes. | Mantenerlo sin lógica de negocio. |

## Plan de Fase 2

1. Publicar un adaptador de sesión/perfil desde el shell para que permisos V2 no dependan del DOM.
2. Migrar el renderer de Panapass Dashboard detrás del flag, conservando el legacy como fallback.
3. Extraer CSS del dashboard únicamente a css/panapass/dashboard/ y validar navegación cruzada.
4. Repetir el patrón para Ranking, Pagos y Negativos antes de tocar GPS o Revisados.

## Validación funcional Fase 1 (2026-09-10)

Preview probado: https://architecture-v2-phase1-portal-ena-rym.almarzayhonly.workers.dev/?phase1=9e56f65

Perfil probado: ADMIN_TOTAL (Yhonly Almarza).

| Paso | Resultado | Evidencia |
|---|---|---|
| Portal -> Panapass | PASS | Dashboard Panapass cargó con datos y sidebar Panapass. |
| Panapass -> Portal -> GPS | PASS | GPS Centro de Control cargó; sesión y perfil se conservaron. |
| GPS -> Portal -> Panapass | PASS | Panapass volvió a cargar; los enlaces CSS de GPS quedaron disabled y los de Panapass activos. |
| Portal -> Usuarios | BLOCKED | El shell actual no expone una ruta UI de Usuarios en este perfil. |
| Portal -> Revisados | FAIL | El botón Gestionar revisados no cambió de vista en el preview. |
| Portal -> Control Auto | FAIL | El botón Ver flota no cambió de vista en el preview. |
| Roles ADMIN/GERENTE_GALERA/SUPERVISORA | BLOCKED | No se proporcionaron sesiones de esos roles; no se crearon usuarios ni se alteró Auth. |

Consola: sin errores o warnings nuevos relacionados con RYM_MODULES, RYM_STYLES, RYM_CONTEXT, RYM_LEGACY_ROUTES, bootstrap, recursos CSS o módulos faltantes.

Contaminación CSS observada: no se detectó CSS GPS activo al regresar a Panapass. El atributo body data-rym-module permaneció como panapass al volver al portal; los estilos Panapass sí quedaron disabled. Es un residuo de estado legacy de riesgo medio, no corregido para no modificar el shell funcional durante Fase 1.

Conclusión inicial: bloqueos pendientes de clasificación antes de decidir integración.

## Cierre de bloqueos Fase 1 (2026-09-10)

### Comparación con sandbox/panapass-v2

- index.html no cambió entre sandbox/panapass-v2 y esta rama. Sus rutas legacy, botones y entrypoints son los mismos.
- Las únicas diferencias de routing en Fase 1 están en modules/core/: bootstrap, bridge y module-registry.
- No fue posible abrir una sesión autenticada independiente en el subdominio sandbox estable. La evidencia estática confirma que el supuesto FAIL no fue introducido por Fase 1.

### Causa raíz

| Hallazgo inicial | Causa raíz | Estado |
|---|---|---|
| Portal -> Revisados FAIL | El primer recorrido usó un botón de navegación heredada oculto. La ruta visible #v99Rev llama al entrypoint real v60OpenRevisados y abre Revisados. | PASS |
| Portal -> Control Auto FAIL | Mismo problema de selector inicial. La ruta visible #v99Control llama a v70OpenControl y abre Control Auto. | PASS |
| Usuarios BLOCKED | Existe modules/usuarios/index.js y v70OpenUsers; el entrypoint exige ADMIN_TOTAL y admin.usuarios. En el shell actual su control está oculto y no hay una ruta visible verificable. | N/A para esta validación |
| Estado body residual | module-registry no limpiaba data-rym-module en unmount y el bridge no identificaba el portal. | FIXED |

### Corrección de arquitectura

- modules/core/module-registry.js limpia data-rym-module al desmontar y lo actualiza solo después de abrir con éxito.
- modules/core/legacy-route-bridge.js limpia el módulo al volver al shell/portal.
- No se modificó index.html, datos, RPC, RLS, Auth, permisos ni lógica de negocio.

### Pruebas posteriores (ADMIN_TOTAL)

| Secuencia | Resultado |
|---|---|
| Portal -> Panapass -> Portal | PASS: atributo de módulo vacío en portal y CSS Panapass disabled. |
| Portal -> Control Auto -> Portal -> Panapass | PASS: CSS Control Auto disabled al salir, CSS Panapass activo al volver. |
| Portal -> Revisados | PASS: CSS Panapass disabled, CSS Revisados activo y dashboard visible. |
| Consola | PASS: sin errors/warnings nuevos de core, estilos, bridge o módulos. |
| Sesión entre módulos | PASS: perfil ADMIN_TOTAL se conservó en navegación SPA. |

Limitación legacy: el botón de retorno de Revisados (#v66Back) está oculto en el shell observado. No fue introducido por Fase 1 y no se alteró para evitar un cambio visual/funcional fuera de alcance.

Roles ADMIN, GERENTE_GALERA y SUPERVISORA: BLOCKED por falta de sesiones disponibles. Requisito de QA antes de promover a producción, pero no bloquea la integración al sandbox estable.

Archivos modificados en este cierre:

- modules/core/module-registry.js
- modules/core/legacy-route-bridge.js
- .github/workflows/architecture-v2-phase1-preview.yml
- docs/architecture-v2-audit.md

main permanece intacto. Conclusión: READY TO MERGE TO SANDBOX.

## Corrección de estado Revisados (2026-09-12)

- Causa raíz: scripts legacy de presentación pueden reasignar los entrypoints globales `v*` después de la instalación inicial del bridge. El botón visible de Revisados seguía abriendo su renderer, pero podía eludir `RYM_MODULES.open('revisados')`; por eso el DOM y el CSS podían quedar correctos sin actualizar el estado compartido.
- Corrección mínima: `modules/core/legacy-route-bridge.js` vuelve a instalar los adaptadores justo antes de navegación de interfaz (`pointerdown` o teclado). Conserva el entrypoint legacy canónico y enruta el clic por `RYM_MODULES.open(...)`.
- Alcance: sin cambios a Revisados, UI, lógica de negocio, Supabase, Auth, RPC, RLS ni consultas.
