# Auditoría del Validador RYM v18

Rama exclusiva: `sandbox/validator-tablet-app`. HEAD inicial remoto verificado: `de63de94c83a87cd182e4ea1a58ef4d866d9e158` (v17, workflow #88). Main remoto: `ff215232070cacecc70fe38cde4bf659564383dd`. No se modifican datos, Edge Functions, permisos ni producción.

## Hallazgos comprobados

- El alias y la URL inmutable v17 entregaban los mismos hashes de shell, CSS, adapter y SW. No existía divergencia del alias en esa lectura.
- La entrada `/?app=validador-unidad` devolvía **307 → /unit-validator**. El encabezado `x-portal-build` y `no-store` existían en el 307, pero desaparecían del 200 final. `wrangler.jsonc` ejecutaba el Worker solo para `/`; la URL canónica y los recursos estáticos lo evitaban.
- El workflow anterior verificaba texto común y buscaba encabezados acumulados por `curl -L -D`; podía aceptar el encabezado del 307. No comparaba versión ni bytes de los recursos del alias con el commit probado.
- La shell v17 no actualizaba una pantalla ya abierta al cambiar el controller/build. El SW podía activar incluso después de fallar el precache porque descartaba ese error. Las ventanas conservaban el JavaScript ya ejecutado hasta navegar.
- La nota de criticidad GPS tenía `display:none!important`. Agregar una clase de nivel sin un indicador visible no mostraba la mejora solicitada.
- La comparación VIN utilizaba chasis como sustituto, creando diferencias artificiales. Los pendientes de Revisados compartían la clase roja de vencidos. El parser de saldo ENA contenía una clase de caracteres con doble escape que eliminaba dígitos válidos.

## Fuentes oficiales consultadas en lectura

Proyecto Supabase `avczyvcpmicpuhdkmxzx`:

- `gps-rym-admin` **v13**: usa los indicadores de instalación/reporte, con reporte evaluado en servidor (24 horas). Cero GPS o cero reportando: CRITICO; dos instalados con uno reportando: ALERTA; uno instalado/reportando o ambos reportando: OK. Las unidades cerradas/canibalizadas son históricas.
- `gps-rym-validator` **v2**: mismo umbral de reporte; clasifica como ALERTA el caso solo GPS 2 instalado/reportando, mientras el módulo oficial devuelve OK. El adapter corrige únicamente la presentación con las mismas reglas oficiales, reutilizando `installed`/`ok` del servidor; no calcula horas ni realiza una segunda consulta GPS.
- Los fragmentos exactos de ambas clasificaciones están en `qa/fixtures/validator-gps-official.json`. El contrato ejecuta el fragmento oficial y compara nueve combinaciones válidas, incluyendo la discrepancia concreta del endpoint Validator.
- `revisados-ficha` **v4** devuelve `revisados_operacion_estado`, ficha oficial y logística. `revisados-final` devuelve `meses_atraso`, estado operativo, año requerido, cobertura y pendientes específicos de color/taller. PENDIENTE sin atraso confirmado no se convierte en VENCIDO. El estado VENCIDO persistido o el atraso confirmado permiten mostrar vencimiento, con el mes asignado en Control/unidad.
- Ambos endpoints permiten roles OPERATIVO y SUPERVISORA con permiso de Validador. Las pruebas de esos perfiles ejercitan el gate frontend y el bridge del Worker; no impersonan usuarios ni modifican permisos.

## Correcciones

- Build v18 coherente en shell, Worker, CSS/JS, módulo de presentación y cache SW. El contrato impide reutilizar el número de build cuando cambian recursos de presentación respecto al commit padre.
- Entradas canónicas y recursos del Validador pasan por el Worker: respuesta final 200 con build y no-store. El Worker obtiene el asset canónico sin redirección.
- El precache nuevo usa recarga de red, falla sin activar si está incompleto y elimina únicamente caches estáticos antiguos del Validador. Una activación que reemplaza v17 navega sus ventanas exteriores sin esperar esa navegación dentro de activate (evita deadlock); no navega el portal general ni el iframe.
- La shell verifica el build al recuperar visibilidad/conexión, cambiar de controller y cada minuto; actualiza sin borrar almacenamiento de sesión. El test real de navegador conserva localStorage/sessionStorage durante v17 → v18.
- Revisados: vigente verde, vencido rojo con mes asignado y fecha oficial conservada, pendiente sin confirmación en ámbar. GPS: indicador visible NORMAL/ALERTA/CRÍTICO/SIN INFORMACIÓN, dos equipos independientes y último reporte; diagnóstico expandido y nivel original disponibles.
- Control: secciones RYM y ECARCHECK separadas; coincidencias verdes, diferencias naranjas y ausencias neutrales. VIN y chasis se comparan por sus propios campos. Identificadores largos envuelven sin overflow. Ausencia de ficha tiene mensaje explícito.
- Panapass: parser numérico corregido; se conserva consulta única, detalle ENA/TAG y actualización incremental.

## Verificación reproducible

```
node qa/validator-presentation-contract.mjs
node qa/validator-tablet-contract.mjs
node qa/validator-tablet-responsive.mjs
node qa/validator-tablet-cache-update.mjs
node qa/validator-tablet-deployed.mjs URL_INMUTABLE URL_ALIAS
```

El QA responsive contiene 26 escenarios × 8 viewports: 208 casos, incluidos vencido/pendiente/vigente, GPS normal/alerta/crítico/sin información, comparación igual/diferente/sin ficha, VIN largo, perfiles autorizados, teclado, apertura/cierre, mutaciones continuas y consultas únicas. El test negativo del QA desplegado rechaza el preview v17 real por su 307, demostrando que la nueva comprobación detecta el fallo anterior.

GitHub Actions repite los contratos, responsive y actualización PWA antes de subir una versión aislada. Después exige hashes SHA-256 de siete recursos del commit probado tanto en URL inmutable como en alias, build en respuestas finales y bridge GPS vigente. La evidencia se guarda en los artefactos `validator-responsive-evidence` y `validator-served-resources`.

## Límites reales

Las respuestas autenticadas de Playwright son fixtures con el esquema real, y el contrato GPS se contrasta con el código desplegado leído de Supabase. No se prueba una sesión real de cada perfil ni se mide latencia ENA/GPS real. Las reglas backend futuras deben volver a contrastarse con los fragmentos auditados. Las actualizaciones requieren red; no se promete operación autenticada offline.
