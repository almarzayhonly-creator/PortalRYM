# Rendimiento concurrente del Validador RYM

Auditoría del 9 de octubre de 2026. Rama: sandbox/validator-tablet-app.
El frontend continúa en v20. No se modificaron main, producción, reglas de negocio,
Supabase ni las consultas reales a ENA.

## Observaciones reales

Lectura de registros de las últimas 24 horas: tráfico total por función, no una
prueba de carga ni exclusivamente tráfico del validador.

| Servicio | Solicitudes | Errores HTTP | P50 ms | P95 ms | Máximo ms |
|---|---:|---:|---:|---:|---:|
| ena-consulta-saldo | 897 | 1 | 1893 | 5839 | 47241 |
| revisados-final | 265 | 17 | 2793 | 12467 | 25718 |
| gps-rym-validator | 105 | 0 | 1058 | 2010 | 9012 |
| revisados-ficha | 73 | 1 | 801 | 1631 | 15292 |

- **VERIFICADO:** ENA ya dispone de caché de dos minutos y bloqueo por cuenta.
  Sus índices principales existen. Las 799 consultas registradas al proveedor
  tienen P95 de 4079 ms, con 773 éxitos y 26 fallos. Esta población es distinta de
  las solicitudes HTTP; una respuesta HTTP 200 puede contener un resultado fallido.
- **VERIFICADO:** GPS descarga ambos feeds completos de la flota en cada petición,
  después de autorizar al usuario y comprobar la unidad visible. Sin coordinación
  global, 50 solicitudes generan hasta 100 descargas.
- **VERIFICADO:** revisados-final calcula todas las unidades visibles y múltiples
  conjuntos de datos; no procesa un filtro de unidad del cuerpo de la petición.
  Usarlo para una sola tarjeta multiplica trabajo innecesario. Tiene el mayor P95 observado.
- **VERIFICADO:** revisados-ficha lee la ficha oficial guardada; no consulta
  externamente eCarCheck. La tabla oficial tiene índice por unidad, pero no el
  índice compuesto placa/actualizado_at utilizado por la lectura alternativa.
  **PROBABLE:** ese índice podría ayudar; comprobar EXPLAIN antes de proponer DDL.
- **VERIFICADO:** las funciones y la base de datos ya usan us-east-1.
  Cambiar región no es una solución respaldada por esta evidencia.

## Prueba controlada

Ejecutar desde la raíz del checkout:

```sh
node qa/validator-gps-proposal-contract.mjs
node qa/validator-tablet-concurrency.mjs
npx --yes wrangler@4.149.0 deploy --dry-run --config qa/proposals/wrangler.gps.jsonc --outdir .sandbox/gps-proposal-build
```

340 validaciones HTTP: 10, 25 y 50 usuarios, misma unidad y unidades diferentes,
comparando sin coordinación y con coordinación. Además, 20 validaciones reales
del frontend en navegador: dos grupos de 10 contextos aislados.
Los proveedores son simulados exclusivamente en localhost: feeds de 120 ms,
cuatro llamadas paralelas por feed, ENA de 150 ms, Revisados de 100 ms y ficha
de 40 ms. Se sincroniza explícitamente la llegada a GPS; un grupo incompleto falla.
Los tiempos simulados no predicen capacidad ni latencia en producción.
La propuesta también se compiló con Wrangler 4.149.0 en modo dry-run, sin despliegue.

**VERIFICADO:** cada grupo coordinado hace dos descargas GPS en lugar de 20,
50 o 100. Se comprueban recuperación tras fallo, contenido sin transformación,
ausencia de caché tras completar la descarga, rechazo de solicitudes sin secreto,
rutas permitidas, separación de sesiones y ausencia de consultas duplicadas en
el frontend. Los permisos del harness son simulados; no sustituyen una prueba
de JWT/RLS en el servicio real.

ENA conserva una consulta por cuenta: una para la misma unidad y 10/25/50 para
cuentas distintas. Bajo ese límite simulado, ENA sigue dominando la duración al
consultar unidades distintas. Agrupar GPS reduce descargas, pero no elimina
latencia del proveedor ENA.

Resultados detallados: .sandbox/validator-load/results.json; CI publica el artefacto.

## Propuesta concreta, sin activar

qa/proposals/gps-feed-worker.mjs y wrangler.gps.jsonc definen un Worker separado
con un Durable Object global que comparte exclusivamente lecturas en curso de
los dos feeds originales. No almacena resultados de usuario ni prolonga la
vigencia de los datos. Requiere GPS_COORDINATOR_SECRET de al menos 32 caracteres,
guardado sólo en secretos de servidor. El feed completo nunca debe enviarse al navegador.
La comprobación del secreto también protege el propio Durable Object.

qa/proposals/gps-rym-validator.patch cambia solamente el transporte de la función
GPS existente, conservando autorización, visibilidad, parseo y clasificación.
Sin ambas variables nuevas mantiene la consulta directa. Una configuración
parcial o una URL inválida falla explícitamente. La propuesta se aplica con
git apply --unidiff-zero tras verificar que el helper de la versión auditada
coincide. GPS_SHARED_FEED_URL debe ser el origen HTTPS del Worker aislado.

**RIESGO:** activar el transporte requiere modificar la función Supabase compartida.
La autorización previa restringió cambios al preview; esta propuesta permanece
sin desplegar ni aplicar. Antes de activarla se requiere autorización específica,
prueba de unidades y permisos reales, seguimiento de P95/errores y posibilidad
de volver a la consulta directa retirando ambas variables. Una coordinación
global añade una dependencia y un salto de red; debe medirse su efecto real.

La siguiente mejora de mayor impacto es un endpoint de Revisados por unidad,
reutilizando exactamente la clasificación y autorización actuales. Debe
compararse contra revisados-final con casos representativos antes de sustituirlo.
No se propone aumentar la vigencia de saldos ni cambiar estados de negocio.

Referencias de implementación:
[Durable Objects](https://developers.cloudflare.com/durable-objects/concepts/what-are-durable-objects/),
[base DurableObject](https://developers.cloudflare.com/durable-objects/api/base/),
[regiones de Supabase](https://supabase.com/docs/guides/functions/regional-invocation).
