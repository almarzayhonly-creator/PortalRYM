# Plan de arquitectura y diseño del Portal RYM

Fecha: 17 de octubre de 2026. Estado: propuesta basada en revisión focalizada, con primera entrega local del piloto Panapass.

## Decisión

Conservar main como referencia funcional y migrar la presentación a Vue por módulos. Una sola línea de integración, un sandbox de aceptación y un sistema visual compartido. Los cambios visuales deben modificar componentes y estilos, conservando contratos, permisos y operaciones existentes.

No se promete riesgo cero. Cada módulo se incorpora con comparación contra main, pruebas focalizadas y reversión independiente.

## Hallazgos y límites

| Estado | Hallazgo | Consecuencia |
| --- | --- | --- |
| VERIFICADO | GitHub devuelve 33 ramas; localmente hay dos ramas y un worktree. | El desorden principal está en las líneas de desarrollo y previews, no en múltiples checkouts locales. No se inventariaron todos los Workers de la cuenta. |
| VERIFICADO | Rama actual `sandbox/portal-vue-next`, HEAD `2248eb8`; referencia local `origin/main` en `c836b12`; main local está un commit detrás. | La rama actual parte del main conocido y contiene un piloto Inicio/Vue, además de cambios locales de Panapass pendientes de commit. No cambiar de rama sobre ese trabajo. |
| VERIFICADO | El sandbox indicado muestra `280e8f6`, correspondiente al avance anterior de Panapass/Revisados. | La URL compartida y el trabajo local no representan el mismo candidato. |
| VERIFICADO | Main y el código del sandbox Panapass apuntan al proyecto Supabase Panapass. Los proyectos `rym-dev` y `rym-dev-east` aparecen inactivos. | Aislar una URL de Cloudflare no aísla los datos. No probar escrituras sobre ese sandbox como si fuera desechable. |
| VERIFICADO | `deploy-main-production.yml` recompone index, hace commit automático y push a main. El historial contiene commits repetidos de persistencia. | El despliegue altera el código fuente y aumenta el ruido del historial. |
| VERIFICADO | `worker.js` elimina e inyecta scripts y sustituye fragmentos del HTML. | Parte del comportamiento efectivo se define al servir la página y no solo en los componentes. |
| VERIFICADO | El index local ocupa 1.606.195 bytes. Vue Next se inicia desde el HTML del portal; el piloto ahora separa los módulos por uso. | Mantener el shell mientras se extraen bloques acotados; reducir el HTML solo después de validar paridad. |
| VERIFICADO | Antes del cambio, el piloto compilaba 147,57 kB de JavaScript y 35,62 kB de CSS. Ahora Inicio carga 129,58 kB y 15,90 kB; Panapass se descarga al abrirlo (19,52 kB JS y 19,91 kB CSS). | La visita a Inicio baja 18 kB de JS y 19,72 kB de CSS; Panapass conserva sus estilos en una hoja aparte. |
| VERIFICADO | El dashboard legado espera tres respuestas con `Promise.allSettled`; el arranque espera `panapass_meta` junto con permisos. | Hay barreras de carga concretas que conviene medir antes de optimizar. Debe verificarse qué renderer está activo en cada flujo. |
| VERIFICADO | Revisados antiguo incluye vistas, servicio y operaciones; `RevisadosView.vue` supera 2.000 líneas y `OperationsView.vue` supera 1.000. | Copiar toda la rama trasladaría otro monolito. Su diferencia acumulada con main abarca 684 archivos. Recuperar componentes puntuales. |
| PROBABLE | Tamaño del HTML, renderizados repetidos y esperas de datos contribuyen a lentitud y saltos. | Falta una medición autenticada para atribuir y cuantificar cada causa. |

Se leyeron archivos de arranque, despliegue, puente Vue y referencias de Revisados; no fue una auditoría exhaustiva del repositorio o de seguridad de la base. Producción y sandbox respondieron con la pantalla de acceso: no había una sesión autenticada en el navegador utilizado. No se comprobaron visualmente los tabs internos ni las operaciones reales. La consulta remota por Git falló por credenciales; el conector GitHub sí permitió verificar las ramas y el workflow remoto. Los SHA comparados son referencias locales, salvo la identidad visible del sandbox.

### Alcance de HTML y Stitch

El HTML de 1,6 MB sí está contemplado como un problema de mantenimiento y un candidato a mejorar carga. No conviene reconstruirlo de una vez: mezcla autenticación, navegación, lógica existente y código incorporado por el Worker. El plan es dejarlo temporalmente como shell/compatibilidad, mover funciones pequeñas junto con sus contratos a módulos, y retirar cada bloque del HTML solo después de comprobar la misma salida, permisos y acciones. Los cambios visuales habituales luego viven en una vista Vue o sus tokens, en archivos cortos separados del shell. La bajada real de los 1,6 MB se medirá como transferencia comprimida; el tamaño del archivo por sí solo no predice el tiempo de red.

