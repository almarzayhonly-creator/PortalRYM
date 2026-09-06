# Inventario reutilizable de Panapass V2

Este inventario documenta piezas V171 y trabajo previo detectado en el árbol modular. No integra código ni cambia la vista legacy.

| Área | Piezas reutilizables | Nota |
| --- | --- | --- |
| Role-policy | `modules/panapass/ranking/index.js` | `ADMIN_ROLES`, contexto de perfil y selección inicial de galera. Validar contra la política vigente antes de reutilizar. |
| Data | Ranking, recurrentes y bajas | Adaptadores `canonicalRow`, normalización y validación de datos antes de renderizar. |
| View-model | Ranking, recurrentes y bajas | `normalizeDataset`, filtros, resúmenes, paginación y estados derivados son candidatos para una futura capa de view-model. |
| Components | Ranking, recurrentes, bajas, ENA/PDF | Renderizadores y contratos de la UI modular pueden reutilizarse sin tocar la vista actual. |
| Vistas por rol | Ranking | El ranking ya concentra comprobaciones de rol; no copiar sin contrastar los permisos de producción. |
| CSS limpio | `css/panapass.css`, `css/panapass-bajas.css` | Contienen clases V171 específicas (`.v171-*`) y ahora se cargan por entradas de dominio. |
| QA reutilizable | `qa/v171-*-contract.js`, `qa/v171-module-smoke.js` | Útiles como contratos de datos y carga; requieren Node y, para smoke, una URL accesible. |

## No traer como base de V2

- Los bloques históricos inline de `index.html`, incluidos overrides por build, porque mezclan dominios y no tienen ownership claro.
- Scripts de `modules/core/` con nombres de `clickfix`, `owner-lock` o `final`: son correcciones históricas, no una capa V2 reutilizable.
- Cualquier trabajo de ramas previas debe compararse por pieza y someterse a QA antes de integrarse.
