# Validador de Unidad — rediseño dedicado

## Paridad y alcance

- Referencia main: `ff215232070cacecc70fe38cde4bf659564383dd`.
- Sandbox inicial: `1895547e0121b27614fea027c49da83d2a1cb658`.
- Rama: `sandbox/validator-tablet-app`; checkout: `.worktrees/validator-tablet-app`.
- `index.html` idéntico a main en Git. `bindValidator99`, `searchValidator99`, `openValidator99`, consultas, cálculos y criterios no se editaron.
- Worker mantiene la ruta `/?app=validador-unidad`; el iframe comparte origen, autenticación y backend con el portal.

## Auditoría y Stitch

Se revisaron HTML y PNG de las tres variantes existentes.

1. Variante 1: identidad de unidad dominante y orden de los cuatro sistemas.
2. Variante 2: composición de dos columnas para tablet portrait y menor ruido visual.
3. Variante 3: jerarquía del estado y protagonismo de Otra unidad.

Se descartaron KPIs de conformidad, inspecciones, auditorías, acciones inexistentes, datos de ejemplo, modal oscuro, pills redundantes, texto microscópico y bordes repetidos. Se eliminó `decorateResult`: calculaba un estado independiente del de main. La presentación utiliza directamente `#v117Overall`.

## Implementación

- `unit-validator.html`: shell reducido a encabezado, iframe y referencias a assets.
- `modules/core/unit-validator-shell.js`: instalación y estado de sesión del encabezado; no recibe tokens.
- `modules/control-auto/validator-tablet-app.js`: adaptador de presentación, permiso dedicado y detalles accesibles.
- `css/validator-tablet-app.css`: una sola hoja organizada en base, tablet, mobile, small mobile y landscape mobile. Overrides acotados a la ruta dedicada porque los estilos heredados de main contienen `!important`.
- `worker.js`: aislamiento de la ruta host antes del primer render; sin cambios a consultas.
- `modules/core/unit-validator-launcher.js`: elimina ambos accesos al perder el permiso.
- `validator-tablet.webmanifest`: Validador RYM, standalone e iconos reales locales.
- `validator-tablet-sw.js`: caché limitada a shell y assets enumerados; nunca auth, APIs ni datos operativos.
- `assets/rym-logo.png`, `assets/rym-validator-192.png`, `assets/rym-validator-512.png`: logo real del portal y tamaños instalables.
- `.assetsignore`: excluye pruebas, evidencia local y dependencias de los assets publicados.
- `.github/workflows/validator-tablet-preview.yml`: comprueba paridad con main, ejecuta pruebas y conserva capturas antes de subir una versión preview.
- `qa/validator-tablet-responsive.mjs`, `qa/validator-tablet-contract.mjs`: pruebas de interfaz, contratos, permisos y PWA.

## Responsive

- Teléfono: pantalla completa; unidad y estado fuertes, cuatro filas compactas, detalle secundario desplegable y acción inferior de 52 px. Autocomplete no tapa Validar.
- Tablet portrait: cuadrícula 2 × 2 con detalles abiertos.
- Tablet landscape de 1024 px o más: cuatro columnas con detalles abiertos.
- Unidades cerradas conservan el aviso histórico completo; pueden necesitar scroll en un teléfono pequeño. La acción principal permanece visible.

## Evidencia y límites

[VERIFICADO] 96 combinaciones: 360×800, 390×844, 412×915, 768×1024, 800×1280, 1024×768, 1280×800 y 1440×900, cada una con TODO OK, Panapass negativo, sin Panapass, Revisado pendiente/bloqueado, GPS alerta/sin GPS, unidad parada/cerrada, ENA sin respuesta, no encontrado y sin permiso.

Las pruebas ejecutan las funciones originales y la limpieza visual de main, con respuestas deterministas de prueba. No son consultas reales a ENA/GPS. Se verificaron autocomplete, selección, Enter, Validar, cierre, Otra unidad, foco, logout, ausencia de otros módulos, tipografía, anchura y ubicación del botón. Las respuestas QA existen únicamente en el servidor de pruebas y sus archivos no se publican como assets.

[VERIFICADO] Login real de main en navegador sin credenciales, instalación del service worker, iconos PNG, manifest y ausencia de caché de información dinámica. La instalación desde el menú de un dispositivo físico no se probó.

[VERIFICADO] Fuente main sin cambios; ruta normal sin clases de aislamiento de la app.

[RIESGO] En main, el caso probado de Revisado emitido/vigente y bloqueado conserva `ACTIVA · TODO OK`: `state117.revisado` depende de vigencia. La variable `revisadoTone` contempla bloqueo pero no se usa en la tarjeta original. Se preserva exactamente esa conducta; corregirla requiere autorización para cambiar lógica.

[PROBABLE] Integración autenticada con datos reales: endpoints y lógica conservados, pendiente de prueba con una sesión autorizada. No se concedieron permisos ni se modificó producción.

Capturas y resultados locales: `.sandbox/validator-qa/`. El workflow adjunta la misma evidencia como artifact.