Stitch aún no se ha ejecutado desde esta rama. Encontré en `origin/sandbox/panapass-v2` herramientas que sincronizan el catálogo completo y workflows que auto-commitean los resultados. Para evitar commits y ruido, añadí aquí un workflow manual que exporta solamente el proyecto indicado (`STITCH_PROJECT_ID`) a un artefacto privado de revisión con siete días de retención; el SDK está fijado en `tools/stitch/package-lock.json`. Usa `STITCH_API_KEY` como Actions secret y `STITCH_PROJECT_ID` como Actions variable. No publica ni hace push. La primera ejecución depende de que esos dos valores estén configurados en GitHub; la conversión de referencias a Vue y su aceptación visual siguen dentro de la revisión de código.

## Responsabilidad de cada herramienta

| Herramienta | Responsabilidad propuesta |
| --- | --- |
| Stitch | Referencias visuales, variantes y estados de pantallas, usando datos ficticios. Su salida se adapta a componentes Vue; no define permisos, consultas ni cálculos. |
| Vue + TypeScript + Vite | Componentes, navegación, estado de pantalla y compilación. Un componente es dueño de cada región del DOM. |
| Servicios y adaptador legado | Una interfaz tipada por módulo para reutilizar sesión, lecturas y acciones de main. Sin segunda sesión ni consultas duplicadas para alimentar dos renderers. |
| Supabase | Datos, autorización y funciones existentes. Durante la migración visual se conservan contratos y reglas; las futuras migraciones se versionan aparte. |
| GitHub | Fuente de verdad, revisión y pruebas; cada entrega identifica su commit. |
| Cloudflare | Publicar el artefacto probado, servir estáticos y ejecutar el Worker necesario. La transformación actual del HTML se retira gradualmente tras demostrar equivalencia. |

Flujo: **Stitch → componentes Vue → PR y pruebas en GitHub → sandbox Cloudflare → aceptación → main y producción**. Vue accede a los servicios existentes mediante el adaptador; Supabase aplica la autorización.

## Organización mínima

- Mantener `main` para producción y `sandbox/portal-vue-next` como integración temporal de esta migración. No crear otro sandbox para cada pantalla.
- Trabajar un bloque a la vez; usar una rama corta `codex/<cambio>` solo cuando aporte aislamiento. Cerrar su PR con squash cuando esté validado; conservar el historial existente sin reescribirlo.
- Un alias estable de sandbox y una URL inmutable por candidato, con commit visible. Cada aceptación se refiere al commit exacto.
- Registrar las ramas antiguas como referencia, recuperación pendiente o integradas. No eliminarlas hasta comparar avances y conservar sus SHA. Tener commits históricos no es un defecto de rendimiento del portal.
- Separar Cloudflare de pruebas y producción en configuración y secretos. Para operaciones, utilizar Supabase de pruebas con esquema compatible y datos ficticios; evaluar reutilizar un proyecto inactivo antes de crear otro. Para UI pura, fixtures locales.
- Una preview contra datos reales se considera conectada a producción. Si se necesita lectura real, la restricción debe hacerse efectiva en backend; ocultar botones o bloquear todo POST no basta, porque existen lecturas por RPC/POST.

## Límites de módulos

Conservar `vue-next` como raíz durante el piloto. Crear carpetas únicamente cuando se extraiga el módulo correspondiente:

```text
vue-next/src/
  app/                     shell, rutas y montaje
  design-system/           tokens y componentes compartidos
  services/                sesión, transporte y adaptador legado
  modules/home/            Inicio
  modules/panapass/        dashboard, estado y componentes
  modules/revisados/       dashboard, filtros, tabla y operaciones
```

Las vistas reciben datos tipados y emiten acciones. Los servicios conservan endpoints, parámetros, permisos, cálculos y semántica de errores de main. La UI no redefine estados de negocio. Cada ruta cancela o descarta respuestas obsoletas y desmonta observadores y eventos al salir. Incorporar carga diferida por módulo; no cargar toda la aplicación Vue al abrir Inicio.

El puente global actual es transitorio. No permitir que Vue y un parche legado modifiquen simultáneamente el mismo contenido. La autorización efectiva permanece en Supabase/Edge Functions, además de los controles visuales.

## Sistema visual y navegación

- Definir tokens comunes de color, tipografía, espaciado, radios, sombras, estados y capas; trasladar las referencias Stitch a esos tokens.
- Reutilizar botones, tarjetas KPI, tablas, filtros, modales y estados de carga, vacío, error y datos anteriores. CSS encapsulado por componente; limitar excepciones globales al shell y tokens.
- Un solo desplazamiento vertical principal. Tablas anchas con desplazamiento horizontal dentro de su contenedor; menús y tabs utilizables a 390, 820 y 1440 px, sin desbordamiento de página.
- Definir por ruta qué filtros, tab y posición se conservan al volver. Las actualizaciones de KPI no reconstruyen el menú ni cambian el tab activo.
- Navegación con teclado, foco visible, contraste legible y acciones críticas claramente identificadas. Las etiquetas y estados de negocio se conservan.

