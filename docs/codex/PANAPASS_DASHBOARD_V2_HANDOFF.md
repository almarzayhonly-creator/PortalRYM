# Handoff corto para Codex - Panapass Dashboard V2

## Objetivo

Ejecutar la integracion visual y QA del Dashboard Panapass V2 ya especificado, sin volver a analizar todo el repositorio.

## Lee SOLO esto primero

1. `docs/PANAPASS_DASHBOARD_V2_SPEC.md`
2. `docs/PANAPASS_DASHBOARD_V2_BACKEND_GAPS.md`
3. `modules/panapass/dashboard-v2/role-policy.js`
4. `modules/panapass/dashboard-v2/data.js`
5. `modules/panapass/dashboard-v2/view-model.js`
6. `modules/panapass/dashboard-v2/components/common.js`
7. `modules/panapass/dashboard-v2/views/*.js`
8. `modules/panapass/dashboard-v2/index.js`
9. `css/panapass/dashboard-v2/*.css`
10. `qa/panapass-dashboard-v2-contract.mjs`

No reanalices GPS, Revisados, Usuarios, Control Auto ni el repositorio completo.

## Ya esta decidido

- Admin Total: empresa completa.
- Admin/Gerente: su galera + comparacion agregada pequena con otras.
- Supervisora: sus unidades + ranking de su galera + posicion/comparacion global sin acceso a unidades ajenas.
- Comparar NO significa dar acceso.
- V2 no debe transformar el DOM del dashboard legacy.
- CSS V2 es externo y namespaced `.rym-pd2`.

## Trabajo que queda

### Paso 1 - validar scaffold

Ejecuta:

```bash
node --check modules/panapass/dashboard-v2/role-policy.js
node --check modules/panapass/dashboard-v2/data.js
node --check modules/panapass/dashboard-v2/view-model.js
node --check modules/panapass/dashboard-v2/components/common.js
node --check modules/panapass/dashboard-v2/views/admin-total.js
node --check modules/panapass/dashboard-v2/views/galera.js
node --check modules/panapass/dashboard-v2/views/supervisora.js
node --check modules/panapass/dashboard-v2/index.js
node qa/panapass-dashboard-v2-contract.mjs
```

Si falla algo del scaffold, corrige solo ese fallo.

### Paso 2 - completar/pulir HTML/CSS contra las 3 propuestas aprobadas

No redisenes desde cero. Conserva el lenguaje visual actual:
- sidebar azul oscuro existente;
- fondo claro;
- tarjetas redondeadas;
- KPIs azul/rojo-verde/naranja/morado;
- jerarquia y composicion de las propuestas aprobadas.

No uses JS para inyectar CSS.

### Paso 3 - integracion temporal

Solo cuando las vistas pasen QA estatico:
- agrega archivos V2 al loader en orden;
- registra CSS V2 en `style-manager.js` al final del dominio Panapass;
- activa V2 detras de flag temporal, por defecto OFF si no hay mecanismo de preview claro;
- NO elimines `dashboard/index.js`, `experience-v2.js`, `ops-v3.js` ni CSS legacy en este commit.

La integracion debe permitir volver al dashboard actual sin revertir codigo.

### Paso 4 - backend opcional

NO apliques SQL automaticamente.

El comparativo de otras galeras para Admin/Gerente requiere el RPC agregado descrito en `docs/PANAPASS_DASHBOARD_V2_BACKEND_GAPS.md`.
Hay un borrador en `docs/sql/panapass_dashboard_company_compare_v2.sql`.

Si el RPC no existe, muestra el resto de la vista y deja ese bloque como no disponible; no uses datos globales mas amplios para saltarte permisos.

### Paso 5 - QA

Ejecuta:

```bash
node qa/panapass-dashboard-v2-contract.mjs
node qa/architecture-v2-contracts.mjs
node qa/v171-ranking-contract.js
```

Luego prueba visual autenticada por rol:
- ADMIN_TOTAL;
- ADMIN o GERENTE_GALERA;
- SUPERVISORA.

Verifica KPI -> detalle y que ningun rol pueda abrir informacion fuera de alcance.

## Restricciones

- No tocar GPS, Revisados, Usuarios, Control Auto.
- No tocar `main`.
- No force push.
- No crear `*-fix.css`, `*-patch.js`, `final-vX` ni capas de parche.
- No renombrar clases legacy para arreglar V2.
- No borrar legacy hasta despues del QA visual real.

## Entrega esperada

Una sola respuesta corta:
- `[VERIFICADO]` o `[BLOQUEADO]`;
- archivos modificados;
- pruebas PASS/FAIL;
- si V2 quedo OFF/preview/activo;
- riesgos restantes;
- commit y push a `architecture-v2-panapass-pilot`.
