# Revisados en las ramas Vue anteriores

- `sandbox/panapass-v2` (`280e8f6`; Vue restaurado en `590a74e`): contiene vistas Vue utilizables para resumen, filtros, tabla y comparación por galera, más `useRevisados` y un servicio/bridge que integra sesión y prefetch legacy. El bridge también enlaza operaciones (incidencias, eCarCheck, boletas y correo diario); por eso es **REQUIERE ADAPTACIÓN**, no una sustitución directa. Antes de reutilizarlo hay que cotejar cada endpoint, permisos, estado y acción con MAIN y sus pruebas. No se copia al piloto.
- Origen visible en el historial: `3920426` añade el prototipo visual, `dbd9d91` pone Mission Control como entrada Vue, `9b4597b` aísla una entrada adicional y `590a74e` restaura el límite dedicado de la app. Estos commits son evidencia del desarrollo incremental; no prueban paridad funcional.
- Lo potencialmente distinto son el flujo de tabla/filtros y las acciones enlazadas por el bridge; que una acción exista en sandbox no demuestra que MAIN carezca de ella. Incidencias, eCarCheck manual/sync, Boletas V2 y correo son **NO VERIFICADO** como diferencia o equivalencia porque la suite actual no ejecuta esos flujos de sandbox y aquí no se dispararon.
- `sandbox/revisados-ui-v2` (`d650a7c`): añade 608 líneas de CSS limitado a `body.v66-revisados`; **REUTILIZABLE** solo por partes visuales después de comprobar contraste y estilos actuales. No incorpora lógica Vue ni de negocio.
- `sandbox/validator-tablet-app` (`7377d99`): el código de la app de Validador coincide con MAIN; sus cambios alrededor del Worker/configuración de rutas alteran el comportamiento dedicado y caché, por lo que esa configuración es **RIESGOSA** para migrar junto con una UI.

La suite de MAIN `qa/project-loading.js --regressions` cubre navegación tardía, 503 con recuperación y resultado vacío con filtros/observer; no certifica los contratos de las operaciones especiales de Vue.

Decisión de esta fase: Revisados queda en su implementación MAIN. No se recuperan operaciones, llamadas ni reglas de negocio de sandbox hasta comparar sus contratos de forma focalizada y sumar pruebas de paridad.
