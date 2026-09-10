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
