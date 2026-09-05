# Panapass Dashboard V2 Clean

Rama: `panapass-dashboard-v2-clean`

Esta rama nace directamente desde `main`. No contiene el historial de la rama laboratorio `architecture-v2-panapass-pilot`.

## Regla de producto

- `main` es produccion y no se modifica sin aprobacion explicita del usuario.
- Esta rama contiene un Dashboard Panapass nuevo y paralelo.
- El dashboard clean NO llama `v70OpenPanapass`, NO transforma DOM legacy y NO depende de `experience-v2`, `ops-v3`, `proposal2` ni archivos patch/fix del dashboard anterior.
- El unico contacto con globals historicos (`state` y `rpc`) esta confinado a `runtime.js`, como adaptador de frontera mientras el backend/portal principal conserva sus APIs actuales.

## Flujo

`RPCs existentes -> data.js -> role-policy.js -> view-model.js -> vista del rol -> componentes`

## Roles

- ADMIN_TOTAL: empresa completa.
- ADMIN / GERENTE_GALERA: su galera + comparacion agregada con empresa cuando el RPC correspondiente exista.
- SUPERVISORA: sus unidades + ranking de su galera + su posicion global, sin acceso operativo a unidades ajenas.

## Preview

El workflow `Panapass Dashboard V2 Clean preview` inyecta el loader solo en el build aislado de Cloudflare.

Activacion de preview:

`?panapassClean=1`

El flag se conserva en `sessionStorage` durante el login. `?panapassClean=0` lo desactiva.

## Backend pendiente

El comparativo agregado para ADMIN/GERENTE usa opcionalmente `panapass_dashboard_company_compare_v2`. Si ese RPC no existe, la vista sigue funcionando y muestra el comparativo como pendiente; nunca usa detalle operativo de otras galeras para simularlo.

## Paso a produccion

No se hace automaticamente. Primero se valida visual y funcionalmente esta rama. Solo despues de una aprobacion explicita se prepara un cambio pequeno y revisable hacia `main`.
