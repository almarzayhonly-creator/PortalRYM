# Portal RYM — auditoría integral de rendimiento y estabilidad

Fecha: 2026-10-17  
HEAD local auditado: `c3dc71780cd5bb8cae4629f16156edc821b21e3f`  
`origin/main` (ref local consultado): `c3dc71780cd5bb8cae4629f16156edc821b21e3f`  
Alcance: lectura de producción sin sesión; pruebas locales aisladas con mocks. Sin cambios de aplicación ni llamadas de escritura.

## A. Inventario y cobertura

Se identificaron 7 familias: Dashboard principal, Panapass, Revisados, Control de Auto, GPS, Validador de Unidad y Usuarios/permisos. Los submenús del código incluyen hasta 11 vistas Panapass (incluida Bajas), 8 vistas Revisados sujetas a permisos, 5 de Control de Auto y 5 de GPS. El Validador es una vista con búsqueda/modal y fuentes independientes; Usuarios se habilita por permiso.

La cobertura de esta corrida fue parcial: los fixtures probaron las 4 entradas de módulo Panapass/Revisados/Control/GPS desde el dashboard, el flujo de Validador y contratos focalizados de pagos, ranking, recurrentes y Bajas. La suite de regresiones de carga cubrió 6 escenarios de navegación/errores/caché. No se probaron todas las subpestañas con una sesión de producción autenticada; no había credenciales de prueba disponibles.

## B. Rendimiento medido

| Entorno / flujo | Medición | Resultado |
|---|---|---|
| Producción, GET de entrada sin sesión, 3 cargas | DOM interactive | 6.819 s / 7.225 s / 0.638 s |
| Producción, mismas cargas | Evento Load | 19.616 s / 7.437 s / 1.227 s |
| Producción, recurso principal | HTML recibido | 200; ~1.56 MB de cuerpo; 12 recursos; 0 errores JS y 0 solicitudes fallidas observadas |
| QA local, mocks de pagos | layout / hoja lista / completa | 1 / 106 / 183 ms; 4 lecturas iniciales, 1 lectura al recargar |

Las cifras de producción corresponden a la página de acceso sin autenticación, no a sus módulos ni a tiempos de Supabase. La variación entre cargas está verificada; no se atribuye a una causa de red concreta. Las cifras de pagos son solo de mocks y no representan latencia del servidor.

## C. Número de consultas observado

- Dashboard Panapass: el código lanza `dashboard_resumen` y rankings diario/mensual en paralelo (3 RPC por carga; `index.html:798-804`). La vista espera a que terminen las tres promesas asentadas antes de pintar el cuerpo.
- Inicio del portal: la carga de sesión espera usuario, perfil y, en una `Promise.all`, permisos por rol, excepciones por usuario y `panapass_meta` (`index.html:777`). El metadato de Panapass es una dependencia no necesaria para decidir permisos, pero bloquea la creación del shell.
- Inicio con resumen: primero se dibuja desde caché/permisos y luego se consulta `portal-home-resumen` y se vuelve a renderizar (`index.html:7709-7727`). Hay llamadas adicionales de resumen Control/GPS en `index.html:6190-6213` y `8070-8071`; el conteo real por sesión autenticada no se pudo medir.
- QA de pagos: 4 lecturas iniciales, una al reload; recuperación, timeout/abort, coalescencia y navegación pasaron en entorno simulado.

## D. Errores reproducidos

No reaparecieron las tres regresiones ya corregidas. `qa/project-loading.js --regressions`: 6/6 PASS: navegación Panapass demorada 650 ms; HTTP 503 con y sin caché; navegación por permisos; resultado vacío y mutación DOM; filtro/reintento tras error.

La suite `qa/home-executive.mjs` pasó el caso ADMIN_TOTAL en 1440×900, incluida navegación por cuatro módulos y salida. Luego falló la comparación de acceso de SUPERVISORA contra su baseline: el actual incluye `rymUnitValidatorLauncher` y el baseline no. Es una expectativa desactualizada de la prueba; no se confirmó fallo funcional del portal.

