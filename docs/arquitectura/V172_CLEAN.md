# Portal RYM V172 Clean

## Objetivo
Construir una base modular real sin overlays de versiones históricas ni funciones duplicadas.

## Rama
- Trabajo: `v172-clean`
- Base: `v171-stable`
- Producción: `main` no se modifica durante esta fase.

## Reglas obligatorias
1. `index.html` queda como shell: login, bootstrap, contenedor principal y configuración mínima.
2. Cada módulo tiene un solo propietario de render, navegación y eventos.
3. No se permiten archivos `fix`, `patch`, `override`, `polish` o inyecciones de V169/V170/V171 en el build V172 clean.
4. No se recuperan archivos de otras ramas durante deploy.
5. CSS vive en `/css/` por módulo.
6. La navegación global vive en `modules/core/router.js` y la sesión en `modules/core/session.js` cuando se extraigan.
7. Panapass, Revisados, Control de Auto, GPS y Usuarios deben abrir desde su módulo sin llamar entrypoints legacy del `index.html` al finalizar la migración.
8. Ranking, Recurrentes, Bajas y ENA quedan bajo `modules/panapass/`.
9. Cada extracción debe conservar primero la lógica y diseño existentes; los cambios funcionales se aplican después.
10. Un módulo no se considera migrado hasta pasar QA de navegación, consola y regresión visual.

## Estado inicial auditado
- `index.html`: 1,460,769 bytes.
- `modules/panapass/index.js` todavía llama `window.v70OpenPanapass()` del legacy.
- `modules/control-auto/index.js` también es un boundary hacia legacy.
- La modularización V171 separó archivos, pero no completó ownership de pantallas.

## Orden de migración
1. Core/router/session.
2. Panapass shell/dashboard.
3. Ranking.
4. Recurrentes.
5. Bajas + ENA.
6. Revisados.
7. Control de Auto + router interno.
8. GPS.
9. Usuarios.
10. Retiro final del código legacy ya migrado desde `index.html`.

## Criterios de aceptación
- Cero recuperación/inyección de archivos históricos durante deploy.
- Cero pantallas con dos renderizadores activos.
- Cero routers duplicados.
- `index.html` disminuye de tamaño en cada fase relevante; no puede crecer con lógica de módulo.
- QA real de login, navegación y sesión.
- Sin errores JS nuevos en consola.
- Sin merge a `main` hasta aprobación manual.