## Secuencia y condiciones de salida

| Paso | Trabajo limitado | Condición para continuar |
| --- | --- | --- |
| 1. Consolidar | Preservar cambios locales; verificar main remoto; inventariar qué vista/avance vive en cada una de las tres ramas relevantes. Crear matriz main/sandbox/piloto por endpoint, permiso y acción. | Un candidato y una lista de recuperación; ninguna operación nueva se presume equivalente. |
| 2. Hacer reproducible el despliegue | Compilar a un directorio de publicación explícito, usar lockfiles y herramientas fijadas; eliminar commits automáticos del build. Mantener las transformaciones necesarias como pasos identificados hasta retirarlas. | Mismo commit produce el mismo contenido publicado; probar identidad y recursos servidos. Preview solo publica archivos previstos. |
| 3. Fijar diseño y shell | Extraer tokens y componentes necesarios para Inicio/Panapass; estabilizar navegación, foco y scroll. | Capturas en tres anchos y navegación de ida/vuelta sin pérdida indebida de estado. |
| 4. Terminar dashboard Panapass | Completar el piloto local sobre servicios actuales; extraer componentes y cargarlo bajo demanda. | Mismos KPI, formato, ámbito, endpoints y permisos que main; probar lento, vacío, error, reintento y salida durante carga. |
| 5. Recuperar todo Revisados | Migrar por entregas: shell/dashboard, tabla/filtros y cada tab autorizado; después ficha y operaciones. Revisar incidencias, eCarCheck, boletas y correo individualmente. | Matriz de todos los tabs completa por rol; contratos de operaciones comprobados con datos de prueba. No disparar correos reales. |
| 6. Promover y retirar legado | PR pequeño por entrega; aceptar candidato exacto y publicar. Retirar únicamente el renderer sustituido y sus parches después de verificarlo. | Smoke posterior, reversión conocida y ausencia de regresión en Inicio, Control, GPS y Validador. |

Antes de activar protección de main, adaptar el workflow que hoy hace push directo; luego exigir PR y comprobaciones. Para producción, aprobación de la entrega concreta. La reversión debe recuperar el artefacto previo o la vista anterior mediante un flag por módulo validado; no depender de deshacer migraciones de datos.

## Pruebas y velocidad

Para cada cambio visual: compilación/tipos, prueba del componente o flujo afectado, comparación visual en tres anchos y smoke corto de navegación vecina. Reutilizar `qa/home-executive.mjs` y `qa/project-loading.js`; no ejecutar toda la batería por un ajuste de CSS.

En cambios de navegación/servicios, comparar también permisos, cifras, fecha/zona horaria, endpoints y cuerpos de solicitud. Probar doble clic, retorno, respuesta tardía, error y recuperación. Las pruebas con fixtures no certifican operaciones reales.

Medir por separado: descarga y parseo del HTML/JS, primera interacción, tiempo del servicio y renderizado. Establecer una línea base autenticada antes de optimizar. Metas propuestas, aún no resultados: respuesta visual al cambio de tab en menos de 100 ms; sin nuevas consultas duplicadas; sin aumentar más de 10 % el p95 de carga del módulo bajo condiciones equivalentes. Ajustar metas con mediciones reales y un número suficiente de muestras.

## Documentación oficial consultada

- [Vue: medición, carga diferida y rendimiento](https://vuejs.org/guide/best-practices/performance.html).
- [Cloudflare: integración Git y builds](https://developers.cloudflare.com/workers/ci-cd/builds/git-integration/).
- [Supabase: separación de entornos](https://supabase.com/docs/guides/deployment/managing-environments).
- [GitHub: protección de ramas](https://docs.github.com/en/repositories/configuring-branches-and-merges-in-your-repository/managing-protected-branches/about-protected-branches).
- [Google: Stitch para diseño de interfaces](https://developers.googleblog.com/stitch-a-new-way-to-design-uis/).

## Verificación de esta revisión

[VERIFICADO] `npm run build` compila TypeScript/Vue y emite el bundle principal, el módulo Panapass y su CSS por separado. Revisé ambas vistas en el preview local con datos ficticios; las etiquetas de los KPI conservan su espacio junto a los iconos. No se probaron consultas autenticadas ni se publicó a Cloudflare. Las seis regresiones de navegación anotadas arriba se ejecutaron durante la auditoría previa a estos cambios y no certifican esta última entrega.

Primer avance local: Panapass carga su componente y CSS al entrar, reutiliza la lectura existente de MAIN y presenta los KPI sin superponer las etiquetas con sus iconos.

Pendiente: revisar paridad con sesión autenticada; consolidar los avances de las ramas y hacer reproducible la publicación; adaptar el flujo Stitch a la rama Vue después de disponer de sus variables de GitHub; luego recuperar Revisados en módulos. No desplegar la vista en el alias compartido hasta aislar sus datos de producción.
