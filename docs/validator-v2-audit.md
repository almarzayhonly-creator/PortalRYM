# Validador General RYM V2 · build v19

Rama exclusiva: `sandbox/validator-tablet-app`. HEAD inicial remoto/local:
`6dfc4398ceae2fdd81819bd37352eebd284d9740` (v18, workflow #89 SUCCESS).
Referencia main: `ff215232070cacecc70fe38cde4bf659564383dd`.

## Hallazgos y cambios de presentación

- Panapass repetía número/cuenta, saldo, consulta y referencia del encabezado.
  Ahora conserva datos únicos y agrupa metadatos por TAG y administración ENA.
  El acceso ENA interno se etiqueta expresamente; PENDIENTE no cambia VERIFICADO.
- Revisados repetía estado, fecha y situación. El resumen autoritativo y mes asignado
  siguen intactos; el detalle conserva año, REV ID, emisor, tipo, emitido y bloqueado.
- GPS repetía tres clasificaciones y estados/fechas por dispositivo. Ahora existe
  una evaluación general y un grupo de datos específicos, incluidos diagnósticos distintos.
  Los dos indicadores, fechas, criticidad oficial y estados de instalación siguen intactos.
- Control repetía datos del encabezado y ocho comparaciones extensas. Ahora separa
  RYM, ficha eCarCheck y comparación; muestra conteos, diferencias y grupos expandibles.
  Los valores técnicos, seguro, restricciones y fuente del revisado siguen accesibles.
- El grid estiraba tarjetas cerradas al expandir otra. Ahora conserva alturas naturales;
  tarjetas abiertas ocupan dos columnas y una columna en móvil. Se conserva el ancho máximo.
- Las mutaciones de main conservan los grupos abiertos y el foco; tocar un valor del
  detalle no cierra la tarjeta. Los controles nativos admiten teclado y objetivos de 44 px.

## Correspondencia de fuentes y límites

Se consultó el esquema de `public.unidades` mediante lectura: contiene `chasis` y `motor`,
sin columna `vin`. La ficha oficial distingue VIN y chasis. El VIN interno ausente permanece
neutral. Si el chasis interno coincide con el VIN oficial se explica esa relación documental;
no se sustituye el dato ni se altera la comparación chasis/chasis.

Se revisaron las fuentes vigentes GPS Admin v13, GPS Validator v2 y revisados-ficha v4.
No se modifican fuentes, permisos, RLS, consultas de backend, umbrales ni reglas de negocio.
`validator-presentation.js`, funciones compartidas e `index.html` permanecen sin cambios.

## Arquitectura, caché y verificación

`validator-details.js` contiene únicamente renderizado de grupos y comparaciones, con
escape de valores y uso de la normalización existente. Worker inyecta el módulo antes
del adapter solo en el host dedicado. Shell, Worker y SW usan v19; el recurso participa
en precache y `run_worker_first`, con cabeceras de build/no-store y hash servido verificado.

Se conserva el enriquecimiento inmediato por unidad, token de fetch, lecturas paralelas,
reutilización de búsqueda y filtro de mutaciones internas. No se añade una consulta.

QA conserva los 26 escenarios de v18 y añade cinco: ENA PENDIENTE con VERIFICADO,
deduplicación Panapass, siete campos comparables coincidentes con VIN ausente,
coincidencia documental chasis/VIN y fallas GPS distintas. Son 31 escenarios en nueve
resoluciones: 360×800, 390×844, 412×915, 768×1024, 800×1280, 1024×768, 1280×800,
1440×900 y 1920×1080. Incluye orientación vertical/horizontal, tarjetas cerradas y abiertas,
VIN largo, permisos operativos y ausencia de overflow/consultas duplicadas.

El caso progresivo reemplaza tarjetas y genera mutaciones durante 1.6 segundos; exige
enriquecimiento mientras siguen activas, dos paneles GPS y estabilidad posterior. Después
actualiza un dato interno para exigir que una reconstrucción del detalle conserve grupos abiertos.
El contrato del renderer también verifica ocho coincidencias compactas, procedencia y escape HTML.

Evidencia reproducible: scripts `qa/validator-tablet-responsive.mjs`,
`qa/validator-presentation-contract.mjs`, `qa/validator-tablet-contract.mjs`,
`qa/validator-tablet-cache-update.mjs` y `qa/validator-tablet-deployed.mjs`.
Capturas, resultados JSON y hashes se guardan como artefactos del workflow de preview.

La validación autenticada utiliza funciones reales de main con respuestas controladas;
la URL remota se verifica sin credenciales mediante login real, SW, recursos y hashes.
No se afirma haber validado una unidad real autenticada en producción.
