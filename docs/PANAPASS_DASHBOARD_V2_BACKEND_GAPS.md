# Panapass Dashboard V2 - mapa backend verificado

Revision realizada contra el proyecto Supabase `Panapass` (`avczyvcpmicpuhdkmxzx`). No se aplicaron cambios a la base.

## Seguridad existente

`private.visible_units()` ya aplica alcance por rol:
- `ADMIN_TOTAL`, `SISTEMA`, `PAGADOR`: todas las unidades;
- `ADMIN`, `GERENTE_GALERA`: unidades de `galeras_scope`;
- `SUPERVISORA`: unidades de su `supervisora_id`/asignaciones.

`private.current_galeras_scope()` devuelve las galeras autorizadas del perfil.

Esto significa que el Dashboard V2 debe confiar en el backend para DATOS OPERATIVOS y no ampliar alcance desde frontend.

## RPCs existentes que ya sirven

### `dashboard_resumen()`
Devuelve resumen del alcance visible: unidades, negativos, pagos, recurrentes, etc.

### `panapass_control_auto_resumen()`
Devuelve estado de unidades del alcance visible.

### `panapass_bajas_centro_v7()`
Devuelve bajas/alertas del alcance visible.

### `panapass_dashboard_galeras()`
Devuelve agregados por galera, pero usa `visible_units()`.
Consecuencia: Admin/Gerente solo reciben sus galeras; no permite por si solo el pequeno comparativo contra las otras.

### `panapass_dashboard_pagos_7d()`
Devuelve pagos de 7 dias del alcance visible.

### `panapass_ranking_pagos('DIA'|'MES')`
Devuelve ranking con `posicion_galera`, `total_galera`, `posicion_global`, `total_global`.

Observacion importante de seguridad/UX:
- `ADMIN_TOTAL`: recibe ranking global completo;
- `GERENTE_GALERA`: la funcion actual permite ranking global completo;
- `ADMIN`: normalmente queda limitado por `current_galeras_scope()`;
- `SUPERVISORA`: recibe filas de su galera, pero cada fila conserva posicion global.

El Dashboard V2 NO debe mostrar a Gerente informacion global operativa solo porque el RPC actual la entrega. `view-model.js` filtra de nuevo a su galera para la vista local.

## Gap 1 - comparativo agregado para Admin/Gerente

Requisito aprobado: Admin/Gerente ve su galera y una pequena comparacion con las otras sin poder abrirlas.

El RPC actual de galeras no entrega otras galeras por seguridad de `visible_units()`.

Solucion recomendada: RPC nuevo que entregue SOLO agregados por galera para roles `ADMIN_TOTAL`, `ADMIN`, `GERENTE_GALERA`:
- galera;
- unidades activas;
- negativos;
- unidades que requirieron pago;
- monto pagado;
- posicion de galera;
- promedio empresa.

No debe devolver unidad_id, placa, supervisora_id ni datos accionables.

Se deja un borrador seguro en `docs/sql/panapass_dashboard_company_compare_v2.sql`. NO esta aplicado.

## Gap 2 - comparacion global de Supervisora

Con el RPC actual una supervisora ya puede conocer:
- su ranking dentro de la galera;
- su `posicion_global` y `total_global`;
- las posiciones globales de las companeras de su galera.

Esto cubre el primer alcance aprobado sin exponer unidades de otras supervisoras.

Si posteriormente se desea mostrar nombres de companeras globales fuera de su galera, crear un RPC dedicado de comparacion que devuelva solo ranking/nombre/galera y nunca unidades o acciones. No duplicar en frontend la formula del ranking oficial.

## Regla para Codex

No volver a explorar todo Supabase para esta tarea. Usar este mapa primero. Solo investigar si una prueba real contradice alguno de estos contratos.