Contratos `v171-ranking`, `v171-recurrentes`, `v171-bajas`, `validator-independent-boot` y `pagos-performance`: PASS. No se ejecutaron operaciones reales; las acciones del test de pagos están simuladas.

## E. Cinco cuellos de botella / causas principales

1. **VERIFICADO — Inicio acoplado a metadatos Panapass** (`index.html:777`). `shell()` y el primer render esperan también `panapass_meta`, aunque los permisos y el shell no dependen de ese dato. Recomendación: cargarlo en segundo plano con fallback, sin cambiar KPI.
2. **VERIFICADO como ruta; PROBABLE como causa del síntoma — Menú y dashboard cambian tras resolver el resumen** (`index.html:7710-7727`, `6221-6227`). Sin resumen reciente se muestra el menú según grants locales; la respuesta autoritativa sustituye la vista y actualiza los módulos/KPI. Esto puede explicar que Revisados o una prioridad aparezcan después; no se reprodujo el conteo exacto 2→3 en producción.
3. **VERIFICADO en código — KPI del dashboard Panapass esperan el resultado más lento** (`index.html:798-810`). Las consultas son concurrentes, pero se espera a las tres antes de mostrar el dashboard. Recomendación: separar render de resumen de rankings cuando el contrato visual permita estados parciales explícitos.
4. **VERIFICADO — Payload de arranque grande**: el HTML de producción sin sesión mide ~1.56 MB. Recomendación: revisar solo después de perfilar compresión y bytes transferidos; la medición disponible es del cuerpo y no demuestra bytes de red.
5. **PROBABLE — Lecturas de resumen GPS duplicables en Inicio** (`index.html:6211` y `8070`). Hay dos rutas de carga independientes del mismo servicio para poblar la tarjeta. Falta conteo autenticado para demostrar cuántas se ejecutan por sesión.

## F. Elementos revisados

- Navegación/inicio: `loadApp` (`index.html:777`), `stableHome` (`7704-7738`), renderizado del resumen (`renderHome139`, `7690`) y constructor de menú/tarjetas (`shellHome99`, `6221-6232`).
- Panapass: dashboard (`798-820`), contratos QA de ranking/recurrentes/Bajas y flujo de pagos.
- Revisados: menú condicionado por permisos (`3999`), refresh/error (`4007-4011`) y harness de navegación/caché/filtros.
- Control de Auto/GPS: resumen de Inicio (`6190-6213`, `8070-8071`) y navegación fixture.
- Validador/permisos: boot independiente, rol ADMIN_TOTAL; la paridad completa de roles quedó limitada por baseline divergente.

## G. Evidencia, plan mínimo y límites

No hay evidencia de una pérdida persistente de datos nueva. El patrón del Inicio es un render provisional seguido por actualización asíncrona; el número exacto de tarjetas necesita reproducción autenticada. La diferencia del baseline QA debe actualizarse solo si se aprueba trabajo de pruebas.

Prioridad propuesta: (1) quitar `panapass_meta` de la barrera de arranque, (2) estabilizar navegación/módulos del Inicio mientras se resuelve el resumen y actualizar KPI sin reconstruir accesos, (3) evitar una de las lecturas GPS redundantes y desacoplar el render de KPI del ranking lento, (4) medir transferencia comprimida antes de recortar el HTML. No se implementó ningún cambio.

## H. Pruebas no ejecutadas y riesgos

No se ejecutó barrido de todas las subpestañas en producción, prueba autenticada por cada rol, medición de latencias por endpoint ni comparación real de bytes comprimidos. El smoke de producción solo leyó la pantalla pública de acceso; no llamó endpoints operativos. La suite de paridad completa queda pendiente por baseline obsoleto. Por ello, causas de tiempos de módulos autenticados y del cambio exacto 2→3 quedan como hipótesis.

## I. Estado

**PARCIAL.** Regresiones de carga reproducidas en mocks y actualmente pasan; mediciones reales disponibles solo para la página pública de entrada. Los principales acoplamientos de carga están respaldados por el código, pero no se validaron con sesión autenticada de producción. No se modificó código ni se contactaron servicios para mutación.
