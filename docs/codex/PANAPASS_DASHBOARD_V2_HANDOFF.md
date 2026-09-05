# Handoff corto para Codex - Panapass Dashboard V2

## Estado ya integrado

El Dashboard V2 ya esta conectado como PREVIEW en `architecture-v2-panapass-pilot`.

No vuelvas a integrar loader, style-manager ni boundary salvo que una prueba falle.
No reanalices el repositorio completo.

Preview:

`?panapassDashboardV2=1`

Sin ese parametro el dashboard legacy sigue siendo el activo. El flag es OFF por defecto.

Cuando el flag esta ON:
- el loader carga `modules/panapass/dashboard-v2/*` en lugar de `dashboard/index.js + experience-v2.js + ops-v3.js + date-window-v4.js`;
- style-manager carga CSS V2 namespaced en lugar del CSS de esas capas legacy;
- `modules/panapass/index.js` abre primero el shell Panapass existente y despues reemplaza `#view` con una sola vista V2 canonica;
- si el montaje V2 falla antes del reemplazo, se conserva la vista legacy como fallback.

## Contrato funcional cerrado

- `ADMIN_TOTAL`: toda la empresa.
- `ADMIN` / `GERENTE_GALERA`: su galera + comparacion agregada pequena con empresa/otras galeras; sin acceso operativo externo.
- `SUPERVISORA`: sus unidades + companeras de galera + posicion global; sin acceso a unidades ajenas.
- Comparar NO significa tener acceso.

## Lee SOLO esto

1. `docs/PANAPASS_DASHBOARD_V2_SPEC.md`
2. `docs/PANAPASS_DASHBOARD_V2_BACKEND_GAPS.md`
3. `modules/panapass/dashboard-v2/`
4. `css/panapass/dashboard-v2/`
5. `qa/panapass-dashboard-v2-contract.mjs`

No explores GPS, Revisados, Usuarios ni Control Auto.

## Tu trabajo ahora

1. Ejecuta QA, sin redisenar arquitectura:

```bash
node --check modules/v171-loader.js
node --check modules/core/style-manager.js
node --check modules/panapass/index.js
node --check modules/panapass/dashboard-v2/role-policy.js
node --check modules/panapass/dashboard-v2/data.js
node --check modules/panapass/dashboard-v2/view-model.js
node --check modules/panapass/dashboard-v2/components/common.js
node --check modules/panapass/dashboard-v2/views/admin-total.js
node --check modules/panapass/dashboard-v2/views/galera.js
node --check modules/panapass/dashboard-v2/views/supervisora.js
node --check modules/panapass/dashboard-v2/index.js
node qa/panapass-dashboard-v2-contract.mjs
node qa/architecture-v2-contracts.mjs
node qa/v171-ranking-contract.js
```

2. Abre el preview con `?panapassDashboardV2=1` y prueba sesion real de:
- ADMIN_TOTAL;
- ADMIN o GERENTE_GALERA;
- SUPERVISORA.

3. Corrige SOLO diferencias visuales/funcionales encontradas contra `PANAPASS_DASHBOARD_V2_SPEC.md` y las 3 propuestas aprobadas.

4. Verifica KPI -> detalle y que ningun rol abra informacion fuera de su alcance.

## Backend pendiente deliberadamente

NO apliques SQL automaticamente.

Admin/Gerente necesita el comparativo agregado de otras galeras. El borrador esta en:

`docs/sql/panapass_dashboard_company_compare_v2.sql`

Si ese RPC no existe, la vista debe seguir funcionando y mostrar el bloque de comparacion como no disponible. No uses datos globales operativos para simularlo.

## No hacer

- No tocar `main`.
- No force push.
- No borrar legacy todavia.
- No crear parches `fix/hotfix/final-vX`.
- No volver a transformar DOM legacy.
- No tocar GPS, Revisados, Usuarios ni Control Auto.

## Entrega

Devuelve solamente:
- `[VERIFICADO]` o `[BLOQUEADO]`;
- QA PASS/FAIL;
- diferencias corregidas;
- resultado visual por rol;
- si el RPC agregado sigue pendiente;
- commit final.
