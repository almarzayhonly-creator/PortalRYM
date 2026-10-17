# Portal RYM Vue Next · piloto Inicio

Vista opt-in mediante `?vueNext=1`; el portal normal conserva su renderer. Ejecutar `npm ci` y `npm run build` en esta carpeta antes de probar la vista.

- `src/bridge.ts` recibe el resumen autenticado del renderer de MAIN y delega las aperturas a sus rutas existentes. No crea otra sesión ni hace consultas paralelas.
- `src/dashboard.ts` modela sesión, permisos visibles, loading/ready/stale/error y los KPI del contrato `portal-home-resumen`. La caché y cancelación siguen en los mecanismos existentes de MAIN (`rymProjectRead` y resumen por sesión).
- `src/views/HomeView.vue` y `src/style.css` implementan el shell responsive y la primera vista Inicio.
- `../qa/home-executive.mjs --vue-next` valida paridad KPI, roles, carga lenta, vacío válido, error/reintento, navegación y anchos móviles.

Límite de esta fase: no se han migrado el validador rápido del Inicio ni los KPI secundarios de GPS/control que MAIN carga por separado. Permanecen en MAIN hasta un piloto posterior; no se presentan como portados.
