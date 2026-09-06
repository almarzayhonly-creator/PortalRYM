# UI Architecture V2

## Fase actual: Transitional modular architecture

PortalRYM conserva el HTML y la funcionalidad legacy en `index.html`. Los CSS de arquitectura se cargan desde el `<head>` en orden determinista; `modules/v171-loader.js` carga únicamente módulos JavaScript. Esta etapa no representa aislamiento completo ni reemplaza vistas, llamadas, roles o reglas de negocio.

## Problemas encontrados

- El portal contiene estilos históricos globales e inline en `index.html`.
- Los estilos V171 ya estaban en archivos separados, pero convivían como una lista plana en `css/`.
- El CSS global legacy no se puede eliminar con seguridad sin una validación visual por vista autenticada.
- Se detectaron bloques de CSS inyectado en módulos históricos de `modules/core/`; el contrato los deja registrados como deuda de migración y prohíbe introducir nuevos casos.

## Arquitectura nueva

```
css/core/          tokens y contratos compartidos
css/panapass/      entrada y vistas de Panapass
css/gps/           GPS
css/revisados/     Revisados
css/control-auto/  Control Auto
css/usuarios/      Usuarios
```

Los archivos `base.css` son **compatibility bridges**: conservan la apariencia actual importando el stylesheet V171 existente. No constituyen aislamiento completo. Después de aprobar el baseline visual se migrarán selector por selector a su archivo propietario. Las nuevas reglas deben escribirse en el archivo dueño de la vista, no en la compatibilidad legacy ni en `index.html`.

| Entrada | Bridge legacy pendiente |
| --- | --- |
| `panapass/base.css` | `css/panapass.css` y sus selectores `.v171-*` de ranking/recurrentes. |
| `panapass/bajas.css` | `css/panapass-bajas.css` y sus selectores `.v171-bajas*`. |
| `revisados/base.css` | `css/revisados.css`. |
| `control-auto/base.css` | `css/control-auto.css`. |
| `gps/base.css` | `css/gps.css`. |
| `usuarios/base.css` | `css/usuarios.css`. |

## Namespaces y ownership

- `body[data-rym-module="panapass"]` — Panapass.
- `body[data-rym-module="gps"]` — GPS.
- `body[data-rym-module="revisados"]` — Revisados.
- `body[data-rym-module="control-auto"]` — Control Auto.
- `body[data-rym-module="usuarios"]` — Usuarios.
- `.rym-*` — componente compartido; usar solo cuando sea realmente transversal.

Cada módulo establece su namespace al abrirse mediante `RYM_MODULES`. Los selectores nuevos deben empezar por ese `body[data-rym-module]` o por una raíz propia del módulo.

## Cómo agregar estilos

1. Elige el dominio y la vista propietaria.
2. Añade el selector bajo su namespace o raíz `.rym-<dominio>`.
3. Usa tokens de `core/tokens.css`; no repitas colores, radios o sombras.
4. Ejecuta `node qa/ui-isolation-contract.mjs` y los QA afectados.

## No hacer

- No añadir `patch`, `hotfix`, `final2` o `proposal` CSS.
- No poner estilos de dominio en `core/`.
- No introducir selectores globales como `table`, `.card` o `button` en un módulo.
- No insertar CSS estático desde JavaScript nuevo.
- No eliminar CSS legacy inline sin prueba visual de la vista afectada.
